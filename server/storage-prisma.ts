import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export type ImageStatus = 'PENDING' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export interface ImageModel {
  id: number;
  prompt: string;
  caption?: string;
  imagePath: string;
  status: ImageStatus;
  scheduledAt?: Date;
  instagramMediaId?: string;
  error?: string;
  createdAt: Date;
  publishedAt?: Date;
  autoSchedule: boolean;
  scheduleInterval?: number;
  isCarousel: boolean;
  imagePaths?: string;
}

export class PrismaStorage {
  // Image operations
  async createImage(data: Omit<ImageModel, 'id' | 'createdAt'>): Promise<ImageModel> {
    const image = await prisma.image.create({
      data: {
        prompt: data.prompt,
        caption: data.caption,
        imagePath: data.imagePath,
        status: data.status as any,
        scheduledAt: data.scheduledAt,
        instagramMediaId: data.instagramMediaId,
        error: data.error,
        publishedAt: data.publishedAt,
        autoSchedule: data.autoSchedule,
        scheduleInterval: data.scheduleInterval,
        isCarousel: data.isCarousel,
        imagePaths: data.imagePaths,
      },
    });
    return this.mapImageToModel(image);
  }

  async getImage(id: number): Promise<ImageModel | null> {
    const image = await prisma.image.findUnique({
      where: { id },
    });
    return image ? this.mapImageToModel(image) : null;
  }

  async getAllImages(): Promise<ImageModel[]> {
    const images = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return images.map(this.mapImageToModel);
  }

  async updateImage(id: number, data: Partial<Omit<ImageModel, 'id' | 'createdAt'>>): Promise<ImageModel> {
    const image = await prisma.image.update({
      where: { id },
      data: {
        prompt: data.prompt,
        caption: data.caption,
        imagePath: data.imagePath,
        status: data.status as any,
        scheduledAt: data.scheduledAt,
        instagramMediaId: data.instagramMediaId,
        error: data.error,
        publishedAt: data.publishedAt,
        autoSchedule: data.autoSchedule,
        scheduleInterval: data.scheduleInterval,
        isCarousel: data.isCarousel,
        imagePaths: data.imagePaths,
      },
    });
    return this.mapImageToModel(image);
  }

  async deleteImage(id: number): Promise<void> {
    await prisma.image.delete({
      where: { id },
    });
  }

  async getScheduledImagesToPublish(): Promise<ImageModel[]> {
    try {
      const now = new Date();
      const images = await prisma.image.findMany({
        where: {
          status: 'SCHEDULED' as any,
          scheduledAt: {
            lte: now,
          },
        },
      });
      return images.map(this.mapImageToModel);
    } catch (error) {
      console.warn("⚠️ Database query failed in getScheduledImagesToPublish:", error);
      return [];
    }
  }

  // Usage limit operations
  async getUsageLimit(date: string): Promise<any> {
    let limit = await prisma.usageLimit.findUnique({
      where: { date },
    });

    if (!limit) {
      limit = await prisma.usageLimit.create({
        data: { date, imagesGenerated: 0 },
      });
    }
    return limit;
  }

  async incrementUsageCount(date: string): Promise<any> {
    return await prisma.usageLimit.upsert({
      where: { date },
      update: {
        imagesGenerated: {
          increment: 1,
        },
      },
      create: {
        date,
        imagesGenerated: 1,
      },
    });
  }

  // Chat operations
  async saveChatMessage(sessionId: string, role: string, content: string): Promise<any> {
    return await prisma.chat.create({
      data: {
        sessionId,
        role,
        content,
      },
    });
  }

  async getChatHistory(sessionId: string): Promise<any[]> {
    return await prisma.chat.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  private mapImageToModel(image: any): ImageModel {
    return {
      id: image.id,
      prompt: image.prompt,
      caption: image.caption || undefined,
      imagePath: image.imagePath,
      status: image.status as ImageStatus,
      scheduledAt: image.scheduledAt || undefined,
      instagramMediaId: image.instagramMediaId || undefined,
      error: image.error || undefined,
      createdAt: image.createdAt,
      publishedAt: image.publishedAt || undefined,
      autoSchedule: image.autoSchedule,
      scheduleInterval: image.scheduleInterval || undefined,
      isCarousel: image.isCarousel,
      imagePaths: image.imagePaths || undefined,
    };
  }
}

// Export singleton instance
export const storage = new PrismaStorage();
