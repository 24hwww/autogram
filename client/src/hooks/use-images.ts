import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type GenerateImageRequest, type ScheduleImageRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useImages() {
  return useQuery({
    queryKey: [api.images.list.path],
    queryFn: async () => {
      const res = await fetch(api.images.list.path);
      if (!res.ok) throw new Error("Failed to fetch images");
      return api.images.list.responses[200].parse(await res.json());
    },
  });
}

export function useLimits() {
  return useQuery({
    queryKey: [api.limits.get.path],
    queryFn: async () => {
      const res = await fetch(api.limits.get.path);
      if (!res.ok) throw new Error("Failed to fetch limits");
      return api.limits.get.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useGenerateImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: GenerateImageRequest) => {
      const res = await fetch(api.images.generate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Daily limit reached");
        }
        const error = await res.json();
        throw new Error(error.message || "Failed to generate image");
      }
      
      return api.images.generate.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.limits.get.path] });
      toast({
        title: "Success",
        description: "Image generation started",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}

export function usePublishImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.images.publish.path, { id });
      const res = await fetch(url, { method: "POST" });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to publish");
      }
      
      return api.images.publish.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
      toast({
        title: "Published",
        description: "Image is now live on Instagram",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Publish Failed",
        description: error.message,
      });
    },
  });
}

export function useScheduleImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number } & ScheduleImageRequest) => {
      const url = buildUrl(api.images.schedule.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      
      if (!res.ok) throw new Error("Failed to schedule");
      
      return api.images.schedule.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
      toast({
        title: "Scheduled",
        description: "Image has been added to the queue",
      });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.images.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
      toast({
        description: "Image deleted successfully",
      });
    },
  });
}
