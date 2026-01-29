import sharp from "sharp";
import path from "path";

export class ImageGeneratorService {
    /**
     * Generates a 1080x1080 image with centered text suitable for Instagram.
     * @param text The text (verse/quote) to render
     * @param author Optional author/reference
     * @returns Buffer of the PNG image
     */
    static async generateTextImage(text: string, author: string = ""): Promise<Buffer> {
        const width = 1080;
        const height = 1080;

        // Create a solid or gradient background
        // For now, let's use a nice dark gradient or solid color
        // We can randomize this later
        const backgrounds = [
            { r: 20, g: 20, b: 30, alpha: 1 }, // Dark Blue/Grey
            { r: 40, g: 10, b: 10, alpha: 1 }, // Dark Red
            { r: 10, g: 30, b: 20, alpha: 1 }, // Dark Green
            { r: 0, g: 0, b: 0, alpha: 1 },    // Black
        ];

        const bg = backgrounds[Math.floor(Math.random() * backgrounds.length)];

        // Create base image
        let image = sharp({
            create: {
                width,
                height,
                channels: 4,
                background: bg
            }
        });

        // Simple text wrapping logic via SVG
        // Sharp renders SVG efficiently. This is the best way to handle text wrapping and fonts without complex canvas operations.
        const svgText = `
      <svg width="${width}" height="${height}">
        <style>
          .title { fill: #ffffff; font-size: 60px; font-family: sans-serif; font-weight: bold; text-anchor: middle; }
          .author { fill: #cccccc; font-size: 40px; font-family: sans-serif; font-style: italic; text-anchor: middle; }
        </style>
        <!-- Background Overlay (Optional for better contrast if we use images later) -->
        <rect x="0" y="0" width="${width}" height="${height}" fill="none" />
        
        <!-- Text Content -->
        <!-- We use foreignObject to allow HTML text wrapping which is easier than pure SVG text -->
        <foreignObject x="100" y="200" width="880" height="600">
          <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; font-family: sans-serif; font-size: 50px; text-align: center; display: flex; align-items: center; justify-content: center; height: 100%; line-height: 1.5;">
            ${this.escapeHtml(text)}
          </div>
        </foreignObject>
        
        <text x="540" y="900" class="author">${this.escapeHtml(author)}</text>
      </svg>
    `;

        const svgBuffer = Buffer.from(svgText);

        image = image.composite([
            {
                input: svgBuffer,
                top: 0,
                left: 0,
            },
        ]);

        return await image.png().toBuffer();
    }

    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
