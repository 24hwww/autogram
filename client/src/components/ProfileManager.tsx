import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Plus, Edit, Trash2, Save, X, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos básicos para la UI
interface ProfileFormData {
  identity: {
    name: string;
    age: string;
    gender: string;
    nationality: string;
    culturalContext: string;
    languages: {
      primary: string;
      secondary: string[];
    };
    influencerType: string;
    niche: string;
    location: {
      country: string;
      city: string;
    };
    occupation: string;
    education: string;
  };
  forensicDescription: {
    skinTone: {
      base: string;
      undertone: string;
      characteristics: string[];
    };
    facialFeatures: {
      faceShape: string;
      eyes: {
        shape: string;
        color: string;
        size: string;
      };
      eyebrows: {
        thickness: string;
        shape: string;
        color: string;
      };
      nose: {
        shape: string;
        size: string;
      };
      lips: {
        fullness: string;
        shape: string;
        color: string;
      };
      jawline: string;
    };
    hair: {
      color: string;
      length: string;
      texture: string;
      style: string;
      characteristics: string[];
    };
    bodyType: {
      build: string;
      height: string;
      frame: string;
      proportions: string;
    };
    distinctiveFeatures: string[];
    additionalNotes: string;
  };
  psychologicalProfile: {
    predominantMood: string;
    mainInterests: string[];
    coreValues: string[];
    beliefs: {
      spiritual: string;
      philosophical: string;
      political: string;
      lifestyle: string;
    };
    motivations: string[];
    communicationStyle: {
      tone: string;
      vocabulary: string;
      emojiUsage: string;
      hashtags: string;
    };
    energyLevel: string;
    personalityArchetypes: string[];
    fears: string[];
    goals: {
      short_term: string[];
      long_term: string[];
    };
  };
  generationSettings: {
    contentThemes: string[];
    contentFrequency: string;
    optimalPostingTimes: string[];
    visualStyle: {
      aesthetic: string;
      colorPalette: string[];
      filters: string[];
    };
    contentRestrictions: string[];
    brandGuidelines: string;
  };
  isActive: boolean;
}

const initialFormData: ProfileFormData = {
  identity: {
    name: "",
    age: "",
    gender: "",
    nationality: "",
    culturalContext: "",
    languages: {
      primary: "",
      secondary: []
    },
    influencerType: "",
    niche: "",
    location: {
      country: "",
      city: ""
    },
    occupation: "",
    education: ""
  },
  forensicDescription: {
    skinTone: {
      base: "",
      undertone: "",
      characteristics: []
    },
    facialFeatures: {
      faceShape: "",
      eyes: {
        shape: "",
        color: "",
        size: ""
      },
      eyebrows: {
        thickness: "",
        shape: "",
        color: ""
      },
      nose: {
        shape: "",
        size: ""
      },
      lips: {
        fullness: "",
        shape: "",
        color: ""
      },
      jawline: ""
    },
    hair: {
      color: "",
      length: "",
      texture: "",
      style: "",
      characteristics: []
    },
    bodyType: {
      build: "",
      height: "",
      frame: "",
      proportions: ""
    },
    distinctiveFeatures: [],
    additionalNotes: ""
  },
  psychologicalProfile: {
    predominantMood: "",
    mainInterests: [],
    coreValues: [],
    beliefs: {
      spiritual: "",
      philosophical: "",
      political: "",
      lifestyle: ""
    },
    motivations: [],
    communicationStyle: {
      tone: "",
      vocabulary: "",
      emojiUsage: "",
      hashtags: ""
    },
    energyLevel: "",
    personalityArchetypes: [],
    fears: [],
    goals: {
      short_term: [],
      long_term: []
    }
  },
  generationSettings: {
    contentThemes: [],
    contentFrequency: "",
    optimalPostingTimes: [],
    visualStyle: {
      aesthetic: "",
      colorPalette: [],
      filters: []
    },
    contentRestrictions: [],
    brandGuidelines: ""
  },
  isActive: false
};

function ProfileSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileManager() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  
  const queryClient = useQueryClient();

  // Queries
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const response = await fetch("/api/profiles");
      if (!response.ok) throw new Error("Failed to fetch profiles");
      const result = await response.json();
      return result.profiles;
    },
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["activeProfile"],
    queryFn: async () => {
      const response = await fetch("/api/profiles/active");
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      console.log("🔍 ProfileManager: Enviando datos:", JSON.stringify(data, null, 2));
      
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      console.log("🔍 ProfileManager: Response status:", response.status);
      console.log("🔍 ProfileManager: Response headers:", response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ ProfileManager: Error response:", errorText);
        throw new Error(errorText || "Failed to create profile");
      }
      
      const result = await response.json();
      console.log("✅ ProfileManager: Success response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("✅ ProfileManager: Profile created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
      setIsCreating(false);
      // Mantener los datos del formulario después de crear para posible edición
      alert("Profile created successfully!");
    },
    onError: (error) => {
      console.error("❌ ProfileManager: Mutation error:", error);
      alert(`Error: ${error.message}`);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProfileFormData> }) => {
      const response = await fetch(`/api/profiles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
      setEditingProfile(null);
      setIsCreating(false);
      // No resetear formData para mantener los datos actualizados
      alert("Profile updated successfully!");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/profiles/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete profile");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
      alert("Profile deleted successfully!");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/profiles/${id}/activate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to activate profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["activeProfile"] });
      alert("Profile activated successfully!");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const handleCreateProfile = () => {
    createProfileMutation.mutate(formData);
  };

  const handleUpdateProfile = () => {
    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data: formData });
    }
  };

  const handleEditProfile = (profile: any) => {
    setEditingProfile(profile);
    setFormData(profile);
    setIsCreating(true);
  };

  const handleDeleteProfile = (id: number) => {
    if (confirm("Are you sure you want to delete this profile?")) {
      deleteProfileMutation.mutate(id);
    }
  };

  const handleActivateProfile = (id: number) => {
    activateProfileMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingProfile(null);
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    if (editingProfile) {
      // Si estamos editando, restaurar los datos originales del perfil
      setFormData(editingProfile);
      setEditingProfile(null);
      setIsCreating(false);
    } else {
      // Si estamos creando nuevo, resetear completamente
      resetForm();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Manager
        </h3>
        <ProfileSkeleton />
        <ProfileSkeleton />
      </div>
    );
  }

  if (isCreating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {editingProfile ? "Edit Profile" : "Create New Profile"}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="physical">Physical</TabsTrigger>
              <TabsTrigger value="psychological">Psychological</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={formData.identity.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      identity: { ...prev.identity, name: e.target.value }
                    }))}
                    placeholder="Enter profile name"
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.identity.age}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      identity: { ...prev.identity, age: e.target.value }
                    }))}
                    placeholder="Age"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.identity.gender} onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    identity: { ...prev.identity, gender: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non_binary">Non Binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="influencerType">Influencer Type</Label>
                  <Select value={formData.identity.influencerType} onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    identity: { ...prev.identity, influencerType: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="spiritual">Spiritual</SelectItem>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="wellness">Wellness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="niche">Niche</Label>
                <Input
                  id="niche"
                  value={formData.identity.niche}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    identity: { ...prev.identity, niche: e.target.value }
                  }))}
                  placeholder="e.g., Sustainable Fashion, Minimalist Living"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.identity.location.country}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      identity: { 
                        ...prev.identity, 
                        location: { ...prev.identity.location, country: e.target.value }
                      }
                    }))}
                    placeholder="Country"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.identity.location.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      identity: { 
                        ...prev.identity, 
                        location: { ...prev.identity.location, city: e.target.value }
                      }
                    }))}
                    placeholder="City"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="physical" className="space-y-4">
              <div>
                <Label>Skin Tone</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="skinBase">Base Tone</Label>
                    <Select value={formData.forensicDescription.skinTone.base} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      forensicDescription: {
                        ...prev.forensicDescription,
                        skinTone: { ...prev.forensicDescription.skinTone, base: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_fair">Very Fair</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="olive">Olive</SelectItem>
                        <SelectItem value="tan">Tan</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="dark_brown">Dark Brown</SelectItem>
                        <SelectItem value="very_dark">Very Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="skinUndertone">Undertone</Label>
                    <Select value={formData.forensicDescription.skinTone.undertone} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      forensicDescription: {
                        ...prev.forensicDescription,
                        skinTone: { ...prev.forensicDescription.skinTone, undertone: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select undertone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Facial Features</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="faceShape">Face Shape</Label>
                    <Select value={formData.forensicDescription.facialFeatures.faceShape} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      forensicDescription: {
                        ...prev.forensicDescription,
                        facialFeatures: { ...prev.forensicDescription.facialFeatures, faceShape: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select face shape" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oval">Oval</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="heart">Heart</SelectItem>
                        <SelectItem value="diamond">Diamond</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="triangular">Triangular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="eyeColor">Eye Color</Label>
                    <Select value={formData.forensicDescription.facialFeatures.eyes.color} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      forensicDescription: {
                        ...prev.forensicDescription,
                        facialFeatures: { 
                          ...prev.forensicDescription.facialFeatures, 
                          eyes: { ...prev.forensicDescription.facialFeatures.eyes, color: value }
                        }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select eye color" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blue">Blue</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="brown">Brown</SelectItem>
                        <SelectItem value="hazel">Hazel</SelectItem>
                        <SelectItem value="gray">Gray</SelectItem>
                        <SelectItem value="amber">Amber</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Hair</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="hairColor">Hair Color</Label>
                    <Input
                      id="hairColor"
                      value={formData.forensicDescription.hair.color}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        forensicDescription: {
                          ...prev.forensicDescription,
                          hair: { ...prev.forensicDescription.hair, color: e.target.value }
                        }
                      }))}
                      placeholder="e.g., Dark Brown, Blonde, Black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hairLength">Hair Length</Label>
                    <Select value={formData.forensicDescription.hair.length} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      forensicDescription: {
                        ...prev.forensicDescription,
                        hair: { ...prev.forensicDescription.hair, length: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select length" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_short">Very Short</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="very_long">Very Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="psychological" className="space-y-4">
              <div>
                <Label htmlFor="predominantMood">Predominant Mood</Label>
                <Select value={formData.psychologicalProfile.predominantMood} onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  psychologicalProfile: { ...prev.psychologicalProfile, predominantMood: value }
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="calm">Calm</SelectItem>
                    <SelectItem value="melancholic">Melancholic</SelectItem>
                    <SelectItem value="energetic">Energetic</SelectItem>
                    <SelectItem value="thoughtful">Thoughtful</SelectItem>
                    <SelectItem value="playful">Playful</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="mysterious">Mysterious</SelectItem>
                    <SelectItem value="optimistic">Optimistic</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mainInterests">Main Interests (comma-separated)</Label>
                <Input
                  id="mainInterests"
                  value={formData.psychologicalProfile.mainInterests.join(", ")}
                  onChange={(e) => {
                    const value = e.target.value;
                    const interests = value.split(',').map(i => i.trim());
                    setFormData(prev => ({
                      ...prev,
                      psychologicalProfile: { 
                        ...prev.psychologicalProfile, 
                        mainInterests: interests
                      }
                    }));
                  }}
                  placeholder="e.g., Photography, Travel, Fitness, Fashion"
                />
              </div>

              <div>
                <Label htmlFor="coreValues">Core Values (comma-separated)</Label>
                <Input
                  id="coreValues"
                  value={formData.psychologicalProfile.coreValues.join(", ")}
                  onChange={(e) => {
                    const value = e.target.value;
                    const values = value.split(',').map(i => i.trim());
                    setFormData(prev => ({
                      ...prev,
                      psychologicalProfile: { 
                        ...prev.psychologicalProfile, 
                        coreValues: values
                      }
                    }));
                  }}
                  placeholder="e.g., Authenticity, Creativity, Growth, Community"
                />
              </div>

              <div>
                <Label>Communication Style</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={formData.psychologicalProfile.communicationStyle.tone} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      psychologicalProfile: {
                        ...prev.psychologicalProfile,
                        communicationStyle: { ...prev.psychologicalProfile.communicationStyle, tone: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="playful">Playful</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                        <SelectItem value="edgy">Edgy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vocabulary">Vocabulary</Label>
                    <Select value={formData.psychologicalProfile.communicationStyle.vocabulary} onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      psychologicalProfile: {
                        ...prev.psychologicalProfile,
                        communicationStyle: { ...prev.psychologicalProfile.communicationStyle, vocabulary: value }
                      }
                    }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vocabulary" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="sophisticated">Sophisticated</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active Profile</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>

              <div>
                <Label htmlFor="contentFrequency">Content Frequency</Label>
                <Select value={formData.generationSettings.contentFrequency} onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  generationSettings: { ...prev.generationSettings, contentFrequency: value }
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="aesthetic">Visual Style</Label>
                <Select value={formData.generationSettings.visualStyle.aesthetic} onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  generationSettings: {
                    ...prev.generationSettings,
                    visualStyle: { ...prev.generationSettings.visualStyle, aesthetic: value }
                  }
                }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aesthetic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimalist">Minimalist</SelectItem>
                    <SelectItem value="vibrant">Vibrant</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="vintage">Vintage</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="artistic">Artistic</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="colorPalette">Color Palette (comma-separated hex codes)</Label>
                <Input
                  id="colorPalette"
                  value={formData.generationSettings.visualStyle.colorPalette.join(", ")}
                  onChange={(e) => {
                    const value = e.target.value;
                    const colors = value.split(',').map(c => c.trim());
                    setFormData(prev => ({
                      ...prev,
                      generationSettings: {
                        ...prev.generationSettings,
                        visualStyle: { 
                          ...prev.generationSettings.visualStyle, 
                          colorPalette: colors
                        }
                      }
                    }));
                  }}
                  placeholder="e.g., #1a1a1a, #ffffff, #ff6b6b"
                />
              </div>

              <div>
                <Label htmlFor="contentRestrictions">Content Restrictions (comma-separated)</Label>
                <Input
                  id="contentRestrictions"
                  value={formData.generationSettings.contentRestrictions.join(", ")}
                  onChange={(e) => {
                    const value = e.target.value;
                    const restrictions = value.split(',').map(r => r.trim());
                    setFormData(prev => ({
                      ...prev,
                      generationSettings: { 
                        ...prev.generationSettings, 
                        contentRestrictions: restrictions
                      }
                    }));
                  }}
                  placeholder="e.g., Politics, Religion, Controversial topics"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button 
              onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
              disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
            >
              {createProfileMutation.isPending || updateProfileMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProfile ? "Update Profile" : "Create Profile"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Manager
          </span>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Profile
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeProfile && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active Profile</p>
                <p className="text-sm text-muted-foreground">{activeProfile.identity.name}</p>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {profiles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No profiles created yet</p>
              <p className="text-sm">Create your first profile to get started</p>
            </div>
          ) : (
            profiles?.map((profile: any) => (
              <div key={profile.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{profile.identity.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {profile.identity.influencerType} • {profile.identity.niche}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={profile.isActive ? "default" : "secondary"}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {profile.psychologicalProfile.predominantMood} mood
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!profile.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivateProfile(profile.id)}
                      disabled={activateProfileMutation.isPending}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProfile(profile)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProfile(profile.id)}
                    disabled={deleteProfileMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
