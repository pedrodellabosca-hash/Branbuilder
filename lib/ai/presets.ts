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

export interface NamingPresetConfig {
    numVariants: number;           // How many name options to generate
    includeTaglines: boolean;      // Include tagline suggestions
    includeRationale: boolean;     // Include reasoning for each name
    includeLinguisticCheck: boolean; // Check pronunciation, meaning in other languages
    outputSections: string[];      // Which sections to include
    maxOutputTokens: number;       // Token limit for this preset
    estimatedTokens: number;       // Estimated total tokens
}

export const NAMING_PRESETS: Record<PresetLevel, NamingPresetConfig> = {
    fast: {
        numVariants: 3,
        includeTaglines: false,
        includeRationale: false,
        includeLinguisticCheck: false,
        outputSections: ["names"],
        maxOutputTokens: 500,
        estimatedTokens: 800,
    },
    balanced: {
        numVariants: 5,
        includeTaglines: true,
        includeRationale: true,
        includeLinguisticCheck: false,
        outputSections: ["names", "taglines", "rationale"],
        maxOutputTokens: 1200,
        estimatedTokens: 1500,
    },
    quality: {
        numVariants: 8,
        includeTaglines: true,
        includeRationale: true,
        includeLinguisticCheck: true,
        outputSections: ["names", "taglines", "rationale", "linguistic_analysis", "domain_availability"],
        maxOutputTokens: 2500,
        estimatedTokens: 3000,
    },
};

// =============================================================================
// VOICE PRESETS
// =============================================================================

export interface VoicePresetConfig {
    depth: "basic" | "standard" | "comprehensive";
    channelExamples: number;       // Examples per communication channel
    includePersonality: boolean;
    includeToneGuidelines: boolean;
    includeDosDonts: boolean;
    includeChannelAdaptation: boolean;
    channels: string[];            // Which channels to cover
    maxOutputTokens: number;
    estimatedTokens: number;
}

export const VOICE_PRESETS: Record<PresetLevel, VoicePresetConfig> = {
    fast: {
        depth: "basic",
        channelExamples: 1,
        includePersonality: true,
        includeToneGuidelines: false,
        includeDosDonts: false,
        includeChannelAdaptation: false,
        channels: ["general"],
        maxOutputTokens: 600,
        estimatedTokens: 1000,
    },
    balanced: {
        depth: "standard",
        channelExamples: 2,
        includePersonality: true,
        includeToneGuidelines: true,
        includeDosDonts: true,
        includeChannelAdaptation: false,
        channels: ["general", "social", "email"],
        maxOutputTokens: 1500,
        estimatedTokens: 2000,
    },
    quality: {
        depth: "comprehensive",
        channelExamples: 3,
        includePersonality: true,
        includeToneGuidelines: true,
        includeDosDonts: true,
        includeChannelAdaptation: true,
        channels: ["general", "social", "email", "advertising", "customer_support", "internal"],
        maxOutputTokens: 3000,
        estimatedTokens: 4000,
    },
};

// =============================================================================
// VISUAL IDENTITY PRESETS
// =============================================================================

export interface VisualPresetConfig {
    colorVariants: number;         // Number of color palette options
    typographyPairings: number;    // Number of font pairing options
    logoDirections: number;        // Number of logo concept directions
    includeMoodboard: boolean;
    includeUsageGuidelines: boolean;
    includeAccessibility: boolean;
    includeApplicationExamples: boolean;
    applicationScreens: number;    // Number of mockup screens
    components: string[];          // Which visual components to include
    maxOutputTokens: number;
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
        maxOutputTokens: 800,
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
        applicationScreens: 3,
        components: ["palette", "typography", "logo_concepts", "moodboard", "usage_guidelines", "applications"],
        maxOutputTokens: 2000,
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
        applicationScreens: 6,
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
        maxOutputTokens: 4000,
        estimatedTokens: 5000,
    },
};

// =============================================================================
// GENERIC STAGE PRESETS (for stages without specific config)
// =============================================================================

export interface GenericPresetConfig {
    depth: "basic" | "standard" | "comprehensive";
    numVariants: number;
    includeExamples: boolean;
    selfCheckRounds: number;       // AI self-verification rounds
    maxOutputTokens: number;
    estimatedTokens: number;
}

export const GENERIC_PRESETS: Record<PresetLevel, GenericPresetConfig> = {
    fast: {
        depth: "basic",
        numVariants: 1,
        includeExamples: false,
        selfCheckRounds: 0,
        maxOutputTokens: 500,
        estimatedTokens: 800,
    },
    balanced: {
        depth: "standard",
        numVariants: 2,
        includeExamples: true,
        selfCheckRounds: 1,
        maxOutputTokens: 1200,
        estimatedTokens: 1800,
    },
    quality: {
        depth: "comprehensive",
        numVariants: 3,
        includeExamples: true,
        selfCheckRounds: 2,
        maxOutputTokens: 2500,
        estimatedTokens: 3500,
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
