import { IgApiClient } from 'instagram-private-api';
import { type ImageModel } from '@shared/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CookieJar } from 'tough-cookie';

const baseDir = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Session storage path
const SESSION_PATH = path.join(baseDir, '../../data/instagram-session.json');

// Singleton instance - UNA SOLA INSTANCIA POR CUENTA
const ig = new IgApiClient();

type CookieInput = {
    name: string;
    value: string;
    domain: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expires?: number;
};

function normalizeCookieInput(raw: unknown): CookieInput[] {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : (raw as { cookies?: CookieInput[] }).cookies;
    if (!Array.isArray(list)) return [];
    return list.filter((item) => item?.name && item?.value && item?.domain);
}

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
                
                // Human-like activity check instead of full login
                try {
                    await ig.user.info(ig.state.cookieUserId);
                    this.isConnected = true;
                } catch (e) {
                    console.log('🔍 Instagram: Loaded session seems expired, will need manual login');
                    this.isConnected = false;
                }
                
                this.sessionValid = true;
                this.sessionInitialized = true;
                console.log('✅ Instagram: Session processing completed');
                return true;
            }

            console.log('📝 Instagram: No existing session found');

            if (process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD) {
                console.log('🔑 Instagram: Attempting automatic login...');
                await this.proLogin(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
                this.sessionInitialized = true;
                this.sessionValid = true;
                return true;
            }

            this.sessionValid = false;
            this.sessionInitialized = true;
            return false;

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
     * Perform login with provided credentials (dashboard form)
     */
    static async loginWithCredentials(username: string, password: string): Promise<boolean> {
        if (!username || !password) {
            throw new Error("Instagram username/password required");
        }

        process.env.INSTAGRAM_USERNAME = username;
        process.env.INSTAGRAM_PASSWORD = password;

        // Clear existing session
        if (fs.existsSync(SESSION_PATH)) {
            fs.unlinkSync(SESSION_PATH);
            console.log('🗑️ Instagram: Old session deleted');
        }

        // Reset state
        ig.state.generateDevice(username);
        this.isConnected = false;
        this.connectionError = null;
        this.sessionInitialized = false;
        this.sessionValid = false;

        return await this.proLogin(username, password);
    }

    /**
     * Perform login with cookies exported from browser
     */
    static async loginWithCookies(username: string, cookies: unknown): Promise<boolean> {
        if (!username) {
            throw new Error("Instagram username required");
        }

        const cookieList = normalizeCookieInput(cookies);
        if (!cookieList.length) {
            throw new Error("Invalid cookie data");
        }

        process.env.INSTAGRAM_USERNAME = username;

        ig.state.generateDevice(username);

        const jar = new CookieJar();
        for (const cookie of cookieList) {
            const protocol = cookie.secure ? "https" : "http";
            const domain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
            const cookieUrl = `${protocol}://${domain}${cookie.path || "/"}`;
            const cookieString = `${cookie.name}=${cookie.value}`;
            await jar.setCookie(cookieString, cookieUrl);
        }

        (ig.state as unknown as { cookieJar: CookieJar }).cookieJar = jar;

        const user = await ig.account.currentUser();
        console.log('✅ Instagram: Cookie login successful!', user?.username);

        await this.saveSession();
        this.isConnected = true;
        this.connectionError = null;
        this.sessionInitialized = true;
        this.sessionValid = true;

        return true;
    }

    /**
     * PRO Login - UNA SOLA VEZ
     */
    private static async proLogin(username: string, password: string): Promise<boolean> {
        console.log('🔑 Instagram: PRO Login - UNA SOLA VEZ...');
        
        // Generate device
        ig.state.generateDevice(username);
        
        // Human-like delay
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));

        try {
            await ig.simulate.preLoginFlow();
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
            
            // Login único - NUNCA REINTENTAR
            await ig.account.login(username, password);
            
            console.log('✅ Instagram: Login successful!');
            
            process.nextTick(async () => {
                await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));
                await ig.simulate.postLoginFlow();
            });

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
            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));

            const caption = image.caption || image.prompt;

            // Handle Carousel
            if (image.isCarousel && image.imagePaths) {
                const paths = typeof image.imagePaths === 'string' 
                    ? JSON.parse(image.imagePaths) 
                    : image.imagePaths;
                
                const carouselItems = [];
                for (const itemPath of paths) {
                    const fullPath = path.join(process.cwd(), 'client', 'public', itemPath);
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
            const imagePath = path.join(process.cwd(), 'client', 'public', image.imagePath);
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
            if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
                throw new Error("Instagram credentials not found in environment variables");
            }

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
            return await this.proLogin(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
            
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
