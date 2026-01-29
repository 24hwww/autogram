import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_TOKEN);

export class HuggingFaceService {
    /**
     * Generate an image using Stable Diffusion via Hugging Face SDK
     */
    static async generateImage(prompt: string): Promise<Buffer> {
        // Trying a more robust model
        const model = "stabilityai/stable-diffusion-xl-base-1.0";

        try {
            const response = await hf.textToImage({
                model: model,
                inputs: prompt
            });

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log("✅ HuggingFaceService: Image generated successfully!");
            return buffer;

        } catch (error: any) {
            console.error("❌ HuggingFaceService Error:", error.message);

            if (error.message.includes("router.huggingface.co")) {
                console.warn("⚠️ Falling back to direct URL...");
                return await this.generateImageFallback(prompt);
            }

            throw new Error(`Failed to generate image via Hugging Face: ${error.message}`);
        }
    }

    private static async generateImageFallback(prompt: string): Promise<Buffer> {
        const model = "stabilityai/stable-diffusion-xl-base-1.0";
        const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_TOKEN;

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

        if (!response.ok) {
            throw new Error(`Fallback failed: ${response.status} ${await response.text()}`);
        }

        return Buffer.from(await response.arrayBuffer());
    }
}
