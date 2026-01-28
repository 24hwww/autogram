import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGenerateImage, useLimits } from "@/hooks/use-images";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Clock } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  caption: z.string().optional(),
  autoSchedule: z.boolean().default(false),
  scheduleAt: z.string().optional(),
  scheduleInterval: z.string().optional(),
  isCarousel: z.boolean().default(false),
  imageCount: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const INTERVAL_OPTIONS = [
  { label: "15 Minutes", value: "15" },
  { label: "30 Minutes", value: "30" },
  { label: "1 Hour", value: "60" },
  { label: "8 Hours", value: "480" },
  { label: "24 Hours", value: "1440" },
];

const CAROUSEL_COUNT_OPTIONS = [
  { label: "2 Images", value: "2" },
  { label: "3 Images", value: "3" },
  { label: "4 Images", value: "4" },
  { label: "5 Images", value: "5" },
];

export function CreateImageForm() {
  const generate = useGenerateImage();
  const { data: limits } = useLimits();
  const [isExpanded, setIsExpanded] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      caption: "",
      autoSchedule: false,
      scheduleInterval: "60",
      isCarousel: false,
      imageCount: "2",
    },
  });

  const isLimitReached = (limits?.remaining || 0) < (form.watch("isCarousel") ? parseInt(form.watch("imageCount") || "2") : 1);

  function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      scheduleInterval: data.scheduleInterval ? parseInt(data.scheduleInterval) : undefined,
      imageCount: data.isCarousel ? parseInt(data.imageCount || "2") : 1,
    };
    generate.mutate(payload, {
      onSuccess: () => {
        form.reset();
        setIsExpanded(false);
      },
    });
  }

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Create New Post
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image Prompt</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the image you want to generate..."
                    className="min-h-[100px] resize-none bg-background/50 border-input focus:border-primary transition-colors text-lg"
                    {...field}
                    onFocus={() => setIsExpanded(true)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isExpanded && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <FormField
                control={form.control}
                name="caption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Caption (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a catchy caption..." {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="autoSchedule"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto-Publish</FormLabel>
                        <FormDescription>
                          Publish automatically
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isCarousel"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Carousel (Album)</FormLabel>
                        <FormDescription>
                          Create multiple images
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("isCarousel") && (
                  <FormField
                    control={form.control}
                    name="imageCount"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-center rounded-lg border p-4 bg-background/30">
                        <FormLabel className="flex items-center gap-2 mb-2">
                          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                          Image Count
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-none">
                              <SelectValue placeholder="Count" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CAROUSEL_COUNT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("autoSchedule") && (
                  <FormField
                    control={form.control}
                    name="scheduleInterval"
                    render={({ field }) => (
                      <FormItem className="flex flex-col justify-center rounded-lg border p-4 bg-background/30">
                        <FormLabel className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          Publish Every...
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50 border-none">
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INTERVAL_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {form.watch("autoSchedule") && !form.watch("scheduleInterval") && (
                <FormField
                  control={form.control}
                  name="scheduleAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Schedule Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} className="bg-background/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button 
                type="submit" 
                className="w-full btn-gradient py-6 text-lg"
                disabled={generate.isPending || isLimitReached}
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Magic...
                  </>
                ) : isLimitReached ? (
                  "Daily Limit Reached"
                ) : (
                  "Generate & Schedule"
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
