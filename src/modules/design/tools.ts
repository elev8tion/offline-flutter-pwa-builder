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
} from "./config.js";

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
