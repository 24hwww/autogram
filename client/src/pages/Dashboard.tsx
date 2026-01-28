import { useImages, useLimits } from "@/hooks/use-images";
import { useAuth } from "@/hooks/use-auth";
import { ImageCard } from "@/components/ImageCard";
import { CreateImageForm } from "@/components/CreateImageForm";
import { LimitCounter } from "@/components/LimitCounter";
import { motion } from "framer-motion";
import { Instagram, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: images, isLoading } = useImages();
  const { data: limits } = useLimits();
  useAuth();
  const [view, setView] = useState<'grid' | 'list'>('grid');

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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar: Create & Stats */}
          <aside className="lg:col-span-1 space-y-8 lg:sticky lg:top-8 self-start">
            <div className="flex items-center gap-2 mb-6 text-gradient">
              <Instagram className="w-6 h-6 text-primary" />
              <span className="font-display font-bold text-2xl tracking-tight">
                AutoGram {limits?.instagramUsername ? `/ ${limits.instagramUsername}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 px-1 mb-8">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                limits?.instagramConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              )} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Instagram Status: {limits?.instagramConnected ? (
                  <span className="text-green-500">Connected</span>
                ) : (
                  <>
                    <span className="text-red-500">Disconnected</span>
                    {limits?.instagramError && (
                      <p className="normal-case text-[10px] text-red-400/80 mt-1 font-mono break-all leading-tight">
                        Reason: {limits.instagramError}
                      </p>
                    )}
                  </>
                )}
              </span>
            </div>

            <CreateImageForm />
            <LimitCounter />
          </aside>

          {/* Main Content: Gallery Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold tracking-tight">Your Gallery</h2>
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
            </div>

            {sortedImages.length === 0 ? (
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
          </div>
        </div>
      </main>
    </div>
  );
}
