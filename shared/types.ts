// Unified type definitions for AutoGram system
// These types are exported from Prisma-generated types for consistency

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

// Tipos de Influencer (existentes - mantenidos para compatibilidad)
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

// ===== NUEVO MÓDULO PERFIL =====

// Tipos de influencer especializados
export type InfluencerType = 
  | 'lifestyle' 
  | 'fitness' 
  | 'spiritual' 
  | 'tech' 
  | 'fashion' 
  | 'beauty' 
  | 'travel' 
  | 'food' 
  | 'business' 
  | 'art' 
  | 'music' 
  | 'gaming' 
  | 'education' 
  | 'wellness' 
  | 'other';

// Niveles de energía
export type EnergyLevel = 'very_low' | 'low' | 'balanced' | 'high' | 'very_high';

// Estados de humor predominantes
export type MoodState = 
  | 'enthusiastic' 
  | 'calm' 
  | 'melancholic' 
  | 'energetic' 
  | 'thoughtful' 
  | 'playful' 
  | 'serious' 
  | 'mysterious' 
  | 'optimistic' 
  | 'romantic';

// Descripción forense corporal detallada
export interface ForensicDescription {
  // Tono de piel
  skinTone: {
    base: 'very_fair' | 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'brown' | 'dark_brown' | 'very_dark';
    undertone: 'cool' | 'warm' | 'neutral';
    characteristics?: string[]; // ej: ["freckles", "rosy_cheeks", "even_complexion"]
  };
  
  // Rasgos faciales
  facialFeatures: {
    faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'long' | 'triangular';
    eyes: {
      shape: 'almond' | 'round' | 'hooded' | 'monolid' | 'deep_set' | 'prominent';
      color: 'blue' | 'green' | 'brown' | 'hazel' | 'gray' | 'amber' | 'black';
      size: 'small' | 'medium' | 'large';
      distinctive?: string[]; // ej: ["long_eyelashes", "dark_circles", "sparkling"]
    };
    eyebrows: {
      thickness: 'thin' | 'medium' | 'thick' | 'bushy';
      shape: 'straight' | 'arched' | 'rounded' | 'angular' | 's_shaped';
      color: string;
    };
    nose: {
      shape: 'straight' | 'button' | 'aquiline' | 'roman' | 'flat' | 'wide' | 'narrow';
      size: 'small' | 'medium' | 'large';
    };
    lips: {
      fullness: 'thin' | 'medium' | 'full' | 'very_full';
      shape: 'natural' | 'cupid_bow' | 'wide' | 'narrow';
      color: string;
    };
    jawline: 'sharp' | 'soft' | 'defined' | 'rounded' | 'square';
  };
  
  // Cabello
  hair: {
    color: string;
    length: 'very_short' | 'short' | 'medium' | 'long' | 'very_long';
    texture: 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
    style: string; // ej: "messy_bun", "slicked_back", "natural", "braided"
    characteristics?: string[]; // ej: ["highlights", "bangs", "layers"]
  };
  
  // Complexión corporal
  bodyType: {
    build: 'ectomorph' | 'mesomorph' | 'endomorph' | 'athletic' | 'slender' | 'curvy' | 'muscular';
    height: 'very_short' | 'short' | 'average' | 'tall' | 'very_tall';
    frame: 'small' | 'medium' | 'large';
    proportions: 'balanced' | 'long_torso' | 'long_legs' | 'pear_shaped' | 'apple_shaped';
  };
  
  // Rasgos distintivos
  distinctiveFeatures: string[]; // ej: ["tattoos", "piercings", "scars", "birthmarks", "dimples"]
  
  // Notas adicionales para consistencia
  additionalNotes?: string;
}

// Análisis psicológico y de personalidad
export interface PsychologicalProfile {
  // Estado de humor predominante
  predominantMood: MoodState;
  
  // Intereses principales (máximo 10)
  mainInterests: string[];
  
  // Valores fundamentales (máximo 8)
  coreValues: string[];
  
  // Creencias y filosofía
  beliefs: {
    spiritual?: string;
    philosophical?: string;
    political?: string;
    lifestyle?: string;
  };
  
  // Motivaciones principales
  motivations: string[];
  
  // Estilo de comunicación
  communicationStyle: {
    tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'playful' | 'inspirational' | 'edgy';
    vocabulary: 'simple' | 'moderate' | 'sophisticated' | 'technical' | 'artistic';
    emojiUsage: 'minimal' | 'moderate' | 'heavy' | 'strategic';
    hashtags: 'minimal' | 'moderate' | 'heavy' | 'strategic';
  };
  
  // Nivel de energía
  energyLevel: EnergyLevel;
  
  // Arquetipos de personalidad
  personalityArchetypes: string[]; // ej: ["the_creative", "the_mentor", "the_rebel", "the_sage"]
  
  // Miedos o limitaciones (para profundidad psicológica)
  fears?: string[];
  
  // Metas personales y profesionales
  goals: {
    short_term: string[];
    long_term: string[];
  };
}

// Identidad general
export interface GeneralIdentity {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non_binary' | 'other';
  nationality: string;
  culturalContext: string;
  
  // Idiomas
  languages: {
    primary: string;
    secondary?: string[];
    proficiency: {
      [language: string]: 'basic' | 'intermediate' | 'advanced' | 'native';
    };
  };
  
  // Tipo de influencer
  influencerType: InfluencerType;
  
  // Niche específico
  niche: string;
  
  // Ubicación geográfica
  location: {
    country: string;
    city?: string;
    region?: string;
  };
  
  // Ocupación principal
  occupation?: string;
  
  // Educación
  education?: string;
}

// Perfil completo (unión de todas las secciones)
export interface Profile {
  id: number;
  
  // Identidad general
  identity: GeneralIdentity;
  
  // Descripción forense
  forensicDescription: ForensicDescription;
  
  // Perfil psicológico
  psychologicalProfile: PsychologicalProfile;
  
  // Metadatos
  isActive: boolean; // Perfil actualmente en uso
  createdAt: Date;
  updatedAt: Date;
  
  // Configuración de generación
  generationSettings: {
    // Preferencias de contenido
    contentThemes: string[];
    contentFrequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
    optimalPostingTimes: string[]; // Horarios en formato "HH:mm"
    
    // Estilo visual preferido
    visualStyle: {
      aesthetic: 'minimalist' | 'vibrant' | 'dark' | 'light' | 'vintage' | 'modern' | 'artistic' | 'natural';
      colorPalette: string[]; // Códigos hex preferidos
      filters: string[]; // Filtros de Instagram preferidos
    };
    
    // Restricciones de contenido
    contentRestrictions: string[]; // Temas a evitar
    brandGuidelines?: string; // Guías de marca si aplica
  };
}

// Tipos para operaciones CRUD
export type CreateProfileRequest = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProfileRequest = Partial<CreateProfileRequest>;

// Respuesta de API
export interface ProfileResponse {
  success: boolean;
  data?: Profile;
  error?: string;
}

// Lista de perfiles
export interface ProfileListResponse {
  success: boolean;
  data: Profile[];
  total: number;
  error?: string;
}

export interface UsageLimit {
  id: number;
  date: string;
  imagesGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}

// Request types
export interface GenerateImageRequest {
  prompt: string;
  caption?: string;
  autoSchedule?: boolean;
  scheduleAt?: string; // ISO string
  isCarousel?: boolean;
  imageCount?: number;
  scheduleInterval?: number;
}

export interface ScheduleImageRequest {
  scheduledAt: string; // ISO string
}

// Response types
export type ImageResponse = ImageModel;

export interface UsageLimitResponse {
  date: string;
  count: number;
  limit: number;
  remaining: number;
}

export interface InstagramStatusResponse {
  connected: boolean;
  error?: string;
  username?: string;
}

// Constants
export const DAILY_IMAGE_LIMIT = 20;

// Helper type for insert operations
export type InsertImage = Omit<ImageModel, 'id' | 'createdAt'>;

export type InsertInfluencerProfile = Omit<InfluencerProfile, 'id' | 'createdAt' | 'updatedAt'>;
