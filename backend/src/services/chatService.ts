import mongoose from "mongoose";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { Contact } from "../models/Contact";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { AppError } from "../middleware/errorHandler";
import { sendTextMessage } from "./whatsappApiService";
import { getDecryptedToken } from "../utils/crypto";
import type { ConversationPriority } from "../models/Conversation";

export async function getConversations(tenantId: string, query: {
  page?: number;
  limit?: number;
  waAccountId?: string;
  status?: string;
  unreadOnly?: boolean;
  priority?: string;
  assignedAgentId?: string;
}) {
  const page = query.page || 1;
  const limit = query.limit || 30;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { tenantId };
  if (query.waAccountId) filter.waAccountId = query.waAccountId;
  if (query.status) filter.status = query.status;
  if (query.unreadOnly) filter.unreadCount = { $gt: 0 };
  if (query.priority) filter.priority = query.priority;
  if (query.assignedAgentId) filter.assignedAgentId = query.assignedAgentId;

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ priorityWeight: -1, lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("contactId", "name phone tags")
      .populate("waAccountId", "name phoneNumber")
      .populate("assignedAgentId", "name email"),
    Conversation.countDocuments(filter),
  ]);

  return { conversations, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getConversationMessages(tenantId: string, conversationId: string, query: {
  page?: number;
  limit?: number;
}) {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) throw new AppError("Conversation not found", 404);

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversationId }),
  ]);

  return { messages: messages.reverse(), total, page, totalPages: Math.ceil(total / limit) };
}

export async function sendReply(tenantId: string, conversationId: string, text: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId })
    .populate("contactId")
    .populate("waAccountId");
  if (!conversation) throw new AppError("Conversation not found", 404);

  const contact = await Contact.findById(conversation.contactId);
  if (!contact) throw new AppError("Contact not found", 404);

  const account = await WhatsAppAccount.findById(conversation.waAccountId);
  if (!account) throw new AppError("WhatsApp account not found", 404);

  const result = await sendTextMessage({
    phoneNumberId: account.phoneNumberId,
    accessToken: getDecryptedToken(account),
    to: contact.phone,
    text,
  });

  const message = new Message({
    tenantId,
    conversationId: conversation._id,
    waAccountId: account._id,
    contactId: contact._id,
    direction: "outbound",
    type: "text",
    content: text,
    waMessageId: result.waMessageId || "",
    status: result.success ? "sent" : "failed",
    sentAt: result.success ? new Date() : null,
    errorMessage: result.error || "",
  });

  await message.save();

  const now = new Date();
  conversation.lastMessageAt = now;
  conversation.lastMessagePreview = text.substring(0, 100);

  if (!conversation.sla.firstResponseAt) {
    conversation.sla.firstResponseAt = now;
    conversation.sla.firstResponseTimeMs = now.getTime() - conversation.createdAt.getTime();
  }
  conversation.sla.lastAgentResponseAt = now;

  await conversation.save();

  return message;
}

export async function markConversationRead(tenantId: string, conversationId: string) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { unreadCount: 0 },
    { new: true }
  );
  if (!conversation) throw new AppError("Conversation not found", 404);
  return conversation;
}

export async function assignAgent(tenantId: string, conversationId: string, agentId: string) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { assignedAgentId: agentId },
    { new: true }
  );
  if (!conversation) throw new AppError("Conversation not found", 404);
  return conversation;
}

export async function closeConversation(tenantId: string, conversationId: string) {
  const now = new Date();
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) throw new AppError("Conversation not found", 404);

  conversation.status = "closed";
  conversation.sla.resolvedAt = now;
  conversation.sla.resolutionTimeMs = now.getTime() - conversation.createdAt.getTime();
  await conversation.save();

  return conversation;
}

const PRIORITY_WEIGHTS: Record<ConversationPriority, number> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4,
};

export async function updateConversationPriority(
  tenantId: string,
  conversationId: string,
  priority: ConversationPriority
) {
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, tenantId },
    { priority, priorityWeight: PRIORITY_WEIGHTS[priority] || 2 },
    { new: true }
  );
  if (!conversation) throw new AppError("Conversation not found", 404);
  return conversation;
}

export async function transferConversation(
  tenantId: string,
  conversationId: string,
  newAgentId: string,
  note?: string
) {
  const conversation = await Conversation.findOne({ _id: conversationId, tenantId });
  if (!conversation) throw new AppError("Conversation not found", 404);

  conversation.assignedAgentId = newAgentId as unknown as mongoose.Types.ObjectId;
  if (note) {
    conversation.notes = `${conversation.notes}\n[Transfer] ${note}`.trim();
  }
  await conversation.save();

  return conversation;
}
