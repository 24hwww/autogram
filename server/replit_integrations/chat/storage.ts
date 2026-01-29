import { prisma } from '../../prisma';
import type { InfluencerProfile } from '@shared/types';

export interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  timestamp: Date;
}

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<Message>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });
    return conversation ? {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    } : undefined;
  },

  async getAllConversations() {
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' as any },
    });
    return conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
    }));
  },

  async createConversation(title: string) {
    const conversation = await prisma.conversation.create({
      data: { title },
    });
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
    };
  },

  async deleteConversation(id: number) {
    await prisma.message.deleteMany({
      where: { conversationId: id },
    });
    await prisma.conversation.delete({
      where: { id },
    });
  },

  async getMessagesByConversation(conversationId: number) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' as any },
    });
    return messages.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const message = await prisma.message.create({
      data: { conversationId, role, content },
    });
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    };
  },
};
