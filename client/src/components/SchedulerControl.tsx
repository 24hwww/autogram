import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, Clock, Zap, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const INTERVAL_OPTIONS = [
  { label: "1 Minute", value: 60000 },
  { label: "5 Minutes", value: 300000 },
  { label: "15 Minutes", value: 900000 },
  { label: "30 Minutes", value: 1800000 },
  { label: "1 Hour", value: 3600000 },
  { label: "2 Hours", value: 7200000 },
  { label: "4 Hours", value: 14400000 },
  { label: "8 Hours", value: 28800000 },
  { label: "24 Hours", value: 86400000 },
];

export function SchedulerControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedInterval, setSelectedInterval] = useState(60000);

  const { data: status, isLoading } = useQuery({
    queryKey: [api.scheduler.status.path],
    queryFn: async () => {
      const res = await fetch(api.scheduler.status.path);
      if (!res.ok) throw new Error("Failed to get scheduler status");
      return api.scheduler.status.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateInterval = useMutation({
    mutationFn: async (interval: number) => {
      const res = await fetch(api.scheduler.updateInterval.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      if (!res.ok) throw new Error("Failed to update interval");
      return api.scheduler.updateInterval.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.scheduler.status.path] });
      toast({
        title: "Scheduler Updated",
        description: "Interval updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    },
  });

  const triggerScheduler = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.scheduler.trigger.path, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to trigger scheduler");
      return api.scheduler.trigger.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.scheduler.status.path] });
      queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
      toast({
        title: "Scheduler Triggered",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Trigger Failed",
        description: error.message,
      });
    },
  });

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value);
    setSelectedInterval(interval);
    updateInterval.mutate(interval);
  };

  const formatInterval = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const formatNextRun = (nextRun?: string) => {
    if (!nextRun) return "Not scheduled";
    const date = new Date(nextRun);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return "Any moment";
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Less than 1 min";
    if (minutes < 60) return `In ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `In ${hours}h ${minutes % 60}min`;
    
    const days = Math.floor(hours / 24);
    return `In ${days}d ${hours % 24}h`;
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Scheduler Control</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Scheduler Control</CardTitle>
          </div>
          <Badge variant={status?.running ? "default" : "secondary"}>
            {status?.running ? (
              <>
                <Play className="w-3 h-3 mr-1" />
                Running
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 mr-1" />
                Stopped
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          Auto-publish scheduled content at intervals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-muted-foreground text-xs mb-1">Interval</div>
            <div className="font-medium">{status ? formatInterval(status.interval) : "Unknown"}</div>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <div className="text-muted-foreground text-xs mb-1">Next Run</div>
            <div className="font-medium">{formatNextRun(status?.nextRun)}</div>
          </div>
        </div>

        {/* Scheduled Count */}
        <div className="bg-background/50 rounded-lg p-3">
          <div className="text-muted-foreground text-xs mb-1">Scheduled Posts</div>
          <div className="font-medium text-lg">{status?.scheduledCount || 0} posts</div>
        </div>

        {/* Interval Control */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Update Interval</Label>
          <Select 
            value={selectedInterval.toString()} 
            onValueChange={handleIntervalChange}
            disabled={updateInterval.isPending}
          >
            <SelectTrigger className="bg-background/50 border-none">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manual Trigger */}
        <Button
          onClick={() => triggerScheduler.mutate()}
          disabled={triggerScheduler.isPending || (status?.scheduledCount || 0) === 0}
          variant="outline"
          className="w-full"
        >
          {triggerScheduler.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Triggering...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Now ({status?.scheduledCount || 0} scheduled)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
