import { useImages, useInstagramLogin, useInstagramProcessPending, useLimits } from "@/hooks/use-images";
// import { useAuth } from "@/hooks/use-auth"; // Comentado - no requerimos autenticación
import { useWebSocket } from "@/hooks/use-websocket";
import { ImageCard } from "@/components/ImageCard";
import { AutoGenerator } from "@/components/AutoGenerator";
import { SchedulerControl } from "@/components/SchedulerControl";
import { LimitCounter } from "@/components/LimitCounter";
import { ProfileManager } from "@/components/ProfileManager";
import { motion } from "framer-motion";
import { Instagram, LayoutGrid, List, Sparkles, Menu, X, User, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMutationState } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ImageSkeleton() {
  return (
    <div className="card-gradient rounded-3xl overflow-hidden animate-pulse border border-primary/20">
      <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
        <Sparkles className="w-12 h-12 text-primary/20 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
      </div>
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-3/4 bg-primary/10" />
        <Skeleton className="h-3 w-1/2 bg-muted/20" />
        <div className="pt-4 border-t border-border/50 flex justify-between">
          <Skeleton className="h-3 w-20 bg-muted/20" />
          <Skeleton className="h-3 w-8 bg-muted/20" />
        </div>
      </div>
    </div>
  );
}

function InstagramConnectionIndicator({
  connected,
  error,
  onDisconnectedClick,
}: {
  connected?: boolean;
  error?: string;
  onDisconnectedClick?: () => void;
}) {
  const disconnected = !connected;
  const className = cn(
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
    connected
      ? "border-green-500/30 bg-green-500/10 text-green-500"
      : "border-destructive/30 bg-destructive/10 text-destructive",
    disconnected ? "cursor-pointer transition hover:opacity-85" : undefined,
  );

  if (disconnected && onDisconnectedClick) {
    return (
      <button
        type="button"
        className={className}
        title={error || "Click to connect Instagram"}
        onClick={onDisconnectedClick}
      >
        <XCircle className="h-3.5 w-3.5" />
        <span>Instagram Desconectado</span>
      </button>
    );
  }

  return (
    <div className={className} title={!connected && error ? error : undefined}>
      {connected ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      <span>Instagram {connected ? "Conectado" : "Desconectado"}</span>
    </div>
  );
}

export default function Dashboard() {
  useWebSocket();
  const { data: images, isLoading } = useImages();
  const { data: limits } = useLimits();
  // Track active generation mutations
  const generatingCount = useMutationState({
    filters: { status: 'pending' },
    select: (mutation) => mutation.options.mutationKey?.[0] === 'generateImage',
  }).filter(Boolean).length;

  // useAuth(); // Comentado - no requerimos autenticación
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'profiles'>('gallery');
  const [instagramModalOpen, setInstagramModalOpen] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState("");
  const [instagramPassword, setInstagramPassword] = useState("");
  const instagramLogin = useInstagramLogin();
  const instagramProcessPending = useInstagramProcessPending();
  const isInstagramSubmitting = instagramLogin.isPending || instagramProcessPending.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const sortedImages = images ? [...images].sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  ) : [];

  const handleInstagramConnect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await instagramLogin.mutateAsync({
        username: instagramUsername.trim(),
        password: instagramPassword,
      });
      await instagramProcessPending.mutateAsync();
      setInstagramPassword("");
      setInstagramModalOpen(false);
    } catch {
      // Errors are surfaced by mutation toasts.
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Dialog open={instagramModalOpen} onOpenChange={setInstagramModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar cuenta de Instagram</DialogTitle>
            <DialogDescription>
              Ingresa usuario y contraseña para iniciar sesión manualmente. La sesión se guarda para reutilizarla y reducir bloqueos/restricciones.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleInstagramConnect}>
            <div className="space-y-2">
              <Label htmlFor="instagram-username">Usuario</Label>
              <Input
                id="instagram-username"
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value)}
                placeholder="tu_usuario"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram-password">Contraseña</Label>
              <Input
                id="instagram-password"
                type="password"
                value={instagramPassword}
                onChange={(e) => setInstagramPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInstagramModalOpen(false)}
                disabled={isInstagramSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isInstagramSubmitting}>
                {isInstagramSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-primary" />
          <span className="font-display font-bold text-lg tracking-tight">
            AutoGram {limits?.instagramUsername ? `/ ${limits.instagramUsername}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <InstagramConnectionIndicator
            connected={limits?.instagramConnected}
            error={limits?.instagramError}
            onDisconnectedClick={() => setInstagramModalOpen(true)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-80 bg-background border-r border-border/60 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Instagram className="w-6 h-6 text-primary" />
                  <span className="font-display font-bold text-xl tracking-tight">
                    AutoGram
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                <AutoGenerator />
                <SchedulerControl />
                <LimitCounter />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-8 lg:sticky lg:top-8 self-start">
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 text-gradient">
                <Instagram className="w-6 h-6 text-primary" />
                <span className="font-display font-bold text-2xl tracking-tight">
                  AutoGram {limits?.instagramUsername ? `/ ${limits.instagramUsername}` : ''}
                </span>
              </div>
              <InstagramConnectionIndicator
                connected={limits?.instagramConnected}
                error={limits?.instagramError}
                onDisconnectedClick={() => setInstagramModalOpen(true)}
              />
            </div>

            <AutoGenerator />
            <SchedulerControl />
            <LimitCounter />
          </aside>

          {/* Main Content: Gallery Section */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'gallery' | 'profiles')}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="gallery" className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    Gallery
                  </TabsTrigger>
                  <TabsTrigger value="profiles" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profiles
                  </TabsTrigger>
                </TabsList>
                
                {activeTab === 'gallery' && (
                  <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView('grid')}
                      className={cn("h-8 px-2", view === 'grid' && "bg-background shadow-sm")}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView('list')}
                      className={cn("h-8 px-2", view === 'list' && "bg-background shadow-sm")}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <TabsContent value="profiles" className="mt-6">
                <ProfileManager />
              </TabsContent>

              <TabsContent value="gallery" className="mt-6">
                {sortedImages.length === 0 && generatingCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed border-muted rounded-3xl bg-card/30">
                    <div className="p-4 bg-muted/50 rounded-full">
                      <LayoutGrid className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium">No images yet</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        Start by typing a prompt in the sidebar to generate your first masterpiece.
                      </p>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    layout
                    className={cn(
                      "grid gap-6",
                      view === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1"
                    )}
                  >
                    {/* Render skeletons for generating images */}
                    {Array.from({ length: generatingCount }).map((_, i) => (
                      <motion.div
                        key={`skeleton-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ImageSkeleton />
                      </motion.div>
                    ))}

                    {sortedImages.map((image) => (
                      <motion.div
                        key={image.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ImageCard image={image} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
