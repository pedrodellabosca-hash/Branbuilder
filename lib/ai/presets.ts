/**
 * Stage Presets Configuration
 * 
 * Presets control the scope, depth, and output format of each stage.
 * Models only enhance quality - they don't enable/disable features.
 * 
 * Preset Levels:
 * - fast: Quick results, minimal variants, lower token cost
 * - balanced: Good quality/cost ratio, recommended default
 * - quality: Maximum depth, more variants, higher token cost
 */

export const PRESET_LEVELS = ["fast", "balanced", "quality"] as const;
export type PresetLevel = typeof PRESET_LEVELS[number];

// =============================================================================
// NAMING PRESETS
// =============================================================================

// =============================================================================
// NAMING PRESETS
// =============================================================================

export interface NamingPresetConfig {
    numVariants: number;
    includeTaglines: boolean;
    includeRationale: boolean;
    includeLinguisticCheck: boolean;
    outputSections: string[];
    maxOutputTokens: number;
    estimatedTokensMin: number;
    estimatedTokensMax: number;
    estimatedTokens: number; // Avg for calculation
}

export const NAMING_PRESETS: Record<PresetLevel, NamingPresetConfig> = {
    fast: {
        numVariants: 3,
        includeTaglines: false,
        includeRationale: false,
        includeLinguisticCheck: false,
        outputSections: ["names"],
        maxOutputTokens: 800, // Strict limit for fast
        estimatedTokensMin: 400,
        estimatedTokensMax: 700,
        estimatedTokens: 550,
    },
    balanced: {
        numVariants: 5,
        includeTaglines: true,
        includeRationale: true,
        includeLinguisticCheck: false,
        outputSections: ["names", "rationale", "taglines"],
        maxOutputTokens: 1500, // Enough for 5 variants + rationale
        estimatedTokensMin: 900,
        estimatedTokensMax: 1400,
        estimatedTokens: 1150,
    },
    quality: {
        numVariants: 10,
        includeTaglines: true,
        includeRationale: true,
        includeLinguisticCheck: true, // Requires more tokens or subtasks
        outputSections: ["names", "rationale", "taglines", "linguistics"],
        maxOutputTokens: 3000,
        estimatedTokensMin: 2000,
        estimatedTokensMax: 2900,
        estimatedTokens: 2450,
    },
};

// =============================================================================
// VOICE PRESETS
// =============================================================================

export interface VoicePresetConfig {
    depth: "basic" | "standard" | "comprehensive";
    channelExamples: number;
    includePersonality: boolean;
    includeToneGuidelines: boolean;
    includeDosDonts: boolean;
    includeChannelAdaptation: boolean;
    channels: string[];
    maxOutputTokens: number;
    estimatedTokensMin: number;
    estimatedTokensMax: number;
    estimatedTokens: number;
}

export const VOICE_PRESETS: Record<PresetLevel, VoicePresetConfig> = {
    fast: {
        depth: "basic",
        channelExamples: 0,
        includePersonality: true,
        includeToneGuidelines: false,
        includeDosDonts: false,
        includeChannelAdaptation: false,
        channels: ["general"],
        maxOutputTokens: 1500,
        estimatedTokensMin: 800,
        estimatedTokensMax: 1200,
        estimatedTokens: 1000,
    },
    balanced: {
        depth: "standard",
        channelExamples: 1,
        includePersonality: true,
        includeToneGuidelines: true,
        includeDosDonts: true,
        includeChannelAdaptation: false,
        channels: ["general", "social", "email"],
        maxOutputTokens: 3000,
        estimatedTokensMin: 2000,
        estimatedTokensMax: 2800,
        estimatedTokens: 2400,
    },
    quality: {
        depth: "comprehensive",
        channelExamples: 2,
        includePersonality: true,
        includeToneGuidelines: true,
        includeDosDonts: true,
        includeChannelAdaptation: true,
        channels: ["general", "social", "email", "advertising", "customer_support", "internal"],
        maxOutputTokens: 6000,
        estimatedTokensMin: 4000,
        estimatedTokensMax: 5500,
        estimatedTokens: 4800,
    },
};

// =============================================================================
// VISUAL IDENTITY PRESETS
// =============================================================================

export interface VisualPresetConfig {
    colorVariants: number;
    typographyPairings: number;
    logoDirections: number;
    includeMoodboard: boolean;
    includeUsageGuidelines: boolean;
    includeAccessibility: boolean;
    includeApplicationExamples: boolean;
    applicationScreens: number;
    components: string[];
    maxOutputTokens: number;
    estimatedTokensMin: number;
    estimatedTokensMax: number;
    estimatedTokens: number;
}

export const VISUAL_PRESETS: Record<PresetLevel, VisualPresetConfig> = {
    fast: {
        colorVariants: 1,
        typographyPairings: 1,
        logoDirections: 2,
        includeMoodboard: false,
        includeUsageGuidelines: false,
        includeAccessibility: false,
        includeApplicationExamples: false,
        applicationScreens: 0,
        components: ["palette", "typography", "logo_concepts"],
        maxOutputTokens: 2000,
        estimatedTokensMin: 1000,
        estimatedTokensMax: 1500,
        estimatedTokens: 1200,
    },
    balanced: {
        colorVariants: 2,
        typographyPairings: 2,
        logoDirections: 3,
        includeMoodboard: true,
        includeUsageGuidelines: true,
        includeAccessibility: false,
        includeApplicationExamples: true,
        applicationScreens: 2,
        components: ["palette", "typography", "logo_concepts", "moodboard", "usage_guidelines", "applications"],
        maxOutputTokens: 4000,
        estimatedTokensMin: 2500,
        estimatedTokensMax: 3500,
        estimatedTokens: 3000,
    },
    quality: {
        colorVariants: 3,
        typographyPairings: 3,
        logoDirections: 5,
        includeMoodboard: true,
        includeUsageGuidelines: true,
        includeAccessibility: true,
        includeApplicationExamples: true,
        applicationScreens: 5,
        components: [
            "palette",
            "typography",
            "logo_concepts",
            "moodboard",
            "usage_guidelines",
            "applications",
            "accessibility",
            "iconography",
            "photography_style",
        ],
        maxOutputTokens: 8000,
        estimatedTokensMin: 5000,
        estimatedTokensMax: 7000,
        estimatedTokens: 6000,
    },
};

// =============================================================================
// GENERIC STAGE PRESETS
// =============================================================================

export interface GenericPresetConfig {
    depth: "basic" | "standard" | "comprehensive";
    numVariants: number;
    includeExamples: boolean;
    selfCheckRounds: number;
    maxOutputTokens: number;
    estimatedTokensMin: number;
    estimatedTokensMax: number;
    estimatedTokens: number;
}

export const GENERIC_PRESETS: Record<PresetLevel, GenericPresetConfig> = {
    fast: {
        depth: "basic",
        numVariants: 1,
        includeExamples: false,
        selfCheckRounds: 0,
        maxOutputTokens: 1000,
        estimatedTokensMin: 500,
        estimatedTokensMax: 800,
        estimatedTokens: 650,
    },
    balanced: {
        depth: "standard",
        numVariants: 2,
        includeExamples: true,
        selfCheckRounds: 1,
        maxOutputTokens: 2000,
        estimatedTokensMin: 1200,
        estimatedTokensMax: 1800,
        estimatedTokens: 1500,
    },
    quality: {
        depth: "comprehensive",
        numVariants: 3,
        includeExamples: true,
        selfCheckRounds: 2,
        maxOutputTokens: 4000,
        estimatedTokensMin: 2500,
        estimatedTokensMax: 3500,
        estimatedTokens: 3000,
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export type StagePresetConfig =
    | NamingPresetConfig
    | VoicePresetConfig
    | VisualPresetConfig
    | GenericPresetConfig;

/**
 * Get the preset configuration for a stage
 */
export function getPresetConfig(stageKey: string, preset: PresetLevel): StagePresetConfig {
    switch (stageKey) {
        case "naming":
            return NAMING_PRESETS[preset];
        case "voice":
            return VOICE_PRESETS[preset];
        case "visual_identity":
            return VISUAL_PRESETS[preset];
        default:
            return GENERIC_PRESETS[preset];
    }
}

/**
 * Get estimated tokens for a stage/preset combination
 */
export function getEstimatedTokens(stageKey: string, preset: PresetLevel): number {
    const config = getPresetConfig(stageKey, preset);
    return config.estimatedTokens;
}

/**
 * Get max output tokens for a stage/preset
 */
export function getMaxOutputTokens(stageKey: string, preset: PresetLevel): number {
    const config = getPresetConfig(stageKey, preset);
    return config.maxOutputTokens;
}

/**
 * Validate preset level
 */
export function isValidPreset(preset: string): preset is PresetLevel {
    return PRESET_LEVELS.includes(preset as PresetLevel);
}
