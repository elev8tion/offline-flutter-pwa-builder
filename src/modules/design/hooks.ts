/**
 * Design Module Hooks
 *
 * Lifecycle hooks for the Design module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  DesignModuleConfig,
  DEFAULT_DESIGN_CONFIG,
  hexToFlutterColor,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR DESIGN TEMPLATES
// ============================================================================

export function registerDesignHelpers(handlebars: typeof import("handlebars")): void {
  // Convert hex to Flutter color
  handlebars.registerHelper("flutterColor", (hex: string) => {
    return hexToFlutterColor(hex);
  });

  // Format spacing value
  handlebars.registerHelper("spacing", (value: number) => {
    return `${value}.0`;
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get design config from project modules
 */
function getDesignConfig(ctx: HookContext): DesignModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "design");
  return {
    ...DEFAULT_DESIGN_CONFIG,
    ...(moduleConfig?.config as Partial<DesignModuleConfig> ?? {}),
  };
}

export const designHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getDesignConfig(ctx);
    console.log(`[Design] Module installed`);
    console.log(`[Design] Primary Color: ${config.theme.colors.primary}`);
    console.log(`[Design] Font Family: ${config.theme.typography.fontFamily}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Design] Preparing theme and design tokens...");
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getDesignConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate theme file
    files.push(generateThemeFile(config));

    // 2. Generate design tokens
    if (config.generateDesignTokens) {
      files.push(generateDesignTokensFile(config));
    }

    // 3. Generate color extensions
    files.push(generateColorExtensions(config));

    // 4. Generate spacing constants
    files.push(generateSpacingConstants(config));

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Design] Generated theme and design system files");
  },

  /**
   * Called before build
   */
  beforeBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Design] Validating theme configuration...");
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Design] Build completed");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateThemeFile(config: DesignModuleConfig): GeneratedFile {
  const { theme } = config;
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// App Theme

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ${theme.name} {
  // Primary colors
  static final Color primaryColor = ${hexToFlutterColor(theme.colors.primary)};
  static final Color secondaryColor = ${hexToFlutterColor(theme.colors.secondary)};
  static final Color accentColor = ${hexToFlutterColor(theme.colors.accent)};

  // Light Theme
  static ThemeData lightTheme = ThemeData(
    useMaterial3: ${theme.useMaterial3},
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.${theme.typography.fontFamily.toLowerCase()}TextTheme(),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(${theme.borderRadius.md}),
        ),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(${theme.borderRadius.lg}),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.grey.shade100,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(${theme.borderRadius.md}),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(${theme.borderRadius.md}),
        borderSide: BorderSide(color: primaryColor, width: 2),
      ),
    ),
  );

  ${theme.supportDarkMode ? `// Dark Theme
  static ThemeData darkTheme = ThemeData(
    useMaterial3: ${theme.useMaterial3},
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
    ),
    textTheme: GoogleFonts.${theme.typography.fontFamily.toLowerCase()}TextTheme(
      ThemeData.dark().textTheme,
    ),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(${theme.borderRadius.md}),
        ),
      ),
    ),
    cardTheme: CardTheme(
      elevation: 2,
      color: Colors.grey.shade900,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(${theme.borderRadius.lg}),
      ),
    ),
  );` : ""}
}
`;

  return {
    path: "lib/theme/app_theme.dart",
    content,
  };
}

function generateDesignTokensFile(config: DesignModuleConfig): GeneratedFile {
  const { theme } = config;
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Design Tokens

import 'package:flutter/material.dart';

/// Design tokens for consistent styling across the app
class DesignTokens {
  // Colors
  static const Color colorPrimary = ${hexToFlutterColor(theme.colors.primary)};
  static const Color colorSecondary = ${hexToFlutterColor(theme.colors.secondary)};
  static const Color colorAccent = ${hexToFlutterColor(theme.colors.accent)};
  static const Color colorBackground = ${hexToFlutterColor(theme.colors.background)};
  static const Color colorSurface = ${hexToFlutterColor(theme.colors.surface)};
  static const Color colorError = ${hexToFlutterColor(theme.colors.error)};
  static const Color colorSuccess = ${hexToFlutterColor(theme.colors.success)};
  static const Color colorWarning = ${hexToFlutterColor(theme.colors.warning)};
  static const Color colorInfo = ${hexToFlutterColor(theme.colors.info)};

  // Spacing
  static const double spacingXs = ${theme.spacing.xs}.0;
  static const double spacingSm = ${theme.spacing.sm}.0;
  static const double spacingMd = ${theme.spacing.md}.0;
  static const double spacingLg = ${theme.spacing.lg}.0;
  static const double spacingXl = ${theme.spacing.xl}.0;
  static const double spacingXxl = ${theme.spacing.xxl}.0;

  // Border Radius
  static const double radiusNone = ${theme.borderRadius.none}.0;
  static const double radiusSm = ${theme.borderRadius.sm}.0;
  static const double radiusMd = ${theme.borderRadius.md}.0;
  static const double radiusLg = ${theme.borderRadius.lg}.0;
  static const double radiusFull = ${theme.borderRadius.full}.0;

  // Typography Sizes
  static const double fontHeadlineLarge = ${theme.typography.headlineLarge}.0;
  static const double fontHeadlineMedium = ${theme.typography.headlineMedium}.0;
  static const double fontHeadlineSmall = ${theme.typography.headlineSmall}.0;
  static const double fontBodyLarge = ${theme.typography.bodyLarge}.0;
  static const double fontBodyMedium = ${theme.typography.bodyMedium}.0;
  static const double fontBodySmall = ${theme.typography.bodySmall}.0;
  static const double fontLabelLarge = ${theme.typography.labelLarge}.0;

  // Font Family
  static const String fontFamily = '${theme.typography.fontFamily}';
}
`;

  return {
    path: "lib/theme/design_tokens.dart",
    content,
  };
}

function generateColorExtensions(config: DesignModuleConfig): GeneratedFile {
  const { theme } = config;
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Color Extensions

import 'package:flutter/material.dart';

/// Extension on BuildContext for easy color access
extension ColorExtension on BuildContext {
  ColorScheme get colors => Theme.of(this).colorScheme;

  Color get primaryColor => colors.primary;
  Color get secondaryColor => colors.secondary;
  Color get errorColor => colors.error;
  Color get surfaceColor => colors.surface;
  Color get backgroundColor => colors.background;
}

/// Custom color palette
class AppColors {
  static const Color success = ${hexToFlutterColor(theme.colors.success)};
  static const Color warning = ${hexToFlutterColor(theme.colors.warning)};
  static const Color info = ${hexToFlutterColor(theme.colors.info)};

  // Semantic colors
  static const Color positive = success;
  static const Color negative = ${hexToFlutterColor(theme.colors.error)};
  static const Color neutral = ${hexToFlutterColor(theme.colors.info)};
}
`;

  return {
    path: "lib/theme/color_extensions.dart",
    content,
  };
}

function generateSpacingConstants(config: DesignModuleConfig): GeneratedFile {
  const { theme } = config;
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Spacing Constants

import 'package:flutter/material.dart';

/// Spacing constants for consistent layouts
class Spacing {
  static const double xs = ${theme.spacing.xs}.0;
  static const double sm = ${theme.spacing.sm}.0;
  static const double md = ${theme.spacing.md}.0;
  static const double lg = ${theme.spacing.lg}.0;
  static const double xl = ${theme.spacing.xl}.0;
  static const double xxl = ${theme.spacing.xxl}.0;

  // EdgeInsets helpers
  static const EdgeInsets paddingXs = EdgeInsets.all(xs);
  static const EdgeInsets paddingSm = EdgeInsets.all(sm);
  static const EdgeInsets paddingMd = EdgeInsets.all(md);
  static const EdgeInsets paddingLg = EdgeInsets.all(lg);
  static const EdgeInsets paddingXl = EdgeInsets.all(xl);

  static const EdgeInsets horizontalSm = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets horizontalMd = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets horizontalLg = EdgeInsets.symmetric(horizontal: lg);

  static const EdgeInsets verticalSm = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets verticalMd = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets verticalLg = EdgeInsets.symmetric(vertical: lg);

  // SizedBox helpers
  static const SizedBox gapXs = SizedBox(width: xs, height: xs);
  static const SizedBox gapSm = SizedBox(width: sm, height: sm);
  static const SizedBox gapMd = SizedBox(width: md, height: md);
  static const SizedBox gapLg = SizedBox(width: lg, height: lg);
  static const SizedBox gapXl = SizedBox(width: xl, height: xl);

  static const SizedBox horizontalGapXs = SizedBox(width: xs);
  static const SizedBox horizontalGapSm = SizedBox(width: sm);
  static const SizedBox horizontalGapMd = SizedBox(width: md);
  static const SizedBox horizontalGapLg = SizedBox(width: lg);

  static const SizedBox verticalGapXs = SizedBox(height: xs);
  static const SizedBox verticalGapSm = SizedBox(height: sm);
  static const SizedBox verticalGapMd = SizedBox(height: md);
  static const SizedBox verticalGapLg = SizedBox(height: lg);
}
`;

  return {
    path: "lib/theme/spacing.dart",
    content,
  };
}

export default designHooks;
