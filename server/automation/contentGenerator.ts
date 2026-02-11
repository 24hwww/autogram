import { getThemeByTimeOfDay, getRandomTheme } from "./themes";
import { LlamaService } from "../services/llama";
import { storage } from "../storage";
import { ProfileService } from "../services/profile";

interface ContentContext {
    theme: string;
    timeOfDay: string;
    dayOfWeek: string;
}

export type ContentType = 'image' | 'verse';

export interface GeneratedContent {
    type: ContentType;
    prompt: string; // Used for image gen OR used as the verse text
    caption: string;
    author?: string; // For verses
    context: ContentContext;
}

export class ContentGenerator {

    private static getTimeContext(date: Date = new Date()): ContentContext {
        // Determine time of day label
        const hour = date.getHours();
        let timeOfDay = "day";
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 22) timeOfDay = "evening";
        else timeOfDay = "night";

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[date.getDay()];

        // Select theme based on hour, but with a chance of randomness for variety
        let themeObj;
        if (Math.random() < 0.2) {
            // 20% chance of a completely random theme for variety
            themeObj = getRandomTheme();
        } else {
            themeObj = getThemeByTimeOfDay(hour, date.getDay());
        }

        return {
            theme: themeObj.name,
            timeOfDay,
            dayOfWeek: dayName
        };
    }

    /**
     * Generates a full concept for a post: Prompt and Caption
     */
    static async generatePostConcept(): Promise<GeneratedContent> {
        const context = this.getTimeContext();
        console.log(`🧠 ContentGenerator: Creating concept for ${context.dayOfWeek} ${context.timeOfDay} (Theme: ${context.theme})`);

        // ===== INTEGRACIÓN CON PERFIL SERVICE =====
        // Intentar obtener perfil activo del nuevo sistema
        let profile;
        try {
            const activeProfileResult = await ProfileService.getActiveProfile();
            if (activeProfileResult.success && activeProfileResult.data) {
                // Convertir nuevo perfil al formato esperado por LlamaService
                const newProfile = activeProfileResult.data;
                profile = {
                    id: newProfile.id,
                    name: newProfile.identity.name,
                    personality: `${newProfile.psychologicalProfile.predominantMood} ${newProfile.psychologicalProfile.communicationStyle.tone} influencer`,
                    physicalDescription: JSON.stringify(newProfile.forensicDescription),
                    activities: newProfile.psychologicalProfile.mainInterests.join(', '),
                    tone: newProfile.psychologicalProfile.communicationStyle.tone,
                    createdAt: newProfile.createdAt,
                    updatedAt: newProfile.updatedAt,
                };
                console.log(`✅ ContentGenerator: Using active profile "${profile.name}"`);
            } else {
                throw new Error('No active profile found');
            }
        } catch (error) {
            console.log('⚠️ ContentGenerator: No active profile found, using default');
            // Fallback al perfil antiguo
            profile = await storage.getInfluencerProfile() || {
                id: 0,
                name: 'Default Influencer',
                personality: 'Friendly and engaging',
                physicalDescription: 'A modern lifestyle influencer',
                activities: 'Fitness, wellness, motivation',
                tone: 'engaging',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        // Fetch recent posts for coherence
        const recentPosts = await storage.getRecentPublishedImages(5);
        const recentContext = recentPosts.length > 0
            ? recentPosts.map(p => `- Prompt: ${p.prompt.substring(0, 100)}\n  Caption: ${p.caption?.substring(0, 100)}`).join('\n')
            : "No previous posts yet.";

        // Randomly decide type: 30% chance of Verse, 70% Image
        const isVerse = Math.random() < 0.3;

        if (isVerse) {
            console.log("📜 ContentGenerator: Mode selected -> VERSE");
            const verseData = await LlamaService.generateVerse(context.theme);
            
            // Usar ProfileService para generar caption adaptado al perfil
            let caption;
            try {
                caption = await ProfileService.generateCaption(`Bible verse: ${verseData.text}`);
            } catch (error) {
                console.log('⚠️ ContentGenerator: ProfileService caption failed, using fallback');
                caption = await LlamaService.generateCaption(`Bible verse: ${verseData.text}`, profile, "inspirational", recentContext);
            }

            return {
                type: 'verse',
                prompt: verseData.text, // The main text to render
                author: verseData.reference,
                caption: caption,
                context: context
            };
        } else {
            console.log("📸 ContentGenerator: Mode selected -> IMAGE");
            
            // 1. Generar prompt de imagen usando ProfileService
            let imagePrompt;
            try {
                const basePrompt = await LlamaService.generateImagePrompt(context.theme, context.timeOfDay, profile, recentContext);
                imagePrompt = await ProfileService.generateImagePrompt(basePrompt);
            } catch (error) {
                console.log('⚠️ ContentGenerator: ProfileService image prompt failed, using fallback');
                imagePrompt = await LlamaService.generateImagePrompt(context.theme, context.timeOfDay, profile, recentContext);
            }

            // 2. Generar caption usando ProfileService
            let caption;
            try {
                caption = await ProfileService.generateCaption(imagePrompt);
            } catch (error) {
                console.log('⚠️ ContentGenerator: ProfileService caption failed, using fallback');
                caption = await LlamaService.generateCaption(imagePrompt, profile, "engaging", recentContext);
            }

            return {
                type: 'image',
                prompt: imagePrompt,
                caption: caption,
                context: context
            };
        }
    }
}
