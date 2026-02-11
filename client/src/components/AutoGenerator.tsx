import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Zap, Clock, Palette } from "lucide-react";
import { useGeneratePrompt, useGenerateFull } from "@/hooks/use-images";

const CONTENT_TYPES = [
  { label: "Auto (Smart)", value: "auto" },
  { label: "Image", value: "image" },
  { label: "Verse", value: "verse" },
];

const TIME_OF_DAY = [
  { label: "Auto (Current)", value: "auto" },
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" },
];

const THEMES = [
  { label: "Auto (Smart)", value: "auto" },
  { label: "Fitness", value: "fitness" },
  { label: "Wellness", value: "wellness" },
  { label: "Motivation", value: "motivation" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Spiritual", value: "spiritual" },
  { label: "Coffee", value: "coffee" },
  { label: "Nature", value: "nature" },
  { label: "Reading", value: "reading" },
];

export function AutoGenerator() {
  const [theme, setTheme] = useState("auto");
  const [timeOfDay, setTimeOfDay] = useState("auto");
  const [contentType, setContentType] = useState<"image" | "verse" | "auto">("auto");
  const [autoPublish, setAutoPublish] = useState(false);
  
  const generatePrompt = useGeneratePrompt();
  const generateFull = useGenerateFull();

  const handleGeneratePrompt = () => {
    generatePrompt.mutate({
      theme: theme !== "auto" ? theme : undefined,
      timeOfDay: timeOfDay !== "auto" ? timeOfDay : undefined,
      contentType: contentType !== "auto" ? contentType as 'image' | 'verse' : undefined,
    });
  };

  const handleGenerateFull = () => {
    generateFull.mutate({
      theme: theme !== "auto" ? theme : undefined,
      timeOfDay: timeOfDay !== "auto" ? timeOfDay : undefined,
      contentType: contentType !== "auto" ? contentType as 'image' | 'verse' : undefined,
      autoPublish,
    });
  };

  const isLoading = generatePrompt.isPending || generateFull.isPending;

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">AI Auto-Generator</CardTitle>
        </div>
        <CardDescription>
          Generate prompts and full posts with AI (Llama + HuggingFace)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content Type */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Content Type</Label>
          <Select value={contentType} onValueChange={(value: "image" | "verse" | "auto") => setContentType(value)}>
            <SelectTrigger className="bg-background/50 border-none">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="bg-background/50 border-none">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map((theme) => (
                <SelectItem key={theme.value} value={theme.value}>
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time of Day */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Time of Day</Label>
          <Select value={timeOfDay} onValueChange={setTimeOfDay}>
            <SelectTrigger className="bg-background/50 border-none">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OF_DAY.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto Publish */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-background/30">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Auto Publish
            </Label>
            <p className="text-xs text-muted-foreground">
              Generate and publish immediately
            </p>
          </div>
          <Switch
            checked={autoPublish}
            onCheckedChange={setAutoPublish}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleGeneratePrompt}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {generatePrompt.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Prompt...
              </>
            ) : (
              <>
                <Palette className="mr-2 h-4 w-4" />
                Generate Prompt Only
              </>
            )}
          </Button>

          <Button
            onClick={handleGenerateFull}
            disabled={isLoading}
            className="w-full btn-gradient"
          >
            {generateFull.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {autoPublish ? "Generating & Publishing..." : "Generating..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {autoPublish ? "Generate & Publish" : "Generate Full Post"}
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        {contentType && contentType !== "auto" && (
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={contentType === 'verse' ? 'secondary' : 'default'}>
              {contentType === 'verse' ? '📜 Verse Mode' : '🖼️ Image Mode'}
            </Badge>
            {autoPublish && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                <Clock className="w-3 h-3 mr-1" />
                Auto-Publish
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
