import { IgApiClient } from 'instagram-private-api';
import { type ImageModel } from '@shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Session storage path
const SESSION_PATH = path.join(__dirname, '../../data/instagram-session.json');

// Singleton instance - UNA SOLA INSTANCIA POR CUENTA
const ig = new IgApiClient();

export class InstagramService {
    private static isConnected = false;
    private static connectionError: string | null = null;
    private static sessionInitialized = false;
    private static sessionValid = false;

    /**
     * Initialize session storage - CARGAR SESIÓN EXISTENTE
     */
    private static async initializeSession(): Promise<boolean> {
        if (this.sessionInitialized) return this.sessionValid;

        try {
            // Ensure data directory exists
            const dataDir = path.dirname(SESSION_PATH);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Load existing session if available
            if (fs.existsSync(SESSION_PATH)) {
                const sessionData = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
                console.log('🔄 Instagram: Loading existing session...');
                
                // Restore session - REUTILIZAR SIEMPRE
                await ig.state.deserialize(sessionData.state);
                
                this.sessionValid = true;
                this.sessionInitialized = true;
                console.log('✅ Instagram: Session loaded successfully');
                return true;
            } else {
                console.log('📝 Instagram: No existing session found');
                this.sessionValid = false;
                this.sessionInitialized = true;
                return false;
            }

        } catch (error) {
            console.warn('⚠️ Instagram: Failed to load session, will need fresh login:', error);
            this.sessionValid = false;
            this.sessionInitialized = true;
            return false;
        }
    }

    /**
     * Save current session to disk - GUARDAR SESIÓN UNA VEZ
     */
    private static async saveSession(): Promise<void> {
        try {
            const sessionData = {
                state: ig.state.serialize(),
                cookies: ig.state.cookieJar ? 'cookies_loaded' : {},
                timestamp: new Date().toISOString()
            };

            fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2));
            console.log('💾 Instagram: Session saved to disk');
            this.sessionValid = true;
        } catch (error) {
            console.warn('⚠️ Instagram: Failed to save session:', error);
            this.sessionValid = false;
        }
    }

    /**
     * PRO Login - UNA SOLA VEZ
     */
    private static async proLogin(): Promise<boolean> {
        if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
            throw new Error("Instagram credentials not found in environment variables");
        }

        console.log('🔑 Instagram: PRO Login - UNA SOLA VEZ...');
        
        // Generate device
        ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
        
        // Human-like delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // Login único - NUNCA REINTENTAR
            await ig.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
            
            console.log('✅ Instagram: Login successful!');
            
            // Guardar sesión inmediatamente
            await this.saveSession();
            
            this.isConnected = true;
            this.connectionError = null;
            
            return true;
            
        } catch (error) {
            console.error('❌ Instagram: Login failed - NO REINTENTAR:', error instanceof Error ? error.message : error);
            this.isConnected = false;
            this.connectionError = error instanceof Error ? error.message : 'Login failed';
            this.sessionValid = false;
            
            // NUNCA reintentar login automáticamente
            throw new Error(`Instagram login failed: ${error instanceof Error ? error.message : error}. NO reintentando automáticamente.`);
        }
    }

    /**
     * Test connection with session validation
     */
    static async testConnection(): Promise<boolean> {
        try {
            // Initialize session storage
            const hasSession = await this.initializeSession();
            
            if (!hasSession) {
                console.log('🔍 Instagram: No session available, need fresh login');
                return false;
            }

            if (this.isConnected && this.sessionValid) {
                try {
                    // Test connection with existing session
                    await ig.user.info(ig.state.cookieUserId);
                    console.log('✅ Instagram: Existing session is valid');
                    return true;
                } catch (testError) {
                    console.log('🔍 Instagram: Session test failed, session may be expired:', testError instanceof Error ? testError.message : testError);
                    this.isConnected = false;
                    this.sessionValid = false;
                    return false;
                }
            }

            // If we reach here, we need a fresh login
            console.log('🔍 Instagram: Need fresh login');
            return false;
            
        } catch (error) {
            console.error('❌ Instagram: Connection test failed:', error);
            this.isConnected = false;
            this.sessionValid = false;
            return false;
        }
    }

    /**
     * PRO Publish with session validation
     */
    static async publish(image: ImageModel): Promise<{ success: boolean; mediaId?: string; error?: string }> {
        try {
            console.log(`📸 Instagram: Publishing image ${image.id}...`);

            // VALIDAR SESIÓN ANTES DE PUBLICAR
            if (!this.sessionValid) {
                throw new Error("Sesión no válida. NO reintentar login automáticamente.");
            }

            if (!this.isConnected) {
                throw new Error("Instagram no conectado. Verificar sesión.");
            }

            // Human-like delay antes de publicar
            await new Promise(resolve => setTimeout(resolve, 3000));

            const caption = image.caption || image.prompt;

            // Handle Carousel
            if (image.isCarousel && image.imagePaths) {
                const paths = typeof image.imagePaths === 'string' 
                    ? JSON.parse(image.imagePaths) 
                    : image.imagePaths;
                
                const carouselItems = [];
                for (const itemPath of paths) {
                    const fullPath = path.join(process.cwd(), 'client', itemPath);
                    if (fs.existsSync(fullPath)) {
                        carouselItems.push(fs.readFileSync(fullPath));
                    }
                }
                
                if (carouselItems.length > 0) {
                    const publishResult = await ig.publish.album({
                        items: carouselItems.map(buffer => ({ file: buffer })),
                        caption: caption
                    });
                    
                    return {
                        success: true,
                        mediaId: publishResult.media.pk.toString()
                    };
                }
            }

            // Read image file
            const imagePath = path.join(process.cwd(), 'client', image.imagePath);
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            const imageBuffer = fs.readFileSync(imagePath);

            // Upload and publish
            const publishResult = await ig.publish.photo({
                file: imageBuffer,
                caption: caption
            });

            const mediaId = publishResult.media.pk;
            console.log(`✅ Instagram: Published successfully (Media ID: ${mediaId})`);

            return {
                success: true,
                mediaId: mediaId.toString()
            };

        } catch (error) {
            console.error(`❌ Instagram: Publication failed for image ${image.id}:`, error);
            
            // NUNCA reintentar login automáticamente
            if (error instanceof Error && (error.message.includes('login') || error.message.includes('auth') || error.message.includes('Sesión no válida'))) {
                this.isConnected = false;
                this.sessionValid = false;
                console.log('🔌 Instagram: Session invalidated - NO reintentando login automáticamente');
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get current connection status
     */
    static getConnectionStatus(): { connected: boolean; error: string | null; sessionValid: boolean } {
        return {
            connected: this.isConnected,
            error: this.connectionError,
            sessionValid: this.sessionValid
        };
    }

    /**
     * Perform fresh login - SOLO USAR MANUALMENTE
     */
    static async performFreshLogin(): Promise<boolean> {
        try {
            // Clear existing session
            if (fs.existsSync(SESSION_PATH)) {
                fs.unlinkSync(SESSION_PATH);
                console.log('🗑️ Instagram: Old session deleted');
            }

            // Reset state
            ig.state.generateDevice(process.env.INSTAGRAM_USERNAME || '');
            this.isConnected = false;
            this.connectionError = null;
            this.sessionInitialized = false;
            this.sessionValid = false;

            // Perform PRO login
            return await this.proLogin();
            
        } catch (error) {
            console.error('❌ Instagram: Fresh login failed:', error);
            return false;
        }
    }

    /**
     * Force logout and clear session - SOLO CUANDO SEA NECESARIO
     */
    static async logout() {
        try {
            // Clear session file
            if (fs.existsSync(SESSION_PATH)) {
                fs.unlinkSync(SESSION_PATH);
                console.log('🗑️ Instagram: Session file deleted');
            }

            // Reset state
            ig.state.generateDevice(process.env.INSTAGRAM_USERNAME || '');
            this.isConnected = false;
            this.connectionError = null;
            this.sessionInitialized = false;
            this.sessionValid = false;

            console.log('👋 Instagram: Logged out successfully');
        } catch (error) {
            console.warn('⚠️ Instagram: Error during logout:', error);
        }
    }
}
