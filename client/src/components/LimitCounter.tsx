import { useLimits } from "@/hooks/use-images";
import { Progress } from "@/components/ui/progress";
import { Zap, CheckCircle2, XCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LimitCounter() {
  const { data: limits, isLoading } = useLimits();

  if (isLoading || !limits) return null;

  const percentage = (limits.count / limits.limit) * 100;
  const isFull = limits.remaining === 0;

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Daily Generations</p>
              <h3 className="text-2xl font-bold font-display tracking-tight">
                {limits.count} <span className="text-muted-foreground text-lg font-normal">/ {limits.limit}</span>
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Remaining</p>
            <p className={`text-xl font-bold ${isFull ? 'text-destructive' : 'text-foreground'}`}>
              {limits.remaining}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={percentage} className="h-2 bg-secondary" />
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs text-muted-foreground">
              {isFull 
                ? "Limit reached. Reset at midnight UTC" 
                : "Generations reset daily at midnight UTC"}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              Instagram Status
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="hover:text-foreground transition-colors">
                      <Info className="w-3 h-3 cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-[11px]">
                    You can still generate and schedule images. Manual publishing is available once connected.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              {limits.instagramConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-destructive">Disconnected</span>
                </>
              )}
            </div>
          </div>
          
          {!limits.instagramConnected && limits.instagramError && (
            <div className="text-[10px] text-destructive/80 leading-tight bg-destructive/5 p-2 rounded border border-destructive/10">
              <p className="font-semibold mb-0.5">Connection Error:</p>
              {limits.instagramError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
