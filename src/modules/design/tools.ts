/**
 * Design Module Tools
 *
 * MCP tool definitions and handlers for theme and animation generation
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  DesignModuleConfig,
  AnimationType,
  CurveType,
  hexToFlutterColor,
  curveToFlutter,
  alphaToHex,
  extractHexColor,
  EdcDesignTokensConfig,
  EdcGlassGradientsConfig,
  EdcWcagContrastConfig,
  DEFAULT_EDC_DESIGN_TOKENS,
  DEFAULT_EDC_GLASS_GRADIENTS,
  DEFAULT_EDC_WCAG_CONFIG,
  EdcDesignTokensConfigSchema,
  EdcGlassGradientsConfigSchema,
  EdcWcagContrastConfigSchema,
  wcagContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  getWcagContrastReport,
  DEFAULT_GLASS_CARD_CONFIG,
  DEFAULT_GLASS_CONTAINER_CONFIG,
  DEFAULT_GLASS_BUTTON_CONFIG,
  DEFAULT_GLASS_BOTTOMSHEET_CONFIG,
  GlassCardConfigSchema,
  GlassContainerConfigSchema,
  GlassButtonConfigSchema,
  GlassBottomSheetConfigSchema,
  ShadowSystemConfigSchema,
  TextShadowConfigSchema,
  NoiseOverlayConfigSchema,
  LightSimulationConfigSchema,
} from "./config.js";
import {
  GLASS_CARD_SOURCE,
  GLASS_CONTAINER_SOURCE,
} from "./templates/glass_card_template.js";
import { GLASS_BUTTON_SOURCE } from "./templates/glass_button_template.js";
import { GLASS_BOTTOMSHEET_SOURCE } from "./templates/glass_bottomsheet_template.js";
import {
  SHADOW_SYSTEM_SOURCE,
  DEFAULT_SHADOW_CONFIG,
} from "./templates/shadow_system_template.js";
import {
  TEXT_SHADOW_SOURCE,
  DEFAULT_TEXT_SHADOW_CONFIG,
} from "./templates/text_shadow_template.js";
import {
  NOISE_OVERLAY_SOURCE,
  DEFAULT_NOISE_CONFIG,
} from "./templates/noise_overlay_template.js";
import {
  LIGHT_SIMULATION_SOURCE,
  DEFAULT_LIGHT_CONFIG,
} from "./templates/light_simulation_template.js";
import Handlebars from "handlebars";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const GenerateThemeInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  primaryColor: z.string().describe("Primary color (hex, e.g., #2196F3)"),
  accentColor: z.string().optional().describe("Accent color (hex)"),
  fontFamily: z.string().optional().describe("Primary font family"),
  borderRadius: z.number().optional().describe("Default border radius"),
  darkMode: z.boolean().optional().describe("Include dark mode theme"),
});

export const CreateAnimationInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  animationType: z.enum(["fade", "slide", "scale", "rotation", "custom"]).describe("Animation type"),
  duration: z.number().describe("Duration in milliseconds"),
  curve: z.string().optional().describe("Animation curve"),
  repeat: z.boolean().optional().describe("Repeat animation"),
  reverseOnComplete: z.boolean().optional().describe("Reverse on complete"),
});

export const GenerateDesignTokensInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  format: z.enum(["dart", "json", "css"]).optional().describe("Output format"),
});

// ============================================================================
// EDC DESIGN SYSTEM TOOL INPUT SCHEMAS
// ============================================================================

export const GenerateEdcTokensInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: EdcDesignTokensConfigSchema.optional().describe("Custom design token configuration"),
});

export const GenerateGlassGradientsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: EdcGlassGradientsConfigSchema.optional().describe("Custom glass gradients configuration"),
});

export const GenerateWcagContrastInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: EdcWcagContrastConfigSchema.optional().describe("Custom WCAG contrast configuration"),
  foreground: z.string().optional().describe("Foreground color (hex) to check contrast"),
  background: z.string().optional().describe("Background color (hex) to check contrast"),
});

// ============================================================================
// GLASS COMPONENT TOOL INPUT SCHEMAS
// ============================================================================

export const GenerateGlassCardInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  variant: z.enum(["card", "container"]).optional().describe("Component variant"),
  config: z.union([GlassCardConfigSchema, GlassContainerConfigSchema]).optional().describe("Custom configuration"),
});

export const GenerateGlassButtonInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: GlassButtonConfigSchema.optional().describe("Custom glass button configuration"),
});

export const GenerateGlassBottomSheetInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: GlassBottomSheetConfigSchema.optional().describe("Custom glass bottom sheet configuration"),
});

// ============================================================================
// PHASE 3: VISUAL EFFECTS TOOL INPUT SCHEMAS
// ============================================================================

export const GenerateShadowSystemInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: ShadowSystemConfigSchema.optional().describe("Custom shadow system configuration"),
});

export const GenerateTextShadowInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: TextShadowConfigSchema.optional().describe("Custom text shadow configuration"),
});

export const GenerateNoiseOverlayInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: NoiseOverlayConfigSchema.optional().describe("Custom noise overlay configuration"),
});

export const GenerateLightSimulationInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  config: LightSimulationConfigSchema.optional().describe("Custom light simulation configuration"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const DESIGN_TOOLS: Tool[] = [
  {
    name: "design_generate_theme",
    description: "Generate a complete Flutter theme with Material 3, colors, typography, and optional dark mode.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        primaryColor: { type: "string", description: "Primary color (hex)" },
        accentColor: { type: "string", description: "Accent color (hex)" },
        fontFamily: { type: "string", description: "Font family" },
        borderRadius: { type: "number", description: "Border radius" },
        darkMode: { type: "boolean", description: "Include dark mode" },
      },
      required: ["projectId", "primaryColor"],
    },
  },
  {
    name: "design_create_animation",
    description: "Create Flutter animations with various effects (fade, slide, scale, rotation) and customizable timing.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        animationType: {
          type: "string",
          enum: ["fade", "slide", "scale", "rotation", "custom"],
          description: "Animation type",
        },
        duration: { type: "number", description: "Duration in ms" },
        curve: { type: "string", description: "Animation curve" },
        repeat: { type: "boolean", description: "Repeat animation" },
        reverseOnComplete: { type: "boolean", description: "Reverse on complete" },
      },
      required: ["projectId", "animationType", "duration"],
    },
  },
  {
    name: "design_generate_tokens",
    description: "Generate design tokens for colors, spacing, typography, and shadows in various formats.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        format: {
          type: "string",
          enum: ["dart", "json", "css"],
          description: "Output format",
        },
      },
      required: ["projectId"],
    },
  },
  // ============================================================================
  // EDC DESIGN SYSTEM TOOLS
  // ============================================================================
  {
    name: "design_generate_edc_tokens",
    description: "Generate EDC design token system with AppSpacing, AppColors, AppRadius, AppBorders, AppAnimations, AppSizes, AppBlur, and ThemeExtension.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom design token configuration",
          properties: {
            spacing: { type: "object", description: "Spacing config (xs, sm, md, lg, xl, xxl, xxxl, huge)" },
            colors: { type: "object", description: "Color config with text/glass/border alpha values" },
            radius: { type: "object", description: "Border radius config (xs, sm, md, lg, xl, xxl, pill)" },
            animations: { type: "object", description: "Animation timing config" },
            sizes: { type: "object", description: "Component sizes config" },
            blur: { type: "object", description: "Blur strength config (light, medium, strong, veryStrong)" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_gradients",
    description: "Generate glassmorphic gradient system with 4 glass levels, status gradients, background gradients, and helper methods.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom glass gradients configuration",
          properties: {
            glass: {
              type: "object",
              description: "Glass intensity levels (subtle, medium, strong, veryStrong)",
            },
            colors: {
              type: "object",
              description: "Theme colors for gradients (primary, accent, gold)",
            },
            background: {
              type: "object",
              description: "Background gradient colors (dark, light)",
            },
            status: {
              type: "object",
              description: "Status colors (success, warning, error, info)",
            },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_wcag",
    description: "Generate WCAG 2.1 contrast calculator with AA/AAA checking, relative luminance calculation, and theme verification.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "WCAG configuration",
          properties: {
            includeVerification: {
              type: "boolean",
              description: "Include theme verification debug helper (default: true)",
            },
            verificationPairs: {
              type: "array",
              description: "Color pairs to verify (name, foreground, background)",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  foreground: { type: "string" },
                  background: { type: "string" },
                },
              },
            },
          },
        },
        foreground: { type: "string", description: "Foreground color (hex) to check contrast" },
        background: { type: "string", description: "Background color (hex) to check contrast" },
      },
      required: ["projectId"],
    },
  },
  // ============================================================================
  // GLASS COMPONENT TOOLS
  // ============================================================================
  {
    name: "design_generate_glass_card",
    description: "Generate glass card component with BackdropFilter blur and customizable styling. Includes both GlassCard (simple) and GlassContainer (advanced with shadows).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        variant: {
          type: "string",
          enum: ["card", "container"],
          description: "Component variant: card (simple) or container (with shadows/noise)"
        },
        config: {
          type: "object",
          description: "Custom glass card/container configuration",
          properties: {
            defaultPadding: { type: "number", description: "Default padding" },
            defaultBorderRadius: { type: "number", description: "Border radius" },
            defaultBlurStrength: { type: "number", description: "Blur strength (sigma)" },
            includeNoiseOverlay: { type: "boolean", description: "Include noise overlay (container only)" },
            enableLightSimulation: { type: "boolean", description: "Enable light simulation (container only)" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_glass_button",
    description: "Generate interactive glass button with press animations, haptic feedback, and visual enhancements (blur, shadows, noise, light simulation).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom glass button configuration",
          properties: {
            defaultHeight: { type: "number", description: "Button height" },
            enablePressAnimation: { type: "boolean", description: "Enable press animation" },
            pressScale: { type: "number", description: "Press scale factor (0.95 default)" },
            enableHaptics: { type: "boolean", description: "Enable haptic feedback" },
            hapticType: {
              type: "string",
              enum: ["light", "medium", "heavy"],
              description: "Haptic feedback intensity"
            },
            defaultBlurStrength: { type: "number", description: "Blur strength" },
            enableNoise: { type: "boolean", description: "Enable noise overlay" },
            enableLightSimulation: { type: "boolean", description: "Enable light simulation" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_glass_bottomsheet",
    description: "Generate glass bottom sheet component with BackdropFilter blur and helper function for easy usage.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom glass bottom sheet configuration",
          properties: {
            defaultBorderRadius: { type: "number", description: "Border radius" },
            defaultBlurStrength: { type: "number", description: "Blur strength (sigma)" },
            darkModeAlpha: { type: "number", description: "Dark mode background alpha" },
            lightModeAlpha: { type: "number", description: "Light mode background alpha" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  // ============================================================================
  // PHASE 3: VISUAL EFFECTS TOOLS
  // ============================================================================
  {
    name: "design_generate_shadows",
    description: "Generate dual shadow system with ambient and definition shadows for glass, card, and elevated surfaces. Uses Flutter 3.29+ withValues API.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom shadow system configuration",
          properties: {
            glass: {
              type: "object",
              description: "Glass shadow configuration",
              properties: {
                ambient: {
                  type: "object",
                  properties: {
                    alpha: { type: "number", description: "Shadow opacity (0-1)" },
                    blur: { type: "number", description: "Blur radius" },
                    offsetX: { type: "number", description: "X offset" },
                    offsetY: { type: "number", description: "Y offset" },
                  },
                },
                definition: {
                  type: "object",
                  properties: {
                    alpha: { type: "number", description: "Shadow opacity (0-1)" },
                    blur: { type: "number", description: "Blur radius" },
                    offsetX: { type: "number", description: "X offset" },
                    offsetY: { type: "number", description: "Y offset" },
                  },
                },
              },
            },
            card: {
              type: "object",
              description: "Card shadow configuration",
            },
            elevated: {
              type: "object",
              description: "Elevated shadow configuration",
            },
            primaryColor: { type: "string", description: "Primary color for elevated shadows (hex)" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_text_shadows",
    description: "Generate 4-level text shadow system (subtle, medium, strong, bold) with pre-styled text styles for readable text on glass backgrounds. Uses Flutter 3.29+ withValues API.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom text shadow configuration",
          properties: {
            subtle: {
              type: "object",
              description: "Subtle text shadow (15% opacity)",
              properties: {
                offsetX: { type: "number" },
                offsetY: { type: "number" },
                blur: { type: "number" },
              },
            },
            medium: {
              type: "object",
              description: "Medium text shadow (30% opacity)",
            },
            strong: {
              type: "object",
              description: "Strong text shadow (40% opacity)",
            },
            bold: {
              type: "object",
              description: "Bold text shadow (50% opacity)",
            },
            styles: {
              type: "object",
              description: "Pre-configured text styles",
              properties: {
                heading: {
                  type: "object",
                  properties: {
                    fontSize: { type: "number" },
                    fontWeight: { type: "string" },
                    color: { type: "string" },
                  },
                },
                subheading: { type: "object" },
                body: { type: "object" },
                caption: { type: "object" },
                display: { type: "object" },
              },
            },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_noise_overlay",
    description: "Generate StaticNoiseOverlay widget for adding grain texture to glass surfaces. Uses seeded Random(42) for consistency. Includes CustomPainter for efficient rendering.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom noise overlay configuration",
          properties: {
            defaultOpacity: { type: "number", description: "Default noise opacity (0-1)" },
            defaultDensity: { type: "number", description: "Default noise density (0-1)" },
            seed: { type: "number", description: "Random seed for consistency" },
            particleSize: { type: "number", description: "Noise particle size" },
          },
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "design_generate_light_simulation",
    description: "Generate light simulation system for realistic glass effects via foreground gradient overlays. Creates BoxDecoration helpers for various lighting patterns (top-down, diagonal, reversed).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        config: {
          type: "object",
          description: "Custom light simulation configuration",
          properties: {
            defaultIntensity: { type: "number", description: "Default light intensity (0-1)" },
            defaultStopStart: { type: "number", description: "Gradient start stop (0-1)" },
            defaultStopEnd: { type: "number", description: "Gradient end stop (0-1)" },
            presets: {
              type: "object",
              description: "Light simulation presets",
              properties: {
                subtle: {
                  type: "object",
                  properties: {
                    intensity: { type: "number" },
                  },
                },
                strong: { type: "object" },
                extended: { type: "object" },
                short: { type: "object" },
              },
            },
          },
        },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL CONTEXT TYPE
// ============================================================================

export interface DesignToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  getDesignConfig: (id: string) => DesignModuleConfig | undefined;
  updateDesignConfig: (id: string, config: Partial<DesignModuleConfig>) => void;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

async function handleGenerateTheme(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateThemeInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDesignConfig(input.projectId);
  const accentColor = input.accentColor || input.primaryColor;
  const fontFamily = input.fontFamily || "Roboto";
  const borderRadius = input.borderRadius || 8;
  const darkMode = input.darkMode ?? true;

  // Generate theme code
  const themeCode = generateThemeCode(
    input.primaryColor,
    accentColor,
    fontFamily,
    borderRadius,
    darkMode
  );

  // Update config
  ctx.updateDesignConfig(input.projectId, {
    theme: {
      ...config?.theme,
      name: "AppTheme",
      colors: {
        ...config?.theme?.colors,
        primary: input.primaryColor,
        accent: accentColor,
        secondary: config?.theme?.colors?.secondary || "#03DAC6",
        background: config?.theme?.colors?.background || "#FFFFFF",
        surface: config?.theme?.colors?.surface || "#FAFAFA",
        error: config?.theme?.colors?.error || "#F44336",
        success: config?.theme?.colors?.success || "#4CAF50",
        warning: config?.theme?.colors?.warning || "#FFC107",
        info: config?.theme?.colors?.info || "#2196F3",
      },
      typography: {
        ...config?.theme?.typography,
        fontFamily,
        headlineLarge: config?.theme?.typography?.headlineLarge || 32,
        headlineMedium: config?.theme?.typography?.headlineMedium || 28,
        headlineSmall: config?.theme?.typography?.headlineSmall || 24,
        bodyLarge: config?.theme?.typography?.bodyLarge || 16,
        bodyMedium: config?.theme?.typography?.bodyMedium || 14,
        bodySmall: config?.theme?.typography?.bodySmall || 12,
        labelLarge: config?.theme?.typography?.labelLarge || 14,
      },
      spacing: config?.theme?.spacing || {
        xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
      },
      borderRadius: {
        ...config?.theme?.borderRadius,
        md: borderRadius,
        none: 0,
        sm: borderRadius / 2,
        lg: borderRadius * 2,
        full: 9999,
      },
      useMaterial3: true,
      supportDarkMode: darkMode,
    },
  });

  return {
    content: [
      {
        type: "text",
        text: `Generated Theme for ${project.name}

Primary Color: ${input.primaryColor}
Accent Color: ${accentColor}
Font Family: ${fontFamily}
Border Radius: ${borderRadius}px
Dark Mode: ${darkMode ? "Enabled" : "Disabled"}

lib/theme/app_theme.dart:
\`\`\`dart
${themeCode}
\`\`\``,
      },
    ],
  };
}

async function handleCreateAnimation(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = CreateAnimationInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const curve = (input.curve || "easeInOut") as CurveType;
  const repeat = input.repeat ?? false;
  const reverseOnComplete = input.reverseOnComplete ?? false;

  // Generate animation code
  const animationCode = generateAnimationCode(
    input.animationType as AnimationType,
    input.duration,
    curve,
    repeat,
    reverseOnComplete
  );

  // Update config
  const config = ctx.getDesignConfig(input.projectId);
  const existingAnimations = config?.animations || [];
  ctx.updateDesignConfig(input.projectId, {
    animations: [
      ...existingAnimations,
      {
        type: input.animationType as AnimationType,
        duration: input.duration,
        curve,
        repeat,
        reverseOnComplete,
      },
    ],
  });

  return {
    content: [
      {
        type: "text",
        text: `Generated ${input.animationType} Animation

Duration: ${input.duration}ms
Curve: ${curve}
Repeat: ${repeat ? "Yes" : "No"}
Reverse: ${reverseOnComplete ? "Yes" : "No"}

lib/animations/${input.animationType}_animation.dart:
\`\`\`dart
${animationCode}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateDesignTokens(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateDesignTokensInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDesignConfig(input.projectId);
  const format = input.format || "dart";

  let tokensCode: string;
  let filename: string;

  switch (format) {
    case "json":
      tokensCode = generateJsonTokens(config);
      filename = "lib/theme/design_tokens.json";
      break;
    case "css":
      tokensCode = generateCssTokens(config);
      filename = "web/design_tokens.css";
      break;
    default:
      tokensCode = generateDartTokens(config);
      filename = "lib/theme/design_tokens.dart";
  }

  return {
    content: [
      {
        type: "text",
        text: `Generated Design Tokens (${format.toUpperCase()})

${filename}:
\`\`\`${format === "dart" ? "dart" : format}
${tokensCode}
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// EDC DESIGN SYSTEM HANDLERS
// ============================================================================

async function handleGenerateEdcTokens(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateEdcTokensInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // Merge with defaults
  const config: EdcDesignTokensConfig = {
    ...DEFAULT_EDC_DESIGN_TOKENS,
    ...input.config,
    spacing: { ...DEFAULT_EDC_DESIGN_TOKENS.spacing, ...input.config?.spacing },
    colors: {
      ...DEFAULT_EDC_DESIGN_TOKENS.colors,
      ...input.config?.colors,
      textAlpha: { ...DEFAULT_EDC_DESIGN_TOKENS.colors.textAlpha, ...input.config?.colors?.textAlpha },
      glassAlpha: { ...DEFAULT_EDC_DESIGN_TOKENS.colors.glassAlpha, ...input.config?.colors?.glassAlpha },
      borderAlpha: { ...DEFAULT_EDC_DESIGN_TOKENS.colors.borderAlpha, ...input.config?.colors?.borderAlpha },
    },
    radius: { ...DEFAULT_EDC_DESIGN_TOKENS.radius, ...input.config?.radius },
    animations: { ...DEFAULT_EDC_DESIGN_TOKENS.animations, ...input.config?.animations },
    sizes: { ...DEFAULT_EDC_DESIGN_TOKENS.sizes, ...input.config?.sizes },
    blur: { ...DEFAULT_EDC_DESIGN_TOKENS.blur, ...input.config?.blur },
  };

  // Generate code
  const tokensCode = generateEdcTokensCode(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated EDC Design Token System for ${project.name}

Files generated:
- lib/theme/app_theme_extensions.dart

Configuration:
- Spacing: 8-point scale (xs: ${config.spacing.xs}px to huge: ${config.spacing.huge}px)
- Radius: xs: ${config.radius.xs}px to pill: ${config.radius.pill}px
- Blur: light: ${config.blur.light}px to veryStrong: ${config.blur.veryStrong}px
- Colors: Primary ${config.colors.primary}, Accent ${config.colors.accent}

lib/theme/app_theme_extensions.dart:
\`\`\`dart
${tokensCode}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateGlassGradients(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateGlassGradientsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // Merge with defaults
  const config: EdcGlassGradientsConfig = {
    ...DEFAULT_EDC_GLASS_GRADIENTS,
    ...input.config,
    glass: { ...DEFAULT_EDC_GLASS_GRADIENTS.glass, ...input.config?.glass },
    colors: { ...DEFAULT_EDC_GLASS_GRADIENTS.colors, ...input.config?.colors },
    background: {
      ...DEFAULT_EDC_GLASS_GRADIENTS.background,
      ...input.config?.background,
      dark: { ...DEFAULT_EDC_GLASS_GRADIENTS.background.dark, ...input.config?.background?.dark },
      light: { ...DEFAULT_EDC_GLASS_GRADIENTS.background.light, ...input.config?.background?.light },
    },
    status: { ...DEFAULT_EDC_GLASS_GRADIENTS.status, ...input.config?.status },
  };

  // Generate code
  const gradientsCode = generateGlassGradientsCode(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Glassmorphic Gradient System for ${project.name}

Files generated:
- lib/theme/app_gradients.dart

Glass Levels:
- glassSubtle: ${config.glass.subtle.start * 100}% -> ${config.glass.subtle.end * 100}%
- glassMedium: ${config.glass.medium.start * 100}% -> ${config.glass.medium.end * 100}%
- glassStrong: ${config.glass.strong.start * 100}% -> ${config.glass.strong.end * 100}%
- glassVeryStrong: ${config.glass.veryStrong.start * 100}% -> ${config.glass.veryStrong.end * 100}%

Status Gradients: success, warning, error, info
Helper Methods: customGlass(), customColored(), spotlight(), getGlassByLevel()

lib/theme/app_gradients.dart:
\`\`\`dart
${gradientsCode}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateWcag(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateWcagContrastInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  // Merge with defaults
  const config: EdcWcagContrastConfig = {
    ...DEFAULT_EDC_WCAG_CONFIG,
    ...input.config,
  };

  // Generate code
  const wcagCode = generateWcagContrastCode(config);

  // If foreground and background provided, include a contrast check
  let contrastReport = "";
  if (input.foreground && input.background) {
    const ratio = wcagContrastRatio(input.foreground, input.background);
    const passAA = meetsWcagAA(input.foreground, input.background);
    const passAAA = meetsWcagAAA(input.foreground, input.background);
    const report = getWcagContrastReport(input.foreground, input.background);

    contrastReport = `
Contrast Check:
- Foreground: ${input.foreground}
- Background: ${input.background}
- Ratio: ${ratio.toFixed(2)}:1
- WCAG AA (4.5:1): ${passAA ? "PASS" : "FAIL"}
- WCAG AAA (7:1): ${passAAA ? "PASS" : "FAIL"}
- Full Report: ${report}
`;
  }

  return {
    content: [
      {
        type: "text",
        text: `Generated WCAG Contrast Calculator for ${project.name}

Files generated:
- lib/theme/wcag_contrast.dart

Features:
- _relativeLuminance(): sRGB gamma-corrected luminance calculation
- contrastRatio(): Calculate contrast ratio between two colors
- meetsWcagAA(): Check 4.5:1 minimum for normal text
- meetsWcagAALarge(): Check 3:1 minimum for large text
- meetsWcagAAA(): Check 7:1 minimum for enhanced contrast
- getContrastReport(): Human-readable pass/fail report
- suggestAccessibleColor(): Auto-suggest accessible alternatives
${config.includeVerification ? "- verifyThemeContrast(): Debug helper for theme validation" : ""}
${contrastReport}
lib/theme/wcag_contrast.dart:
\`\`\`dart
${wcagCode}
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// GLASS COMPONENT HANDLERS
// ============================================================================

async function handleGenerateGlassCard(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateGlassCardInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const variant = input.variant || "card";
  const isContainer = variant === "container";

  const defaultConfig = isContainer ? DEFAULT_GLASS_CONTAINER_CONFIG : DEFAULT_GLASS_CARD_CONFIG;
  const config = { ...defaultConfig, ...input.config, projectName: project.name };

  // Compile template
  const template = Handlebars.compile(isContainer ? GLASS_CONTAINER_SOURCE : GLASS_CARD_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Glass ${isContainer ? "Container" : "Card"} Component for ${project.name}

Files generated:
- lib/widgets/glass_${isContainer ? "container" : "card"}.dart

Component: ${isContainer ? "GlassContainer" : "GlassCard"}

Features:
- BackdropFilter blur effect (${config.defaultBlurStrength}px)
- Adaptive theming (light/dark mode)
- Customizable border radius (${config.defaultBorderRadius}px)
- Default padding: ${config.defaultPadding}px
${isContainer ? `- Dual shadow technique (ambient + definition)
- Light simulation gradient
- Optional noise overlay
- Cached static values for performance` : ""}

Usage:
\`\`\`dart
${isContainer ? "GlassContainer" : "GlassCard"}(
  child: Text('Hello World'),
  borderRadius: ${config.defaultBorderRadius},
  ${isContainer ? "blurStrength" : "blurSigma"}: ${config.defaultBlurStrength},
)
\`\`\`

lib/widgets/glass_${isContainer ? "container" : "card"}.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateGlassButton(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateGlassButtonInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_GLASS_BUTTON_CONFIG, ...input.config, projectName: project.name };

  // Compile template
  const template = Handlebars.compile(GLASS_BUTTON_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Glass Button Component for ${project.name}

Files generated:
- lib/widgets/glass_button.dart

Component: GlassButton

Features:
- Press animation (${config.animationDuration}ms, scale ${config.pressScale})
- Haptic feedback (${config.defaultHapticType} impact)
- BackdropFilter blur (${config.defaultBlurStrength}px)
- Dual shadow technique
- Light simulation gradient
- Loading state support
- Optional noise overlay

Visual Enhancement:
- Background alpha: ${config.backgroundAlpha}
- Border color: ${config.borderColor}
- Light simulation: ${config.enableLightSimulationByDefault ? "enabled" : "disabled"}

Usage:
\`\`\`dart
GlassButton(
  text: 'Click Me',
  onPressed: () => print('Pressed!'),
  enablePressAnimation: true,
  enableHaptics: true,
)
\`\`\`

lib/widgets/glass_button.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateGlassBottomSheet(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateGlassBottomSheetInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_GLASS_BOTTOMSHEET_CONFIG, ...input.config };

  // Compile template
  const template = Handlebars.compile(GLASS_BOTTOMSHEET_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Glass Bottom Sheet Component for ${project.name}

Files generated:
- lib/widgets/glass_bottomsheet.dart

Components:
- GlassBottomSheet: Widget component
- showGlassBottomSheet(): Helper function

Features:
- BackdropFilter blur effect (${config.defaultBlurStrength}px)
- Adaptive theming (light/dark mode)
- Rounded top corners (${config.defaultBorderRadius}px)
- Drag-to-dismiss support
- Helper function for easy usage

Dark mode alpha: ${config.darkModeAlpha}
Light mode alpha: ${config.lightModeAlpha}

Usage:
\`\`\`dart
showGlassBottomSheet(
  context: context,
  child: Padding(
    padding: EdgeInsets.all(20),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Bottom Sheet Title'),
        SizedBox(height: 16),
        Text('Content goes here'),
      ],
    ),
  ),
);
\`\`\`

lib/widgets/glass_bottomsheet.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// PHASE 3: VISUAL EFFECTS HANDLERS
// ============================================================================

async function handleGenerateShadows(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateShadowSystemInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_SHADOW_CONFIG, ...input.config };

  // Register helper for Flutter color conversion
  Handlebars.registerHelper("flutterColor", (color: string) => {
    return hexToFlutterColor(color);
  });

  // Compile template
  const template = Handlebars.compile(SHADOW_SYSTEM_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Shadow System for ${project.name}

Files generated:
- lib/theme/app_shadows.dart

Shadow Types:
- AppShadows.glass: Dual shadows for glass surfaces
- AppShadows.card: Subtle elevation shadows
- AppShadows.elevated: Strong shadows with color tint

Features:
- Dual shadow approach (ambient + definition)
- Realistic depth and separation
- Primary color tinted elevated shadows
- Flutter 3.29+ withValues API

Glass Shadow:
- Ambient: alpha ${config.glass.ambient.alpha}, blur ${config.glass.ambient.blur}px, offset (${config.glass.ambient.offsetX}, ${config.glass.ambient.offsetY})
- Definition: alpha ${config.glass.definition.alpha}, blur ${config.glass.definition.blur}px, offset (${config.glass.definition.offsetX}, ${config.glass.definition.offsetY})

Card Shadow:
- Ambient: alpha ${config.card.ambient.alpha}, blur ${config.card.ambient.blur}px
- Definition: alpha ${config.card.definition.alpha}, blur ${config.card.definition.blur}px

Elevated Shadow:
- Primary color: ${config.primaryColor}
- Ambient: alpha ${config.elevated.ambient.alpha}, blur ${config.elevated.ambient.blur}px

Usage:
\`\`\`dart
Container(
  decoration: BoxDecoration(
    boxShadow: AppShadows.glass, // or .card or .elevated
    borderRadius: BorderRadius.circular(20),
  ),
  child: YourWidget(),
)
\`\`\`

lib/theme/app_shadows.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateTextShadows(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateTextShadowInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_TEXT_SHADOW_CONFIG, ...input.config };

  // Register helper for Flutter color conversion
  Handlebars.registerHelper("flutterColor", (color: string) => {
    return hexToFlutterColor(color);
  });

  // Compile template
  const template = Handlebars.compile(TEXT_SHADOW_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Text Shadow System for ${project.name}

Files generated:
- lib/theme/app_text_shadows.dart

Text Shadow Levels:
- AppTextShadows.subtle: 15% opacity for secondary text
- AppTextShadows.medium: 30% opacity for headings
- AppTextShadows.strong: 40% opacity for emphasis
- AppTextShadows.bold: 50% opacity for maximum contrast

Pre-Styled Text Styles:
- AppTextStyles.heading: ${config.styles.heading.fontSize}px, ${config.styles.heading.fontWeight}, medium shadow
- AppTextStyles.subheading: ${config.styles.subheading.fontSize}px, ${config.styles.subheading.fontWeight}, subtle shadow
- AppTextStyles.body: ${config.styles.body.fontSize}px, ${config.styles.body.fontWeight}, no shadow
- AppTextStyles.caption: ${config.styles.caption.fontSize}px, ${config.styles.caption.fontWeight}, no shadow
- AppTextStyles.display: ${config.styles.display.fontSize}px, ${config.styles.display.fontWeight}, bold shadow

Features:
- 4-level text shadow hierarchy
- Pre-configured text styles for glass backgrounds
- Optimized for readability on gradients
- Flutter 3.29+ const Shadow API

Usage:
\`\`\`dart
Text(
  'Heading Text',
  style: AppTextStyles.heading,
)

// Or custom shadow
Text(
  'Custom Text',
  style: TextStyle(
    fontSize: 24,
    color: Colors.white,
    shadows: AppTextShadows.medium,
  ),
)
\`\`\`

lib/theme/app_text_shadows.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateNoiseOverlay(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateNoiseOverlayInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_NOISE_CONFIG, ...input.config };

  // Compile template
  const template = Handlebars.compile(NOISE_OVERLAY_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Noise Overlay Widget for ${project.name}

Files generated:
- lib/widgets/noise_overlay.dart

Components:
- StaticNoiseOverlay: Widget wrapper
- _StaticNoisePainter: CustomPainter for rendering
- NoisePresets: Pre-configured presets

Features:
- Seeded random (seed: ${config.seed}) for consistency
- Efficient CustomPainter rendering
- Configurable opacity and density
- Pre-built presets (verySubtle, subtle, medium, strong)

Configuration:
- Default opacity: ${config.defaultOpacity}
- Default density: ${config.defaultDensity}
- Particle size: ${config.particleSize}px
- Seed: ${config.seed} (deterministic)

Usage:
\`\`\`dart
StaticNoiseOverlay(
  opacity: 0.06,
  density: 0.3,
  child: YourGlassWidget(),
)

// Or use preset
NoisePresets.subtle(
  child: YourGlassWidget(),
)
\`\`\`

lib/widgets/noise_overlay.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateLightSimulation(
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateLightSimulationInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = { ...DEFAULT_LIGHT_CONFIG, ...input.config };

  // Compile template
  const template = Handlebars.compile(LIGHT_SIMULATION_SOURCE);
  const code = template(config);

  return {
    content: [
      {
        type: "text",
        text: `Generated Light Simulation System for ${project.name}

Files generated:
- lib/theme/app_light_simulation.dart

Components:
- AppLightSimulation: Static helper class
- LightSimulationMixin: Mixin for widgets

Light Simulation Methods:
- AppLightSimulation.standard(): Default top-to-bottom fade
- AppLightSimulation.subtle(): Lower intensity (${config.presets.subtle.intensity})
- AppLightSimulation.strong(): Higher intensity (${config.presets.strong.intensity})
- AppLightSimulation.reversed(): Bottom-to-top fade
- AppLightSimulation.diagonal(): Top-left to bottom-right
- AppLightSimulation.extended(): Longer gradient transition
- AppLightSimulation.short(): Quick transition

Configuration:
- Default intensity: ${config.defaultIntensity}
- Default gradient stops: ${config.defaultStopStart} - ${config.defaultStopEnd}

Features:
- Realistic glass lighting effects
- Multiple directional patterns
- Customizable intensity and gradients
- Applied via foregroundDecoration

Usage:
\`\`\`dart
Container(
  decoration: BoxDecoration(...), // Background
  foregroundDecoration: AppLightSimulation.standard(
    BorderRadius.circular(20),
  ),
  child: YourContent(),
)

// Or custom
Container(
  foregroundDecoration: AppLightSimulation.createDecoration(
    borderRadius: BorderRadius.circular(20),
    intensity: 0.2,
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  ),
  child: YourContent(),
)
\`\`\`

lib/theme/app_light_simulation.dart:
\`\`\`dart
${code}
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleDesignTool(
  toolName: string,
  args: unknown,
  ctx: DesignToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (toolName) {
    case "design_generate_theme":
      return handleGenerateTheme(args, ctx);
    case "design_create_animation":
      return handleCreateAnimation(args, ctx);
    case "design_generate_tokens":
      return handleGenerateDesignTokens(args, ctx);
    // EDC Design System tools
    case "design_generate_edc_tokens":
      return handleGenerateEdcTokens(args, ctx);
    case "design_generate_gradients":
      return handleGenerateGlassGradients(args, ctx);
    case "design_generate_wcag":
      return handleGenerateWcag(args, ctx);
    // Glass Component tools
    case "design_generate_glass_card":
      return handleGenerateGlassCard(args, ctx);
    case "design_generate_glass_button":
      return handleGenerateGlassButton(args, ctx);
    case "design_generate_glass_bottomsheet":
      return handleGenerateGlassBottomSheet(args, ctx);
    // Phase 3: Visual Effects tools
    case "design_generate_shadows":
      return handleGenerateShadows(args, ctx);
    case "design_generate_text_shadows":
      return handleGenerateTextShadows(args, ctx);
    case "design_generate_noise_overlay":
      return handleGenerateNoiseOverlay(args, ctx);
    case "design_generate_light_simulation":
      return handleGenerateLightSimulation(args, ctx);
    default:
      throw new Error(`Unknown design tool: ${toolName}`);
  }
}

// ============================================================================
// CODE GENERATORS
// ============================================================================

function generateThemeCode(
  primaryColor: string,
  accentColor: string,
  fontFamily: string,
  borderRadius: number,
  darkMode: boolean
): string {
  const primaryFlutter = hexToFlutterColor(primaryColor);
  const accentFlutter = hexToFlutterColor(accentColor);

  return `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static final Color primaryColor = ${primaryFlutter};
  static final Color accentColor = ${accentFlutter};

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.${fontFamily.toLowerCase()}TextTheme(),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(${borderRadius}),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(${borderRadius * 1.5}),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.grey.shade100,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(${borderRadius}),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(${borderRadius}),
        borderSide: BorderSide(color: primaryColor, width: 2),
      ),
    ),
  );

  ${darkMode ? `static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
    ),
    textTheme: GoogleFonts.${fontFamily.toLowerCase()}TextTheme(
      ThemeData.dark().textTheme,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(${borderRadius}),
        ),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 2,
      color: Colors.grey.shade900,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(${borderRadius * 1.5}),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.grey.shade800,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(${borderRadius}),
        borderSide: BorderSide.none,
      ),
    ),
  );` : ""}

  // Custom colors
  static const Map<String, Color> customColors = {
    'success': Color(0xFF4CAF50),
    'warning': Color(0xFFFFC107),
    'error': Color(0xFFF44336),
    'info': Color(0xFF2196F3),
  };

  // Gradient
  static LinearGradient get primaryGradient => LinearGradient(
    colors: [primaryColor, accentColor],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}`;
}

function generateAnimationCode(
  type: AnimationType,
  duration: number,
  curve: CurveType,
  repeat: boolean,
  reverse: boolean
): string {
  const flutterCurve = curveToFlutter(curve);

  const transitionWidget = (() => {
    switch (type) {
      case "fade":
        return `FadeTransition(
      opacity: _animation,
      child: widget.child,
    )`;
      case "slide":
        return `SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.3),
        end: Offset.zero,
      ).animate(_animation),
      child: widget.child,
    )`;
      case "scale":
        return `ScaleTransition(
      scale: _animation,
      child: widget.child,
    )`;
      case "rotation":
        return `RotationTransition(
      turns: _animation,
      child: widget.child,
    )`;
      default:
        return "widget.child";
    }
  })();

  return `import 'package:flutter/material.dart';

class ${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidget extends StatefulWidget {
  final Widget child;
  final bool autoPlay;

  const ${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidget({
    super.key,
    required this.child,
    this.autoPlay = true,
  });

  @override
  State<${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidget> createState() =>
      _${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidgetState();
}

class _${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidgetState
    extends State<${type.charAt(0).toUpperCase() + type.slice(1)}AnimationWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: ${duration}),
      vsync: this,
    );

    _animation = CurvedAnimation(
      parent: _controller,
      curve: ${flutterCurve},
    );

    if (widget.autoPlay) {
      ${repeat ? `_controller.repeat(${reverse ? "reverse: true" : ""});` : "_controller.forward();"}
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void play() => _controller.forward();
  void reverse() => _controller.reverse();
  void reset() => _controller.reset();

  @override
  Widget build(BuildContext context) {
    return ${transitionWidget};
  }
}`;
}

function generateDartTokens(config: DesignModuleConfig | undefined): string {
  const theme = config?.theme;
  return `// GENERATED CODE - Design Tokens
// Do not modify by hand

import 'package:flutter/material.dart';

class DesignTokens {
  // Colors
  static const Color primary = ${hexToFlutterColor(theme?.colors.primary || "#2196F3")};
  static const Color secondary = ${hexToFlutterColor(theme?.colors.secondary || "#03DAC6")};
  static const Color accent = ${hexToFlutterColor(theme?.colors.accent || "#FF4081")};
  static const Color background = ${hexToFlutterColor(theme?.colors.background || "#FFFFFF")};
  static const Color surface = ${hexToFlutterColor(theme?.colors.surface || "#FAFAFA")};
  static const Color error = ${hexToFlutterColor(theme?.colors.error || "#F44336")};
  static const Color success = ${hexToFlutterColor(theme?.colors.success || "#4CAF50")};
  static const Color warning = ${hexToFlutterColor(theme?.colors.warning || "#FFC107")};
  static const Color info = ${hexToFlutterColor(theme?.colors.info || "#2196F3")};

  // Spacing
  static const double spacingXs = ${theme?.spacing.xs || 4};
  static const double spacingSm = ${theme?.spacing.sm || 8};
  static const double spacingMd = ${theme?.spacing.md || 16};
  static const double spacingLg = ${theme?.spacing.lg || 24};
  static const double spacingXl = ${theme?.spacing.xl || 32};
  static const double spacingXxl = ${theme?.spacing.xxl || 48};

  // Border Radius
  static const double radiusNone = ${theme?.borderRadius.none || 0};
  static const double radiusSm = ${theme?.borderRadius.sm || 4};
  static const double radiusMd = ${theme?.borderRadius.md || 8};
  static const double radiusLg = ${theme?.borderRadius.lg || 16};
  static const double radiusFull = ${theme?.borderRadius.full || 9999};

  // Typography
  static const String fontFamily = '${theme?.typography.fontFamily || "Roboto"}';
  static const double headlineLarge = ${theme?.typography.headlineLarge || 32};
  static const double headlineMedium = ${theme?.typography.headlineMedium || 28};
  static const double headlineSmall = ${theme?.typography.headlineSmall || 24};
  static const double bodyLarge = ${theme?.typography.bodyLarge || 16};
  static const double bodyMedium = ${theme?.typography.bodyMedium || 14};
  static const double bodySmall = ${theme?.typography.bodySmall || 12};
}`;
}

function generateJsonTokens(config: DesignModuleConfig | undefined): string {
  const theme = config?.theme;
  return JSON.stringify(
    {
      colors: theme?.colors || {},
      spacing: theme?.spacing || {},
      borderRadius: theme?.borderRadius || {},
      typography: theme?.typography || {},
    },
    null,
    2
  );
}

function generateCssTokens(config: DesignModuleConfig | undefined): string {
  const theme = config?.theme;
  return `:root {
  /* Colors */
  --color-primary: ${theme?.colors.primary || "#2196F3"};
  --color-secondary: ${theme?.colors.secondary || "#03DAC6"};
  --color-accent: ${theme?.colors.accent || "#FF4081"};
  --color-background: ${theme?.colors.background || "#FFFFFF"};
  --color-surface: ${theme?.colors.surface || "#FAFAFA"};
  --color-error: ${theme?.colors.error || "#F44336"};
  --color-success: ${theme?.colors.success || "#4CAF50"};
  --color-warning: ${theme?.colors.warning || "#FFC107"};
  --color-info: ${theme?.colors.info || "#2196F3"};

  /* Spacing */
  --spacing-xs: ${theme?.spacing.xs || 4}px;
  --spacing-sm: ${theme?.spacing.sm || 8}px;
  --spacing-md: ${theme?.spacing.md || 16}px;
  --spacing-lg: ${theme?.spacing.lg || 24}px;
  --spacing-xl: ${theme?.spacing.xl || 32}px;
  --spacing-xxl: ${theme?.spacing.xxl || 48}px;

  /* Border Radius */
  --radius-none: ${theme?.borderRadius.none || 0}px;
  --radius-sm: ${theme?.borderRadius.sm || 4}px;
  --radius-md: ${theme?.borderRadius.md || 8}px;
  --radius-lg: ${theme?.borderRadius.lg || 16}px;
  --radius-full: ${theme?.borderRadius.full || 9999}px;

  /* Typography */
  --font-family: '${theme?.typography.fontFamily || "Roboto"}', sans-serif;
  --font-headline-large: ${theme?.typography.headlineLarge || 32}px;
  --font-headline-medium: ${theme?.typography.headlineMedium || 28}px;
  --font-headline-small: ${theme?.typography.headlineSmall || 24}px;
  --font-body-large: ${theme?.typography.bodyLarge || 16}px;
  --font-body-medium: ${theme?.typography.bodyMedium || 14}px;
  --font-body-small: ${theme?.typography.bodySmall || 12}px;
}`;
}

// ============================================================================
// EDC DESIGN SYSTEM CODE GENERATORS
// ============================================================================

function generateEdcTokensCode(config: EdcDesignTokensConfig): string {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND
// EDC Design Token System
// Generated by offline-flutter-pwa-builder

import 'package:flutter/material.dart';

// ============================================================================
// THEME EXTENSION - Use with Theme.of(context).extension<AppThemeExtension>()
// ============================================================================

@immutable
class AppThemeExtension extends ThemeExtension<AppThemeExtension> {
  const AppThemeExtension({
    required this.appSpacing,
    required this.appColors,
    required this.appRadius,
    required this.appBorders,
    required this.appAnimations,
    required this.appSizes,
    required this.appBlur,
  });

  final AppSpacing appSpacing;
  final AppColors appColors;
  final AppRadius appRadius;
  final AppBorders appBorders;
  final AppAnimations appAnimations;
  final AppSizes appSizes;
  final AppBlur appBlur;

  @override
  ThemeExtension<AppThemeExtension> copyWith({
    AppSpacing? appSpacing,
    AppColors? appColors,
    AppRadius? appRadius,
    AppBorders? appBorders,
    AppAnimations? appAnimations,
    AppSizes? appSizes,
    AppBlur? appBlur,
  }) {
    return AppThemeExtension(
      appSpacing: appSpacing ?? this.appSpacing,
      appColors: appColors ?? this.appColors,
      appRadius: appRadius ?? this.appRadius,
      appBorders: appBorders ?? this.appBorders,
      appAnimations: appAnimations ?? this.appAnimations,
      appSizes: appSizes ?? this.appSizes,
      appBlur: appBlur ?? this.appBlur,
    );
  }

  @override
  ThemeExtension<AppThemeExtension> lerp(
    ThemeExtension<AppThemeExtension>? other,
    double t,
  ) {
    if (other is! AppThemeExtension) {
      return this;
    }
    return this; // Tokens don't need interpolation
  }

  static const AppThemeExtension defaults = AppThemeExtension(
    appSpacing: AppSpacing(),
    appColors: AppColors(),
    appRadius: AppRadius(),
    appBorders: AppBorders(),
    appAnimations: AppAnimations(),
    appSizes: AppSizes(),
    appBlur: AppBlur(),
  );
}

// ============================================================================
// SPACING TOKENS
// ============================================================================

class AppSpacing {
  const AppSpacing();

  static const double xs = ${config.spacing.xs};
  static const double sm = ${config.spacing.sm};
  static const double md = ${config.spacing.md};
  static const double lg = ${config.spacing.lg};
  static const double xl = ${config.spacing.xl};
  static const double xxl = ${config.spacing.xxl};
  static const double xxxl = ${config.spacing.xxxl};
  static const double huge = ${config.spacing.huge};

  static const EdgeInsets screenPadding = EdgeInsets.all(xl);
  static const EdgeInsets screenPaddingLarge = EdgeInsets.all(xxl);
  static const EdgeInsets cardPadding = EdgeInsets.all(lg);
  static const EdgeInsets cardPaddingLarge = EdgeInsets.all(xl);
  static const EdgeInsets buttonPadding = EdgeInsets.symmetric(horizontal: xxl, vertical: lg);
  static const EdgeInsets inputPadding = EdgeInsets.symmetric(horizontal: xl, vertical: lg);

  static const EdgeInsets horizontalSm = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets horizontalMd = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets horizontalLg = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets horizontalXl = EdgeInsets.symmetric(horizontal: xl);
  static const EdgeInsets horizontalXxl = EdgeInsets.symmetric(horizontal: xxl);

  static const EdgeInsets verticalSm = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets verticalMd = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets verticalLg = EdgeInsets.symmetric(vertical: lg);
  static const EdgeInsets verticalXl = EdgeInsets.symmetric(vertical: xl);
  static const EdgeInsets verticalXxl = EdgeInsets.symmetric(vertical: xxl);

  static const double gapXs = xs;
  static const double gapSm = sm;
  static const double gapMd = md;
  static const double gapLg = lg;
  static const double gapXl = xl;
  static const double gapXxl = xxl;
}

// ============================================================================
// COLOR TOKENS
// ============================================================================

class AppColors {
  const AppColors();

  static const Color primary = ${hexToFlutterColor(config.colors.primary)};
  static const Color accent = ${hexToFlutterColor(config.colors.accent)};
  static const Color secondary = ${hexToFlutterColor(config.colors.secondary)};
  ${config.colors.gold ? `static const Color gold = ${hexToFlutterColor(config.colors.gold)};` : ""}

  static const Color primaryText = Colors.white;
  static final Color secondaryText = Colors.white.withValues(alpha: ${config.colors.textAlpha.secondary});
  static final Color tertiaryText = Colors.white.withValues(alpha: ${config.colors.textAlpha.tertiary});
  static final Color disabledText = Colors.white.withValues(alpha: ${config.colors.textAlpha.disabled});

  static const Color darkPrimaryText = Colors.black87;
  static final Color darkSecondaryText = Colors.black.withValues(alpha: 0.6);
  static final Color darkTertiaryText = Colors.black.withValues(alpha: 0.4);

  static final Color accentSubtle = accent.withValues(alpha: 0.6);
  static final Color accentVerySubtle = accent.withValues(alpha: 0.3);

  static final Color glassOverlayLight = Colors.white.withValues(alpha: ${config.colors.glassAlpha.light});
  static final Color glassOverlayMedium = Colors.white.withValues(alpha: ${config.colors.glassAlpha.medium});
  static final Color glassOverlaySubtle = Colors.white.withValues(alpha: ${config.colors.glassAlpha.subtle});

  static final Color primaryBorder = Colors.white.withValues(alpha: ${config.colors.borderAlpha.primary});
  static final Color accentBorder = accent.withValues(alpha: ${config.colors.borderAlpha.accent});
  static final Color subtleBorder = Colors.white.withValues(alpha: ${config.colors.borderAlpha.subtle});

  static const Color success = ${hexToFlutterColor(config.colors.success)};
  static const Color warning = ${hexToFlutterColor(config.colors.warning)};
  static const Color error = ${hexToFlutterColor(config.colors.error)};
  static const Color info = ${hexToFlutterColor(config.colors.info)};
}

// ============================================================================
// RADIUS TOKENS
// ============================================================================

class AppRadius {
  const AppRadius();

  static const double xs = ${config.radius.xs};
  static const double sm = ${config.radius.sm};
  static const double md = ${config.radius.md};
  static const double lg = ${config.radius.lg};
  static const double xl = ${config.radius.xl};
  static const double xxl = ${config.radius.xxl};
  static const double pill = ${config.radius.pill};

  static final BorderRadius smallRadius = BorderRadius.circular(sm);
  static final BorderRadius mediumRadius = BorderRadius.circular(md);
  static final BorderRadius cardRadius = BorderRadius.circular(lg);
  static final BorderRadius largeCardRadius = BorderRadius.circular(xl);
  static final BorderRadius buttonRadius = BorderRadius.circular(xxl);
  static final BorderRadius pillRadius = BorderRadius.circular(pill);
}

// ============================================================================
// BORDER TOKENS
// ============================================================================

class AppBorders {
  const AppBorders();

  static final Border primaryGlass = Border.all(
    color: AppColors.accentBorder,
    width: 2.0,
  );

  static final Border primaryGlassSubtle = Border.all(
    color: AppColors.accent.withValues(alpha: 0.5),
    width: 1.5,
  );

  static final Border primaryGlassThin = Border.all(
    color: AppColors.accent.withValues(alpha: 0.3),
    width: 1.0,
  );

  static final Border subtle = Border.all(
    color: AppColors.primaryBorder,
    width: 1.0,
  );

  static final Border subtleThick = Border.all(
    color: AppColors.primaryBorder,
    width: 2.0,
  );

  static final Border iconContainer = Border.all(
    color: AppColors.accentBorder,
    width: 1.5,
  );

  static const Border none = Border();
}

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

class AppAnimations {
  const AppAnimations();

  static const Duration instant = Duration(milliseconds: ${config.animations.instant});
  static const Duration fast = Duration(milliseconds: ${config.animations.fast});
  static const Duration normal = Duration(milliseconds: ${config.animations.normal});
  static const Duration slow = Duration(milliseconds: ${config.animations.slow});
  static const Duration verySlow = Duration(milliseconds: ${config.animations.verySlow});

  static const Duration sequentialShort = Duration(milliseconds: ${config.animations.sequentialShort});
  static const Duration sequentialMedium = Duration(milliseconds: ${config.animations.sequentialMedium});
  static const Duration sequentialLong = Duration(milliseconds: ${config.animations.sequentialLong});

  static const Duration fadeIn = slow;
  static const Duration slideIn = normal;
  static const Duration scaleIn = normal;
  static const Duration shimmer = Duration(milliseconds: ${config.animations.shimmer});

  static const Duration baseDelay = slow;
  static const Duration sectionDelay = Duration(milliseconds: ${config.animations.sectionDelay});
  static const Duration press = Duration(milliseconds: ${config.animations.press});
}

// ============================================================================
// SIZE TOKENS
// ============================================================================

class AppSizes {
  const AppSizes();

  static const double iconXs = ${config.sizes.iconXs};
  static const double iconSm = ${config.sizes.iconSm};
  static const double iconMd = ${config.sizes.iconMd};
  static const double iconLg = ${config.sizes.iconLg};
  static const double iconXl = ${config.sizes.iconXl};

  static const double avatarSm = ${config.sizes.avatarSm};
  static const double avatarMd = ${config.sizes.avatarMd};
  static const double avatarLg = ${config.sizes.avatarLg};
  static const double avatarXl = ${config.sizes.avatarXl};

  static const double statCardWidth = ${config.sizes.statCardWidth};
  static const double statCardHeight = ${config.sizes.statCardHeight};
  static const double quickActionWidth = ${config.sizes.quickActionWidth};
  static const double quickActionHeight = ${config.sizes.quickActionHeight};

  static const double appBarHeight = ${config.sizes.appBarHeight};
  static const double appBarIconSize = iconMd;

  static const double buttonHeightSm = ${config.sizes.buttonHeightSm};
  static const double buttonHeightMd = ${config.sizes.buttonHeightMd};
  static const double buttonHeightLg = ${config.sizes.buttonHeightLg};
}

// ============================================================================
// BLUR TOKENS
// ============================================================================

class AppBlur {
  const AppBlur();

  static const double light = ${config.blur.light};
  static const double medium = ${config.blur.medium};
  static const double strong = ${config.blur.strong};
  static const double veryStrong = ${config.blur.veryStrong};
}`;
}

function generateGlassGradientsCode(config: EdcGlassGradientsConfig): string {
  return `// GENERATED CODE - DO NOT MODIFY BY HAND
// Glassmorphic Gradient System
// Generated by offline-flutter-pwa-builder

import 'package:flutter/material.dart';

class AppGradients {
  AppGradients._();

  // ============================================================================
  // GLASS GRADIENTS
  // ============================================================================

  static const LinearGradient glassSubtle = LinearGradient(
    colors: [
      Color(0x${alphaToHex(config.glass.subtle.start)}FFFFFF),
      Color(0x${alphaToHex(config.glass.subtle.end)}FFFFFF),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassMedium = LinearGradient(
    colors: [
      Color(0x${alphaToHex(config.glass.medium.start)}FFFFFF),
      Color(0x${alphaToHex(config.glass.medium.end)}FFFFFF),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassStrong = LinearGradient(
    colors: [
      Color(0x${alphaToHex(config.glass.strong.start)}FFFFFF),
      Color(0x${alphaToHex(config.glass.strong.end)}FFFFFF),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassVeryStrong = LinearGradient(
    colors: [
      Color(0x${alphaToHex(config.glass.veryStrong.start)}FFFFFF),
      Color(0x${alphaToHex(config.glass.veryStrong.end)}FFFFFF),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ============================================================================
  // THEME GRADIENTS
  // ============================================================================

  static const LinearGradient primary = LinearGradient(
    colors: [
      ${hexToFlutterColor(config.colors.primary)},
      ${hexToFlutterColor(config.colors.accent)},
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  ${config.colors.gold ? `static const LinearGradient goldAccent = LinearGradient(
    colors: [
      Color(0x4D${extractHexColor(config.colors.gold)}),
      Color(0x1A${extractHexColor(config.colors.gold)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldBorder = LinearGradient(
    colors: [
      Color(0x99${extractHexColor(config.colors.gold)}),
      Color(0x66${extractHexColor(config.colors.gold)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );` : ""}

  // ============================================================================
  // BACKGROUND GRADIENTS
  // ============================================================================

  static const LinearGradient backgroundDark = LinearGradient(
    colors: [
      ${hexToFlutterColor(config.background.dark.start)},
      ${hexToFlutterColor(config.background.dark.middle)},
      ${hexToFlutterColor(config.background.dark.end)},
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient backgroundLight = LinearGradient(
    colors: [
      ${hexToFlutterColor(config.background.light.start)},
      ${hexToFlutterColor(config.background.light.end)},
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // ============================================================================
  // BUTTON GRADIENTS
  // ============================================================================

  static const LinearGradient button = glassMedium;

  static const LinearGradient buttonDisabled = LinearGradient(
    colors: [
      Color(0x1A808080),
      Color(0x0D808080),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ============================================================================
  // STATUS GRADIENTS
  // ============================================================================

  static const LinearGradient success = LinearGradient(
    colors: [
      Color(0x4D${extractHexColor(config.status.success)}),
      Color(0x1A${extractHexColor(config.status.success)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warning = LinearGradient(
    colors: [
      Color(0x4D${extractHexColor(config.status.warning)}),
      Color(0x1A${extractHexColor(config.status.warning)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient error = LinearGradient(
    colors: [
      Color(0x4D${extractHexColor(config.status.error)}),
      Color(0x1A${extractHexColor(config.status.error)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient info = LinearGradient(
    colors: [
      Color(0x4D${extractHexColor(config.status.info)}),
      Color(0x1A${extractHexColor(config.status.info)}),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  static LinearGradient customGlass(double startAlpha, double endAlpha) {
    return LinearGradient(
      colors: [
        Color.fromRGBO(255, 255, 255, startAlpha),
        Color.fromRGBO(255, 255, 255, endAlpha),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static LinearGradient customColored(
    Color color, {
    double startAlpha = 0.30,
    double endAlpha = 0.10,
  }) {
    return LinearGradient(
      colors: [
        color.withValues(alpha: startAlpha),
        color.withValues(alpha: endAlpha),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
  }

  static RadialGradient spotlight(
    Color color,
    double maxAlpha, {
    double radius = 0.8,
  }) {
    return RadialGradient(
      colors: [
        color.withValues(alpha: maxAlpha),
        color.withValues(alpha: 0.0),
      ],
      radius: radius,
    );
  }

  static LinearGradient getGlassByLevel(int level) {
    switch (level) {
      case 0:
        return glassSubtle;
      case 1:
        return glassMedium;
      case 2:
        return glassStrong;
      case 3:
        return glassVeryStrong;
      default:
        return glassMedium;
    }
  }

  static LinearGradient getStatusGradient(String type) {
    switch (type.toLowerCase()) {
      case 'success':
        return success;
      case 'warning':
        return warning;
      case 'error':
        return error;
      case 'info':
        return info;
      default:
        return info;
    }
  }
}`;
}

function generateWcagContrastCode(config: EdcWcagContrastConfig): string {
  const verificationCode = config.includeVerification && config.verificationPairs ? `
  // ============================================================================
  // THEME VERIFICATION (Debug Only)
  // ============================================================================

  static void verifyThemeContrast() {
    debugPrint('\\n===============================================');
    debugPrint('  WCAG Contrast Verification Report');
    debugPrint('===============================================\\n');

    final testPairs = <String, List<Color>>{
${config.verificationPairs.map(p => `      '${p.name}': [${p.foreground}, ${p.background}],`).join("\n")}
    };

    testPairs.forEach((name, colors) {
      final report = getContrastReport(colors[0], colors[1]);
      debugPrint('  \$name: \$report');
    });

    debugPrint('\\n===============================================\\n');
  }` : "";

  return `// GENERATED CODE - DO NOT MODIFY BY HAND
// WCAG Contrast Calculator
// Generated by offline-flutter-pwa-builder

import 'dart:math';
import 'package:flutter/material.dart';

class WCAGContrast {
  WCAGContrast._();

  // ============================================================================
  // WCAG THRESHOLDS
  // ============================================================================

  static const double wcagAANormalText = 4.5;
  static const double wcagAALargeText = 3.0;
  static const double wcagAAANormalText = 7.0;
  static const double wcagAAALargeText = 4.5;
  static const double wcagUIComponents = 3.0;

  // ============================================================================
  // CORE CALCULATIONS
  // ============================================================================

  static double _relativeLuminance(Color color) {
    double r = color.red / 255.0;
    double g = color.green / 255.0;
    double b = color.blue / 255.0;

    r = (r <= 0.03928) ? r / 12.92 : pow((r + 0.055) / 1.055, 2.4).toDouble();
    g = (g <= 0.03928) ? g / 12.92 : pow((g + 0.055) / 1.055, 2.4).toDouble();
    b = (b <= 0.03928) ? b / 12.92 : pow((b + 0.055) / 1.055, 2.4).toDouble();

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  static double contrastRatio(Color foreground, Color background) {
    double lum1 = _relativeLuminance(foreground) + 0.05;
    double lum2 = _relativeLuminance(background) + 0.05;
    return lum1 > lum2 ? lum1 / lum2 : lum2 / lum1;
  }

  // ============================================================================
  // WCAG COMPLIANCE CHECKS
  // ============================================================================

  static bool meetsWcagAA(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAANormalText;
  }

  static bool meetsWcagAALarge(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAALargeText;
  }

  static bool meetsWcagAAA(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAAANormalText;
  }

  static bool meetsWcagAAALarge(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagAAALargeText;
  }

  static bool meetsUIComponentRequirement(Color foreground, Color background) {
    return contrastRatio(foreground, background) >= wcagUIComponents;
  }

  // ============================================================================
  // REPORTING
  // ============================================================================

  static String getContrastReport(Color foreground, Color background) {
    double ratio = contrastRatio(foreground, background);
    bool passAA = ratio >= wcagAANormalText;
    bool passAAA = ratio >= wcagAAANormalText;

    final aaStatus = passAA ? '[AA Pass]' : '[AA Fail]';
    final aaaStatus = passAAA ? '[AAA Pass]' : '[AAA Fail]';

    return '\${ratio.toStringAsFixed(2)}:1 \$aaStatus \$aaaStatus';
  }

  static Map<String, dynamic> getDetailedReport(Color foreground, Color background) {
    final ratio = contrastRatio(foreground, background);
    return {
      'ratio': ratio,
      'aa_normal': ratio >= wcagAANormalText,
      'aa_large': ratio >= wcagAALargeText,
      'aaa_normal': ratio >= wcagAAANormalText,
      'aaa_large': ratio >= wcagAAALargeText,
      'ui_components': ratio >= wcagUIComponents,
    };
  }

  static Color? suggestAccessibleColor(
    Color foreground,
    Color background, {
    double targetRatio = wcagAANormalText,
  }) {
    final currentRatio = contrastRatio(foreground, background);
    if (currentRatio >= targetRatio) {
      return foreground;
    }

    Color? lighter = _adjustBrightness(foreground, 1.2, targetRatio, background);
    Color? darker = _adjustBrightness(foreground, 0.8, targetRatio, background);

    if (lighter != null && darker != null) {
      final lighterDiff = (lighter.computeLuminance() - foreground.computeLuminance()).abs();
      final darkerDiff = (darker.computeLuminance() - foreground.computeLuminance()).abs();
      return lighterDiff < darkerDiff ? lighter : darker;
    }

    return lighter ?? darker;
  }

  static Color? _adjustBrightness(
    Color color,
    double factor,
    double targetRatio,
    Color background,
  ) {
    Color adjusted = color;
    for (int i = 0; i < 20; i++) {
      final hsv = HSVColor.fromColor(adjusted);
      final newValue = (hsv.value * factor).clamp(0.0, 1.0);
      adjusted = hsv.withValue(newValue).toColor();

      if (contrastRatio(adjusted, background) >= targetRatio) {
        return adjusted;
      }
    }
    return null;
  }
${verificationCode}
}

// ============================================================================
// EXTENSION
// ============================================================================

extension WCAGColorExtension on Color {
  bool meetsWcagAA(Color background) {
    return WCAGContrast.meetsWcagAA(this, background);
  }

  bool meetsWcagAAA(Color background) {
    return WCAGContrast.meetsWcagAAA(this, background);
  }

  double contrastWith(Color background) {
    return WCAGContrast.contrastRatio(this, background);
  }

  String accessibilityReport(Color background) {
    return WCAGContrast.getContrastReport(this, background);
  }
}`;
}
