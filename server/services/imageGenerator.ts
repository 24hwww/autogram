import sharp from "sharp";
import path from "path";
import { ProfileService } from "./profile";

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

        // ===== INTEGRACIÓN CON PERFIL SERVICE =====
        // Obtener configuración visual del perfil activo
        let visualSettings;
        try {
            visualSettings = await ProfileService.getGenerationSettings();
        } catch (error) {
            console.log('⚠️ ImageGenerator: No profile settings found, using defaults');
            visualSettings = {
                visualStyle: {
                    aesthetic: 'modern',
                    colorPalette: ['#1a1a1a', '#ffffff'],
                    filters: []
                }
            };
        }

        // Crear background basado en el perfil
        const bg = this.getBackgroundFromProfile(visualSettings.visualStyle);

        // Create base image
        let image = sharp({
            create: {
                width,
                height,
                channels: 4,
                background: bg
            }
        });

        // Generar estilo de texto basado en el perfil
        const svgText = this.generateSVGFromProfile(text, author, visualSettings.visualStyle, width, height);

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

    /**
     * Genera background basado en la configuración del perfil
     */
    private static getBackgroundFromProfile(visualStyle: any) {
        const { aesthetic, colorPalette } = visualStyle;
        
        // Colores base según paleta del perfil
        const primaryColor = colorPalette[0] || '#1a1a1a';
        
        // Convertir hex a RGB
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
                alpha: 1
            } : { r: 20, g: 20, b: 30, alpha: 1 };
        };

        switch (aesthetic) {
            case 'dark':
                return hexToRgb(primaryColor);
            case 'light':
                return { r: 245, g: 245, b: 245, alpha: 1 };
            case 'vibrant':
                return hexToRgb(colorPalette[1] || '#ff6b6b');
            case 'minimalist':
                return { r: 250, g: 250, b: 250, alpha: 1 };
            case 'vintage':
                return { r: 45, g: 35, b: 30, alpha: 1 };
            case 'artistic':
                return hexToRgb(colorPalette[Math.floor(Math.random() * colorPalette.length)] || '#6c5ce7');
            default:
                return hexToRgb(primaryColor);
        }
    }

    /**
     * Genera SVG basado en la configuración del perfil
     */
    private static generateSVGFromProfile(text: string, author: string, visualStyle: any, width: number, height: number) {
        const { aesthetic, colorPalette } = visualStyle;
        
        // Estilos de texto según aesthetic
        const textStyles = {
            dark: {
                titleColor: '#ffffff',
                authorColor: '#cccccc',
                fontSize: 60,
                fontFamily: 'Arial, sans-serif'
            },
            light: {
                titleColor: '#2c3e50',
                authorColor: '#7f8c8d',
                fontSize: 58,
                fontFamily: 'Georgia, serif'
            },
            vibrant: {
                titleColor: '#ffffff',
                authorColor: '#ffe66d',
                fontSize: 62,
                fontFamily: 'Impact, sans-serif'
            },
            minimalist: {
                titleColor: '#2c3e50',
                authorColor: '#95a5a6',
                fontSize: 56,
                fontFamily: 'Helvetica, sans-serif'
            },
            vintage: {
                titleColor: '#f4e4c1',
                authorColor: '#d4af37',
                fontSize: 64,
                fontFamily: 'Times New Roman, serif'
            },
            artistic: {
                titleColor: '#ffffff',
                authorColor: colorPalette[1] || '#e17055',
                fontSize: 66,
                fontFamily: 'Courier New, monospace'
            }
        };

        const style = textStyles[aesthetic as keyof typeof textStyles] || textStyles.minimalist;

        return `
      <svg width="${width}" height="${height}">
        <style>
          .title { 
            fill: ${style.titleColor}; 
            font-size: ${style.fontSize}px; 
            font-family: ${style.fontFamily}; 
            font-weight: bold; 
            text-anchor: middle; 
            line-height: 1.4;
          }
          .author { 
            fill: ${style.authorColor}; 
            font-size: ${Math.floor(style.fontSize * 0.6)}px; 
            font-family: ${style.fontFamily}; 
            font-style: italic; 
            text-anchor: middle; 
          }
        </style>
        
        <!-- Text Content -->
        <foreignObject x="80" y="200" width="${width - 160}" height="600">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            color: ${style.titleColor}; 
            font-family: ${style.fontFamily}; 
            font-size: ${style.fontSize}px; 
            text-align: center; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100%; 
            line-height: 1.4;
            font-weight: bold;
          ">
            ${this.escapeHtml(text)}
          </div>
        </foreignObject>
        
        <text x="${width/2}" y="${height - 120}" class="author">${this.escapeHtml(author)}</text>
      </svg>
    `;
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
