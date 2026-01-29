import { type ImageModel } from "@shared/types";
import { usePublishImage, useDeleteImage, useScheduleImage } from "@/hooks/use-images";
import { StatusBadge } from "./StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trash2, Send, MoreVertical, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageCardProps {
  image: ImageModel;
}

export function ImageCard({ image }: ImageCardProps) {
  const publish = usePublishImage();
  const remove = useDeleteImage();
  const schedule = useScheduleImage();
  const [scheduleDate, setScheduleDate] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const handleSchedule = () => {
    if (!scheduleDate) return;
    schedule.mutate(
      { id: image.id, scheduledAt: new Date(scheduleDate).toISOString() },
      { onSuccess: () => setIsScheduleOpen(false) }
    );
  };

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
      {/* Status Overlay */}
      <div className="absolute top-3 left-3 z-20">
        <StatusBadge status={image.status as any} className="bg-black/50 backdrop-blur-md border-white/10" />
      </div>

      {/* Image Display */}
      <div className="aspect-square w-full overflow-hidden bg-muted relative">
        <img 
          src={image.imagePath} 
          alt={image.prompt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <div className="w-full">
            <div className="flex gap-2">
              {image.status !== 'PUBLISHED' && (
                <Button 
                  onClick={() => publish.mutate(image.id)}
                  disabled={publish.isPending}
                  className="flex-1 btn-gradient font-semibold"
                >
                  {publish.isPending ? "Publishing..." : "Publish Now"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground line-clamp-1">{image.prompt}</p>
          {image.caption && (
            <p className="text-xs text-muted-foreground line-clamp-2">{image.caption}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-mono">
            {format(new Date(image.createdAt!), 'MMM d, HH:mm')}
          </p>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Pick a date & time</Label>
                      <Input 
                        type="datetime-local" 
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleSchedule} 
                      disabled={schedule.isPending || !scheduleDate}
                      className="w-full btn-gradient"
                    >
                      {schedule.isPending ? "Scheduling..." : "Confirm Schedule"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {image.instagramMediaId && (
                <DropdownMenuItem disabled>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on IG
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => remove.mutate(image.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
