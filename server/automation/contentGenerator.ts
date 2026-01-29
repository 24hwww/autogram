import { getThemeByTimeOfDay } from "./themes";
import { LlamaService } from "../services/llama";
import { storage } from "../storage";

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

        // Select theme
        const themeObj = getThemeByTimeOfDay(hour, date.getDay());

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

        // Fetch profile from DB
        const profile = await storage.getInfluencerProfile();

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
            const caption = await LlamaService.generateCaption(`Bible verse: ${verseData.text}`, profile, "inspirational", recentContext);

            return {
                type: 'verse',
                prompt: verseData.text, // The main text to render
                author: verseData.reference,
                caption: caption,
                context: context
            };
        } else {
            console.log("📸 ContentGenerator: Mode selected -> IMAGE");
            // 1. Generate Image Prompt
            const imagePrompt = await LlamaService.generateImagePrompt(context.theme, context.timeOfDay, profile, recentContext);

            // 2. Generate Caption based on the Image Prompt idea
            const caption = await LlamaService.generateCaption(imagePrompt, profile, "engaging", recentContext);

            return {
                type: 'image',
                prompt: imagePrompt,
                caption: caption,
                context: context
            };
        }
    }
}
