export interface Theme {
    name: string;
    keywords: string[];
    style: string;
}

export const themes: Record<string, Theme> = {
    motivation: {
        name: "Morning Inspiration",
        keywords: ["success", "wakeup", "routine", "mindset", "coffee", "sunrise"],
        style: "Bright morning light, warm tones, aesthetic coffee setup, minimalist home",
    },
    fitness: {
        name: "Active Lifestyle",
        keywords: ["workout", "gym", "health", "energy", "jogging", "yoga"],
        style: "Dynamic action shot, modern activewear, outdoor park or sleek gym background",
    },
    study: {
        name: "Focus & Learning",
        keywords: ["reading", "studying", "productivity", "desk setup", "notebooks", "coding"],
        style: "Cozy desk aesthetic, warm lamp lighting, focused atmosphere, plants on desk",
    },
    music: {
        name: "Melodic Vibes",
        keywords: ["headphones", "vinyl", "listening", "favorite songs", "chill", "relaxing"],
        style: "Artistic close up, soft bokeh, cool color palette, relaxing atmosphere",
    },
    lifestyle: {
        name: "Day Out",
        keywords: ["travel", "luxury", "freedom", "nature", "city exploration"],
        style: "Wide angle street photography, urban vibe, fashionable outfit, natural light",
    }
};

export const getThemeByTimeOfDay = (hour: number, dayOfWeek: number): Theme => {
    // Rotation based on typical influencer day
    // Morning (6-10): Motivation/Coffee
    // Midday (11-14): Fitness/Active
    // Afternoon (15-18): Study/Work
    // Evening (19-23): Music/Chill/Night Life

    if (hour >= 6 && hour < 11) return themes.motivation;
    if (hour >= 11 && hour < 15) return themes.fitness;
    if (hour >= 15 && hour < 19) return themes.study;
    if (hour >= 19 && hour < 24 || hour < 6) return themes.music;

    return themes.lifestyle;
};

export const getRandomTheme = (): Theme => {
    const themeKeys = Object.keys(themes);
    const randomKey = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    return themes[randomKey];
};
