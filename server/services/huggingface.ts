import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_TOKEN);

export class HuggingFaceService {
    /**
     * Generate an image using Stable Diffusion via Hugging Face SDK
     */
    static async generateImage(prompt: string): Promise<Buffer> {
        // Try multiple models in order of preference
        const models = [
            "runwayml/stable-diffusion-v1-5",
            "stabilityai/stable-diffusion-2-1",
            "stabilityai/stable-diffusion-xl-base-1.0"
        ];

        // Enhance prompt with quality boosters
        const qualityBoosters = "premium quality, high resolution, 8k, detailed skin texture, cinematic lighting, professional photography, masterpiece, sharp focus";
        const enhancedPrompt = `${prompt}, ${qualityBoosters}`;

        for (const model of models) {
            try {
                console.log(`🎨 Trying model: ${model}`);
                
                const response = await hf.textToImage({
                    model: model,
                    inputs: enhancedPrompt
                });

                const arrayBuffer = await (response as any).arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                console.log("✅ HuggingFaceService: Image generated successfully!");
                return buffer;

            } catch (error: any) {
                console.warn(`⚠️ Model ${model} failed:`, error.message);
                
                // If it's the last model, try fallback
                if (model === models[models.length - 1]) {
                    console.warn("⚠️ All models failed, trying direct URL fallback...");
                    return await this.generateImageFallback(prompt);
                }
                
                // Continue to next model
                continue;
            }
        }

        throw new Error("All image generation models failed");
    }

    private static async generateImageFallback(prompt: string): Promise<Buffer> {
        // Try multiple models in fallback as well
        const models = [
            "runwayml/stable-diffusion-v1-5",
            "stabilityai/stable-diffusion-2-1",
            "stabilityai/stable-diffusion-xl-base-1.0"
        ];
        
        const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_TOKEN;

        for (const model of models) {
            try {
                console.log(`🔄 Fallback: Trying model ${model}`);
                
                const response = await fetch(
                    `https://api-inference.huggingface.co/models/${model}`,
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "x-use-cache": "false"
                        },
                        method: "POST",
                        body: JSON.stringify({ inputs: prompt }),
                    }
                );

                if (response.ok) {
                    return Buffer.from(await response.arrayBuffer());
                } else {
                    console.warn(`⚠️ Fallback model ${model} failed: ${response.status} ${await response.text()}`);
                }
            } catch (error: any) {
                console.warn(`⚠️ Fallback error for ${model}:`, error.message);
            }
        }

        throw new Error("All fallback models failed. Please check your HuggingFace API credits and configuration.");
    }
}
