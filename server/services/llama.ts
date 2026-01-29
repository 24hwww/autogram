import { type InfluencerProfile } from "@shared/schema";

const WORKER_URL = process.env.LLAMA_API_URL || "https://llama-3-8b-instruct.24hwww.workers.dev/";

export class LlamaService {
    private static getApiKey(): string {
        const apiKey = process.env.API_KEY || "";
        if (!apiKey) {
            console.warn("⚠️ API_KEY not found in environment. Llama generation might fail.");
        }
        return apiKey;
    }

    /**
     * Generate a caption for an Instagram post
     */
    static async generateCaption(prompt: string, profile: InfluencerProfile, tone: string = "engaging", recentContext?: string): Promise<string> {
        try {
            console.log(`📝 LlamaService: Generating caption for: "${prompt.substring(0, 50)}..."`);

            const personaInfo = `
You are '${profile.name}', a modern lifestyle influencer. 
Your personality: ${profile.personality}
Your life activities include: ${profile.activities}
Your tone: ${profile.tone}
`;

            const contextInfo = recentContext ? `\nRecent posts context to maintain coherence: ${recentContext}\n` : "";

            const systemPrompt = `${personaInfo}${contextInfo}
      Create a ${tone} Instagram caption for a post about: ${prompt}.
      Write as yourself (${profile.name}). Use first-person perspective.
      Ensure this new post feels like a natural continuation of your journey, avoiding repetitive phrasing from recent posts.
      Include 3-5 relevant hashtags. 
      Keep it concise but impactful. 
      Do NOT include quotes surrounding the caption.`;

            const result = await this.callWorker(systemPrompt);
            return result;
        } catch (error: any) {
            console.error("❌ LlamaService Caption Error:", error.message);
            return prompt;
        }
    }

    /**
     * Generate an image prompt based on a theme
     */
    static async generateImagePrompt(theme: string, timeOfDay: string, profile: InfluencerProfile, recentContext?: string): Promise<string> {
        try {
            console.log(`🎨 LlamaService: Creating image prompt for theme: ${theme} (${timeOfDay})`);

            const personaInfo = `
You are '${profile.name}', a modern lifestyle influencer. 
Physical description: ${profile.physicalDescription}
Your personality: ${profile.personality}
`;

            const contextInfo = recentContext ? `\nRecent posts context: ${recentContext}\n` : "";

            const systemPrompt = `${personaInfo}${contextInfo}
      Create a highly detailed, photorealistic AI image prompt for an Instagram post showing ${profile.name} (you) engaged in the theme: ${theme}.
      Context: ${timeOfDay}.
      Avoid repeating scenes or specific outfits described in recent posts to maintain variety in your feed.
      The image should look like a high-quality smartphone photo or a professional lifestyle shot.
      Return ONLY the prompt text, no explanations.`;

            return await this.callWorker(systemPrompt);
        } catch (error: any) {
            console.error("❌ LlamaService Prompt Error:", error.message);
            return `${theme} lifestyle photo, ${timeOfDay} lighting, high quality`;
        }
    }

    /**
   * Generate a random Bible verse or inspiring quote
   */
    static async generateVerse(topic: string = "hope"): Promise<{ text: string, reference: string }> {
        try {
            console.log(`📖 LlamaService: Generating verse for topic: ${topic}`);

            const systemPrompt = `You are a source of daily inspiration.
      Provide a Bible verse or a famous inspiring quote about: ${topic}.
      Return ONLY valid JSON in this format:
      {
        "text": "The verse or quote text itself",
        "reference": "Book Chapter:Verse or Author Name"
      }
      Do not include Markdown formatting using \`\`\`json.`;

            const result = await this.callWorker(systemPrompt);

            // Attempt to parse JSON
            try {
                const parsed = JSON.parse(result.replace(/```json/g, '').replace(/```/g, ''));
                return {
                    text: parsed.text || result,
                    reference: parsed.reference || ""
                };
            } catch (e) {
                // Fallback if JSON parsing fails
                return { text: result, reference: "" };
            }

        } catch (error: any) {
            console.error("❌ LlamaService Verse Error:", error.message);
            return { text: "Be strong and courageous.", reference: "Joshua 1:9" };
        }
    }

    private static async callWorker(content: string): Promise<string> {
        const apiKey = this.getApiKey();

        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: content,
                    },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Worker returned status: ${response.status}`);
        }

        const data: any = await response.json();

        if (data && data.caption) {
            return data.caption;
        }

        // Sometimes response might be directly in a different field depending on the worker implementation,
        // assuming 'caption' based on previous file, but let's be robust.
        if (data && data.response) return data.response;
        if (data && data.content) return data.content;

        throw new Error("Invalid response structure from Llama worker");
    }
}
