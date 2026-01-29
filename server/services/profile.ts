import { 
  Profile, 
  CreateProfileRequest, 
  UpdateProfileRequest, 
  ProfileResponse, 
  ProfileListResponse,
  GeneralIdentity,
  ForensicDescription,
  PsychologicalProfile
} from '@shared/types';
import { storage } from '../storage';

/**
 * Servicio central de gestión de Perfiles
 * Este es el módulo base que define la identidad completa del influencer
 */
export class ProfileService {
  
  /**
   * Crear un nuevo perfil completo
   */
  static async createProfile(profileData: CreateProfileRequest): Promise<ProfileResponse> {
    try {
      console.log("🔍 ProfileService: Iniciando creación de perfil");
      console.log("🔍 ProfileService: Datos recibidos:", JSON.stringify(profileData, null, 2));
      
      const validation = this.validateProfileData(profileData);
      if (!validation.isValid) {
        console.error("❌ ProfileService: Validación fallida:", validation.error);
        return {
          success: false,
          error: validation.error
        };
      }

      console.log("✅ ProfileService: Validación exitosa");

      // Asegurar que solo un perfil esté activo
      if (profileData.isActive) {
        console.log("🔍 ProfileService: Desactivando otros perfiles");
        await this.deactivateAllProfiles();
      }

      console.log("🔍 ProfileService: Llamando a storage.createProfile");
      const newProfile = await storage.createProfile(profileData as any);
      
      console.log(`✅ ProfileService: Perfil "${profileData.identity.name}" creado exitosamente`);
      console.log("🔍 ProfileService: Perfil guardado:", JSON.stringify(newProfile, null, 2));
      
      return {
        success: true,
        data: newProfile
      };
    } catch (error) {
      console.error('❌ ProfileService: Error creando perfil:', error);
      console.error('❌ ProfileService: Error stack:', error instanceof Error ? error.stack : 'No stack available');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener todos los perfiles
   */
  static async getAllProfiles(): Promise<ProfileListResponse> {
    try {
      const profiles = await storage.getAllProfiles();
      
      return {
        success: true,
        data: profiles,
        total: profiles.length
      };
    } catch (error) {
      console.error('❌ ProfileService: Error obteniendo perfiles:', error);
      return {
        success: false,
        data: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener perfil por ID
   */
  static async getProfileById(id: number): Promise<ProfileResponse> {
    try {
      const profile = await storage.getProfile(id);
      
      if (!profile) {
        return {
          success: false,
          error: `Perfil con ID ${id} no encontrado`
        };
      }

      return {
        success: true,
        data: profile
      };
    } catch (error) {
      console.error(`❌ ProfileService: Error obteniendo perfil ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener perfil activo actual
   */
  static async getActiveProfile(): Promise<ProfileResponse> {
    try {
      const profile = await storage.getActiveProfile();
      
      if (!profile) {
        return {
          success: false,
          error: 'No hay ningún perfil activo'
        };
      }

      return {
        success: true,
        data: profile
      };
    } catch (error) {
      console.error('❌ ProfileService: Error obteniendo perfil activo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Actualizar perfil existente
   */
  static async updateProfile(id: number, updateData: UpdateProfileRequest): Promise<ProfileResponse> {
    try {
      // Validar que el perfil existe
      const existingProfile = await storage.getProfile(id);
      if (!existingProfile) {
        return {
          success: false,
          error: `Perfil con ID ${id} no encontrado`
        };
      }

      // Validar datos de actualización
      if (updateData) {
        const validation = this.validateProfileData(updateData as any);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.error
          };
        }
      }

      // Si se está activando este perfil, desactivar los demás
      if (updateData?.isActive) {
        await this.deactivateAllProfiles();
      }

      const updatedProfile = await storage.updateProfile(id, updateData as any);
      
      console.log(`✅ ProfileService: Perfil "${updatedProfile.identity.name}" actualizado exitosamente`);
      
      return {
        success: true,
        data: updatedProfile
      };
    } catch (error) {
      console.error(`❌ ProfileService: Error actualizando perfil ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Eliminar perfil
   */
  static async deleteProfile(id: number): Promise<ProfileResponse> {
    try {
      const existingProfile = await storage.getProfile(id);
      if (!existingProfile) {
        return {
          success: false,
          error: `Perfil con ID ${id} no encontrado`
        };
      }

      await storage.deleteProfile(id);
      
      console.log(`✅ ProfileService: Perfil "${existingProfile.identity.name}" eliminado exitosamente`);
      
      return {
        success: true
      };
    } catch (error) {
      console.error(`❌ ProfileService: Error eliminando perfil ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Activar un perfil específico (desactiva los demás)
   */
  static async activateProfile(id: number): Promise<ProfileResponse> {
    try {
      const profile = await storage.getProfile(id);
      if (!profile) {
        return {
          success: false,
          error: `Perfil con ID ${id} no encontrado`
        };
      }

      // Desactivar todos los perfiles
      await this.deactivateAllProfiles();
      
      // Activar el perfil solicitado
      const updatedProfile = await storage.updateProfile(id, { isActive: true } as any);
      
      console.log(`✅ ProfileService: Perfil "${updatedProfile.identity.name}" activado exitosamente`);
      
      return {
        success: true,
        data: updatedProfile
      };
    } catch (error) {
      console.error(`❌ ProfileService: Error activando perfil ${id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * ===== MÉTODOS DE INTEGRACIÓN CON GENERACIÓN DE CONTENIDO =====
   */

  /**
   * Generar prompt de imagen basado en el perfil activo
   */
  static async generateImagePrompt(baseConcept: string): Promise<string> {
    try {
      const activeProfile = await this.getActiveProfile();
      if (!activeProfile.success || !activeProfile.data) {
        throw new Error('No hay perfil activo para generar prompt');
      }

      const profile = activeProfile.data;
      const forensic = profile.forensicDescription;
      
      // Construir descripción visual detallada
      const visualDescription = this.buildVisualDescription(forensic);
      
      // Combinar con el concepto base
      const fullPrompt = `${baseConcept}. ${visualDescription}. Style: ${profile.generationSettings.visualStyle.aesthetic}. Color palette: ${profile.generationSettings.visualStyle.colorPalette.join(', ')}`;
      
      console.log(`🎨 ProfileService: Prompt generado para "${profile.identity.name}"`);
      
      return fullPrompt;
    } catch (error) {
      console.error('❌ ProfileService: Error generando prompt de imagen:', error);
      throw error;
    }
  }

  /**
   * Generar caption basado en el perfil activo
   */
  static async generateCaption(baseContent: string): Promise<string> {
    try {
      const activeProfile = await this.getActiveProfile();
      if (!activeProfile.success || !activeProfile.data) {
        throw new Error('No hay perfil activo para generar caption');
      }

      const profile = activeProfile.data;
      const psych = profile.psychologicalProfile;
      
      // Ajustar tono y estilo según perfil psicológico
      const adaptedContent = this.adaptContentToProfile(baseContent, psych);
      
      console.log(`✍️ ProfileService: Caption generado para "${profile.identity.name}"`);
      
      return adaptedContent;
    } catch (error) {
      console.error('❌ ProfileService: Error generando caption:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración de generación del perfil activo
   */
  static async getGenerationSettings() {
    try {
      const activeProfile = await this.getActiveProfile();
      if (!activeProfile.success || !activeProfile.data) {
        throw new Error('No hay perfil activo');
      }

      return activeProfile.data.generationSettings;
    } catch (error) {
      console.error('❌ ProfileService: Error obteniendo configuración:', error);
      throw error;
    }
  }

  /**
   * ===== MÉTODOS PRIVADOS DE AYUDA =====
   */

  /**
   * Validar datos del perfil
   */
  private static validateProfileData(data: any): { isValid: boolean; error?: string } {
    if (!data.identity?.name) {
      return { isValid: false, error: 'El nombre del perfil es requerido' };
    }

    if (!data.identity?.age || data.identity.age < 13 || data.identity.age > 100) {
      return { isValid: false, error: 'La edad debe estar entre 13 y 100 años' };
    }

    if (!data.forensicDescription) {
      return { isValid: false, error: 'La descripción forense es requerida' };
    }

    if (!data.psychologicalProfile) {
      return { isValid: false, error: 'El perfil psicológico es requerido' };
    }

    if (!data.generationSettings) {
      return { isValid: false, error: 'La configuración de generación es requerida' };
    }

    return { isValid: true };
  }

  /**
   * Desactivar todos los perfiles
   */
  private static async deactivateAllProfiles(): Promise<void> {
    try {
      await storage.deactivateAllProfiles();
    } catch (error) {
      console.error('❌ ProfileService: Error desactivando perfiles:', error);
      throw error;
    }
  }

  /**
   * Construir descripción visual para generación de imágenes
   */
  private static buildVisualDescription(forensic: ForensicDescription): string {
    const { facialFeatures, hair, bodyType, skinTone } = forensic;
    
    let description = `Photo of a ${forensic.skinTone.base} skinned person with `;
    
    // Rasgos faciales
    description += `${facialFeatures.faceShape} face, ${facialFeatures.eyes.color} ${facialFeatures.eyes.shape} eyes, `;
    description += `${facialFeatures.eyebrows.thickness} ${facialFeatures.eyebrows.shape} eyebrows, `;
    description += `${facialFeatures.nose.shape} nose, ${facialFeatures.lips.fullness} lips, `;
    description += `${facialFeatures.jawline} jawline. `;
    
    // Cabello
    description += `${hair.length} ${hair.texture} ${hair.color} hair styled as ${hair.style}. `;
    
    // Complexión
    description += `${bodyType.build} build, ${bodyType.height} height, ${bodyType.frame} frame. `;
    
    // Rasgos distintivos
    if (forensic.distinctiveFeatures.length > 0) {
      description += `Distinctive features: ${forensic.distinctiveFeatures.join(', ')}. `;
    }

    return description;
  }

  /**
   * Adaptar contenido al perfil psicológico
   */
  private static adaptContentToProfile(baseContent: string, psych: PsychologicalProfile): string {
    let adaptedContent = baseContent;
    
    // Ajustar tono según estado de humor
    const moodEmojis = {
      enthusiastic: ['🔥', '✨', '💪', '🎯'],
      calm: ['🌸', '🕊️', '🌿', '☕'],
      melancholic: ['🌙', '🌧️', '📖', '🎭'],
      energetic: ['⚡', '🚀', '💥', '🌟'],
      thoughtful: ['🤔', '💭', '📚', '🔍'],
      playful: ['😄', '🎮', '🎪', '🦄'],
      serious: ['📊', '🎯', '💼', '📈'],
      mysterious: ['🌑', '🔮', '🗝️', '🌌'],
      optimistic: ['☀️', '🌈', '💖', '🌻'],
      romantic: ['💕', '🌹', '💐', '🥰']
    };
    
    // Añadir emojis apropiados
    const emojis = moodEmojis[psych.predominantMood] || ['✨'];
    if (psych.communicationStyle.emojiUsage !== 'minimal') {
      adaptedContent += ` ${emojis.slice(0, 2).join(' ')}`;
    }
    
    // Ajustar vocabulario
    if (psych.communicationStyle.vocabulary === 'sophisticated') {
      // Implementar lógica para mejorar vocabulario
      adaptedContent = this.elevateVocabulary(adaptedContent);
    } else if (psych.communicationStyle.vocabulary === 'simple') {
      // Implementar lógica para simplificar vocabulario
      adaptedContent = this.simplifyVocabulary(adaptedContent);
    }
    
    return adaptedContent;
  }

  /**
   * Elevar vocabulario (implementación básica)
   */
  private static elevateVocabulary(text: string): string {
    // Implementación simple - podría mejorarse con IA
    const replacements: { [key: string]: string } = {
      'good': 'excellent',
      'nice': 'wonderful',
      'great': 'exceptional',
      'bad': 'unfortunate',
      'big': 'substantial'
    };
    
    let result = text;
    Object.entries(replacements).forEach(([old, newWord]) => {
      result = result.replace(new RegExp(old, 'gi'), newWord);
    });
    
    return result;
  }

  /**
   * Simplificar vocabulario (implementación básica)
   */
  private static simplifyVocabulary(text: string): string {
    // Implementación simple - podría mejorarse con IA
    const replacements: { [key: string]: string } = {
      'excellent': 'good',
      'wonderful': 'nice',
      'exceptional': 'great',
      'unfortunate': 'bad',
      'substantial': 'big'
    };
    
    let result = text;
    Object.entries(replacements).forEach(([old, newWord]) => {
      result = result.replace(new RegExp(old, 'gi'), newWord);
    });
    
    return result;
  }
}
