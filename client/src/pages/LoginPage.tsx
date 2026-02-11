import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Instagram, Loader2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const { user, login, verify2FA, is2FAVerified } = useAuth();
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [step, setStep] = useState<"login" | "2fa">("login");

    if (user && is2FAVerified) {
        setLocation("/");
        return null;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            const result = await login({ email, password });
            if (result.needs2FA) {
                setStep("2fa");
            } else {
                setLocation("/");
            }
        } catch (err) {
            // Toast handled by mutation
        } finally {
            setIsPending(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            await verify2FA(code);
            setLocation("/");
        } catch (err) {
            // Toast handled by mutation
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="flex flex-col items-center gap-2 mb-8 text-gradient">
                    <Instagram className="w-12 h-12 text-primary" />
                    <h1 className="font-display font-bold text-4xl tracking-tight">AutoGram</h1>
                    <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Admin Access</p>
                </div>

                <Card className="glass-panel border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-blue-500" />

                    <AnimatePresence mode="wait">
                        {step === "login" ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardHeader>
                                    <CardTitle className="text-2xl font-display font-bold">Welcome Back</CardTitle>
                                    <CardDescription>Enter your credentials to access the console.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="admin@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full btn-gradient py-6 text-lg" disabled={isPending}>
                                            {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Sign In"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="2fa"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardHeader>
                                    <CardTitle className="text-2xl font-display font-bold flex items-center gap-2">
                                        <KeyRound className="w-6 h-6 text-accent" />
                                        Two-Factor Auth
                                    </CardTitle>
                                    <CardDescription>Enter the code from your Authenticator app.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleVerify2FA} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="code">Authenticator Code</Label>
                                            <Input
                                                id="code"
                                                placeholder="000 000"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                required
                                                className="bg-background/50 text-center text-3xl tracking-[0.5em] font-mono py-8"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </div>
                                        <Button type="submit" className="w-full btn-gradient py-6 text-lg" disabled={isPending}>
                                            {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Verify Code"}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full text-muted-foreground"
                                            onClick={() => setStep("login")}
                                        >
                                            Back to login
                                        </Button>
                                    </form>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
        </div>
    );
}
