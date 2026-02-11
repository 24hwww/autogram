import { prisma } from './prisma';
import { Profile, CreateProfileRequest, UpdateProfileRequest } from '@shared/types';

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

export interface InfluencerProfile {
  id: number;
  name: string;
  personality: string;
  physicalDescription?: string;
  activities?: string;
  tone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimit {
  id: number;
  date: string;
  imagesGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Storage {
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

  async getImages(): Promise<ImageModel[]> {
    const images = await prisma.image.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return images.map(this.mapImageToModel);
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

  async getRecentPublishedImages(limit: number): Promise<ImageModel[]> {
    const images = await prisma.image.findMany({
      where: { status: 'PUBLISHED' as any },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
    return images.map(this.mapImageToModel);
  }

  // Usage limit operations
  async getUsageLimit(date: string): Promise<UsageLimit> {
    let limit = await prisma.usageLimit.findUnique({
      where: { date },
    });

    if (!limit) {
      limit = await prisma.usageLimit.create({
        data: { date, imagesGenerated: 0 },
      });
    }
    return this.mapUsageLimitToModel(limit);
  }

  async incrementUsageCount(date: string): Promise<UsageLimit> {
    const limit = await this.getUsageLimit(date);
    const updated = await prisma.usageLimit.update({
      where: { date },
      data: {
        imagesGenerated: limit.imagesGenerated + 1,
      },
    });
    return this.mapUsageLimitToModel(updated);
  }

  // Influencer profile operations
  async getInfluencerProfile(): Promise<InfluencerProfile | null> {
    const profile = await prisma.influencerProfile.findFirst();
    return profile ? this.mapProfileToModel(profile) : null;
  }

  async createInfluencerProfile(data: Omit<InfluencerProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<InfluencerProfile> {
    const profile = await prisma.influencerProfile.create({
      data: {
        name: data.name,
        personality: data.personality,
        physicalDescription: data.physicalDescription,
        activities: data.activities,
        tone: data.tone,
      },
    });
    return this.mapProfileToModel(profile);
  }

  async updateInfluencerProfile(id: number, data: Partial<Omit<InfluencerProfile, 'id' | 'createdAt' | 'updatedAt'>>): Promise<InfluencerProfile> {
    const profile = await prisma.influencerProfile.update({
      where: { id },
      data: {
        name: data.name,
        personality: data.personality,
        physicalDescription: data.physicalDescription,
        activities: data.activities,
        tone: data.tone,
      },
    });
    return this.mapProfileToModel(profile);
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

  // Mapping methods
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

  private mapUsageLimitToModel(limit: any): UsageLimit {
    return {
      id: limit.id,
      date: limit.date,
      imagesGenerated: limit.imagesGenerated,
      createdAt: limit.createdAt,
      updatedAt: limit.updatedAt,
    };
  }

  private mapProfileToModel(profile: any): InfluencerProfile {
    return {
      id: profile.id,
      name: profile.name,
      personality: profile.personality,
      physicalDescription: profile.physicalDescription || undefined,
      activities: profile.activities || undefined,
      tone: profile.tone,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // ===== MÉTODOS DEL NUEVO MODELO PROFILE =====

  async createProfile(data: CreateProfileRequest): Promise<Profile> {
    console.log("🔍 Storage: Creando perfil en base de datos");
    console.log("🔍 Storage: Datos a guardar:", JSON.stringify(data, null, 2));
    
    try {
      const profile = await prisma.profile.create({
        data: {
          identity: JSON.stringify(data.identity),
          forensicDescription: JSON.stringify(data.forensicDescription),
          psychologicalProfile: JSON.stringify(data.psychologicalProfile),
          isActive: data.isActive || false,
          generationSettings: JSON.stringify(data.generationSettings),
        },
      });
      
      console.log("✅ Storage: Perfil guardado en base de datos:", profile.id);
      const mappedProfile = this.mapNewProfileToModel(profile);
      console.log("🔍 Storage: Perfil mapeado:", JSON.stringify(mappedProfile, null, 2));
      
      return mappedProfile;
    } catch (error) {
      console.error("❌ Storage: Error guardando perfil:", error);
      throw error;
    }
  }

  async getAllProfiles(): Promise<Profile[]> {
    const profiles = await prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return profiles.map(this.mapNewProfileToModel);
  }

  async getProfile(id: number): Promise<Profile | null> {
    const profile = await prisma.profile.findUnique({
      where: { id },
    });
    return profile ? this.mapNewProfileToModel(profile) : null;
  }

  async getActiveProfile(): Promise<Profile | null> {
    const profile = await prisma.profile.findFirst({
      where: { isActive: true },
    });
    return profile ? this.mapNewProfileToModel(profile) : null;
  }

  async updateProfile(id: number, data: UpdateProfileRequest): Promise<Profile> {
    const updateData: any = {};
    
    if (data.identity) updateData.identity = JSON.stringify(data.identity);
    if (data.forensicDescription) updateData.forensicDescription = JSON.stringify(data.forensicDescription);
    if (data.psychologicalProfile) updateData.psychologicalProfile = JSON.stringify(data.psychologicalProfile);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.generationSettings) updateData.generationSettings = JSON.stringify(data.generationSettings);

    const profile = await prisma.profile.update({
      where: { id },
      data: updateData,
    });
    return this.mapNewProfileToModel(profile);
  }

  async deleteProfile(id: number): Promise<void> {
    await prisma.profile.delete({
      where: { id },
    });
  }

  async deactivateAllProfiles(): Promise<void> {
    await prisma.profile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  private mapNewProfileToModel(profile: any): Profile {
    return {
      id: profile.id,
      identity: JSON.parse(profile.identity),
      forensicDescription: JSON.parse(profile.forensicDescription),
      psychologicalProfile: JSON.parse(profile.psychologicalProfile),
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      generationSettings: JSON.parse(profile.generationSettings),
    };
  }
}

// Export singleton instance
export const storage = new Storage();
