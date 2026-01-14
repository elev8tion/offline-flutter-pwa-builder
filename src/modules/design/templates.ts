/**
 * Design Module Templates
 *
 * Handlebars templates for theme, animation, and design token generation
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// TEMPLATE SOURCES
// ============================================================================

const THEME_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// App Theme

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class {{name}} {
  // Primary colors
  static final Color primaryColor = {{flutterColor colors.primary}};
  static final Color secondaryColor = {{flutterColor colors.secondary}};
  static final Color accentColor = {{flutterColor colors.accent}};

  // Light Theme
  static ThemeData lightTheme = ThemeData(
    useMaterial3: {{useMaterial3}},
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ),
    textTheme: GoogleFonts.{{lowercase typography.fontFamily}}TextTheme(),
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular({{borderRadius.md}}),
        ),
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular({{borderRadius.lg}}),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.grey.shade100,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular({{borderRadius.md}}),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular({{borderRadius.md}}),
        borderSide: BorderSide(color: primaryColor, width: 2),
      ),
    ),
  );

  {{#if supportDarkMode}}
  // Dark Theme
  static ThemeData darkTheme = ThemeData(
    useMaterial3: {{useMaterial3}},
    colorScheme: ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.dark,
    ),
    textTheme: GoogleFonts.{{lowercase typography.fontFamily}}TextTheme(
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
          borderRadius: BorderRadius.circular({{borderRadius.md}}),
        ),
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 2,
      color: Colors.grey.shade900,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular({{borderRadius.lg}}),
      ),
    ),
  );
  {{/if}}
}
`;

const DESIGN_TOKENS_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Design Tokens

import 'package:flutter/material.dart';

/// Design tokens for consistent styling across the app
class DesignTokens {
  // Colors
  {{#each colors}}
  static const Color color{{pascalCase @key}} = {{flutterColor this}};
  {{/each}}

  // Spacing
  {{#each spacing}}
  static const double spacing{{pascalCase @key}} = {{this}}.0;
  {{/each}}

  // Border Radius
  {{#each borderRadius}}
  static const double radius{{pascalCase @key}} = {{this}}.0;
  {{/each}}

  // Typography Sizes
  static const double fontHeadlineLarge = {{typography.headlineLarge}}.0;
  static const double fontHeadlineMedium = {{typography.headlineMedium}}.0;
  static const double fontHeadlineSmall = {{typography.headlineSmall}}.0;
  static const double fontBodyLarge = {{typography.bodyLarge}}.0;
  static const double fontBodyMedium = {{typography.bodyMedium}}.0;
  static const double fontBodySmall = {{typography.bodySmall}}.0;
  static const double fontLabelLarge = {{typography.labelLarge}}.0;

  // Font Family
  static const String fontFamily = '{{typography.fontFamily}}';
}
`;

const COLOR_EXTENSIONS_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
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
  static const Color success = {{flutterColor colors.success}};
  static const Color warning = {{flutterColor colors.warning}};
  static const Color info = {{flutterColor colors.info}};

  // Semantic colors
  static const Color positive = success;
  static const Color negative = {{flutterColor colors.error}};
  static const Color neutral = info;
}
`;

const SPACING_CONSTANTS_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Spacing Constants

import 'package:flutter/material.dart';

/// Spacing constants for consistent layouts
class Spacing {
  {{#each spacing}}
  static const double {{@key}} = {{this}}.0;
  {{/each}}

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

const ANIMATION_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Animation: {{name}}

import 'package:flutter/material.dart';

/// {{name}} animation widget
class {{name}}Animation extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Curve curve;
  final bool repeat;
  final bool reverseOnComplete;

  const {{name}}Animation({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: {{duration}}),
    this.curve = {{curve}},
    this.repeat = {{repeat}},
    this.reverseOnComplete = {{reverseOnComplete}},
  });

  @override
  State<{{name}}Animation> createState() => _{{name}}AnimationState();
}

class _{{name}}AnimationState extends State<{{name}}Animation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _animation = CurvedAnimation(
      parent: _controller,
      curve: widget.curve,
    );

    if (widget.repeat) {
      _controller.repeat(reverse: widget.reverseOnComplete);
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return {{animationBuilder}};
  }
}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const DESIGN_TEMPLATES: Template[] = [
  {
    id: "design-theme",
    name: "App Theme",
    description: "Complete Flutter theme with light and dark mode support",
    type: "file",
    source: THEME_SOURCE,
    output: {
      path: "lib/theme",
      filename: "app_theme",
      extension: "dart",
    },
  },
  {
    id: "design-tokens",
    name: "Design Tokens",
    description: "Design tokens for consistent styling",
    type: "file",
    source: DESIGN_TOKENS_SOURCE,
    output: {
      path: "lib/theme",
      filename: "design_tokens",
      extension: "dart",
    },
  },
  {
    id: "design-color-extensions",
    name: "Color Extensions",
    description: "Color extensions for easy theme access",
    type: "file",
    source: COLOR_EXTENSIONS_SOURCE,
    output: {
      path: "lib/theme",
      filename: "color_extensions",
      extension: "dart",
    },
  },
  {
    id: "design-spacing",
    name: "Spacing Constants",
    description: "Spacing constants and helpers",
    type: "file",
    source: SPACING_CONSTANTS_SOURCE,
    output: {
      path: "lib/theme",
      filename: "spacing",
      extension: "dart",
    },
  },
  {
    id: "design-animation",
    name: "Animation Widget",
    description: "Reusable animation widget",
    type: "file",
    source: ANIMATION_SOURCE,
    output: {
      path: "lib/animations",
      filename: "{{snakeCase name}}_animation",
      extension: "dart",
    },
  },
];

export default DESIGN_TEMPLATES;
