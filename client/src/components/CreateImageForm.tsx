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
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

const formSchema = z.object({
  prompt: z.string().min(3, "Prompt is required"),
  caption: z.string().optional(),
  autoSchedule: z.boolean().default(false),
  scheduleAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
    },
  });

  const isLimitReached = limits?.remaining === 0;

  function onSubmit(data: FormValues) {
    generate.mutate(data, {
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

              <FormField
                control={form.control}
                name="autoSchedule"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-Schedule</FormLabel>
                      <FormDescription>
                        Automatically schedule for optimal time
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

              {form.watch("autoSchedule") && (
                <FormField
                  control={form.control}
                  name="scheduleAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule Time</FormLabel>
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
                  "Generate & Create"
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
