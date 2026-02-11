import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import { verifySync, generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

const MemoryStore = MemoryStoreFactory(session);

export function setupAuth(app: Express) {
    const sessionSecret = process.env.SESSION_SECRET || process.env.REPL_ID;
    if (app.get("env") === "production" && !sessionSecret) {
        throw new Error("SESSION_SECRET must be set in production");
    }

    const sessionSettings: session.SessionOptions = {
        secret: sessionSecret || "autogram-dev-secret",
        resave: false,
        saveUninitialized: false,
        store: new MemoryStore({
            checkPeriod: 86400000,
        }),
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: "lax",
        },
    };

    if (app.get("env") === "production") {
        app.set("trust proxy", 1);
    }

    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(
        new LocalStrategy(
            { usernameField: "email", passwordField: "password" },
            async (email, password, done) => {
                console.log(`Login attempt for: ${email}`);
                if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
                    console.error("ADMIN_EMAIL or ADMIN_PASSWORD not set in .env");
                    return done(new Error("Admin credentials not configured"), false);
                }
                if (
                    email === process.env.ADMIN_EMAIL &&
                    password === process.env.ADMIN_PASSWORD
                ) {
                    console.log("Login success");
                    return done(null, { email: process.env.ADMIN_EMAIL });
                }
                console.log("Login failed: Invalid credentials");
                return done(null, false, { message: "Invalid credentials" });
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.email);
    });

    passport.deserializeUser((email: string, done) => {
        if (email === process.env.ADMIN_EMAIL) {
            done(null, { email });
        } else {
            done(null, null);
        }
    });

    // Auth Routes
    app.post("/api/login", (req, res, next) => {
        passport.authenticate("local", (err: any, user: any, info: any) => {
            if (err) return next(err);
            if (!user) return res.status(401).json({ message: info.message });

            req.login(user, (err) => {
                if (err) return next(err);

                // Check if 2FA is needed
                const needs2FA = !!process.env.ADMIN_2FA_SECRET;
                res.json({
                    message: "Login successful",
                    needs2FA,
                    user: { email: user.email }
                });
            });
        })(req, res, next);
    });

    app.post("/api/verify-2fa", async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const { code } = req.body;
        const secret = process.env.ADMIN_2FA_SECRET;

        if (!secret) {
            return res.status(400).json({ message: "2FA not configured" });
        }

        try {
            const isValid = verifySync({
                token: code,
                secret: secret,
                digits: 6,
                period: 30
            });

            if (isValid) {
                (req.session as any).is2FAVerified = true;
                res.json({ message: "2FA verified" });
            } else {
                res.status(401).json({ message: "Invalid 2FA code" });
            }
        } catch (error: any) {
            console.error("2FA Verification Error:", error.message);
            res.status(500).json({ message: "Failed to verify 2FA code. Check if secret is valid Base32." });
        }
    });

    app.get("/api/user", (req, res) => {
        if (req.isAuthenticated()) {
            res.json({
                user: req.user,
                is2FAVerified: (req.session as any).is2FAVerified || !process.env.ADMIN_2FA_SECRET
            });
        } else {
            res.status(401).json({ message: "Not authenticated" });
        }
    });

    app.post("/api/logout", (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.json({ message: "Logout successful" });
        });
    });

    // Helper to generate QR Code for setup (only for development/setup)
    app.get("/api/auth/setup-2fa", requireAuth, async (req, res) => {
        // Generate a valid BASE32 secret if not present or invalid
        let secret = process.env.ADMIN_2FA_SECRET;
        const isConfigured = !!secret;

        if (!isConfigured) {
            secret = generateSecret(); // This returns a valid Base32 secret
        }

        try {
            const otpauth = generateURI({
                issuer: "AutoGram",
                label: process.env.ADMIN_EMAIL || "admin",
                secret: secret!,
                digits: 6,
                period: 30
            });

            const qrCodeUrl = await QRCode.toDataURL(otpauth);
            res.send(`
                <div style="font-family: sans-serif; text-align: center; padding: 2rem;">
                    <h1>2FA Setup</h1>
                    <img src="${qrCodeUrl}" style="margin: 2rem auto; display: block;" />
                    <p>1. Scan this QR with Google Authenticator / Authy</p>
                    <p>2. Copy this secret to your <b>.env</b> file:</p>
                    <code style="background: #eee; padding: 1rem; display: block; font-size: 1.5rem; margin: 1rem;">
                        ADMIN_2FA_SECRET=${secret}
                    </code>
                    ${isConfigured ? '<p style="color: green;">✓ Secret currently loaded from .env</p>' : '<p style="color: orange;">⚠ New secret generated. Save it to .env!</p>'}
                </div>
            `);
        } catch (err: any) {
            res.status(500).send("Error generating 2FA setup: " + err.message);
        }
    });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        const needs2FA = !!process.env.ADMIN_2FA_SECRET;
        const is2FAVerified = (req.session as any).is2FAVerified;

        if (!needs2FA || is2FAVerified) {
            return next();
        }
        return res.status(403).json({ message: "2FA required" });
    }
    res.status(401).json({ message: "Unauthorized" });
}
