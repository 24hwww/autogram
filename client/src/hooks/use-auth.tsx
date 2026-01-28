import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type User = {
    email: string;
};

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    is2FAVerified: boolean;
    login: (data: any) => Promise<any>;
    verify2FA: (code: string) => Promise<any>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["/api/user"],
        queryFn: async () => {
            const res = await fetch("/api/user");
            if (!res.ok) return null;
            const text = await res.text();
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (e) {
                return null;
            }
        },
        retry: false,
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: any) => {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(credentials),
            });
            if (!res.ok) {
                let message = "Login failed";
                try {
                    const err = await res.json();
                    message = err.message || message;
                } catch (e) { }
                throw new Error(message);
            }
            const text = await res.text();
            return text ? JSON.parse(text) : {};
        },
        onSuccess: () => refetch(),
        onError: (err: Error) => {
            toast({
                variant: "destructive",
                title: "Login Error",
                description: err.message,
            });
        },
    });

    const verify2FAMutation = useMutation({
        mutationFn: async (code: string) => {
            const res = await fetch("/api/verify-2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            if (!res.ok) {
                let message = "Verification failed";
                try {
                    const err = await res.json();
                    message = err.message || message;
                } catch (e) { }
                throw new Error(message);
            }
            const text = await res.text();
            return text ? JSON.parse(text) : {};
        },
        onSuccess: () => refetch(),
        onError: (err: Error) => {
            toast({
                variant: "destructive",
                title: "2FA Error",
                description: err.message,
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await fetch("/api/logout", { method: "POST" });
        },
        onSuccess: () => refetch(),
    });

    const user = data?.user || null;
    const is2FAVerified = data?.is2FAVerified || false;

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            is2FAVerified,
            login: loginMutation.mutateAsync,
            verify2FA: verify2FAMutation.mutateAsync,
            logout: () => logoutMutation.mutate()
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
