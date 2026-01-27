import { useLimits } from "@/hooks/use-images";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

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
          <p className="text-xs text-muted-foreground text-center">
            {isFull 
              ? "You've reached your daily limit. Try again tomorrow!" 
              : "Generations reset daily at midnight UTC"}
          </p>
        </div>
      </div>
    </div>
  );
}
