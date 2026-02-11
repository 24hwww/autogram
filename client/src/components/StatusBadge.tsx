import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle, CalendarClock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as 'pending' | 'scheduled' | 'published' | 'failed';

  const styles = {
    pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/25",
    scheduled: "bg-blue-500/15 text-blue-500 border-blue-500/20 hover:bg-blue-500/25",
    published: "bg-green-500/15 text-green-500 border-green-500/20 hover:bg-green-500/25",
    failed: "bg-red-500/15 text-red-500 border-red-500/20 hover:bg-red-500/25",
  };

  const icons = {
    pending: Clock,
    scheduled: CalendarClock,
    published: CheckCircle2,
    failed: AlertCircle,
  };

  const Icon = icons[normalizedStatus] || AlertCircle;
  const currentStyle = styles[normalizedStatus] || "bg-muted text-muted-foreground border-border";
  const label = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-3 py-1 transition-colors", currentStyle, className)}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Badge>
  );
}
