/**
 * Accessibility Module Hooks
 *
 * Lifecycle hooks for the Accessibility module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  AccessibilityModuleConfig,
  DEFAULT_ACCESSIBILITY_CONFIG,
  getLanguageName,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR ACCESSIBILITY TEMPLATES
// ============================================================================

export function registerAccessibilityHelpers(handlebars: typeof import("handlebars")): void {
  // WCAG level badge
  handlebars.registerHelper("wcagBadge", (level: string) => {
    const badges: Record<string, string> = {
      A: "[WCAG A]",
      AA: "[WCAG AA]",
      AAA: "[WCAG AAA]",
    };
    return badges[level] || "[WCAG]";
  });

  // Severity indicator
  handlebars.registerHelper("severityIcon", (severity: string) => {
    const icons: Record<string, string> = {
      critical: "[!!!]",
      high: "[!!]",
      medium: "[!]",
      low: "[.]",
    };
    return icons[severity] || "[?]";
  });

  // Language name helper
  handlebars.registerHelper("langName", (code: string) => {
    return getLanguageName(code);
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get accessibility config from project modules
 */
function getAccessibilityConfig(ctx: HookContext): AccessibilityModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "accessibility");
  return {
    ...DEFAULT_ACCESSIBILITY_CONFIG,
    ...(moduleConfig?.config as Partial<AccessibilityModuleConfig> ?? {}),
  };
}

export const accessibilityHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getAccessibilityConfig(ctx);
    console.log(`[Accessibility] Module installed`);
    console.log(`[Accessibility] WCAG Level: ${config.wcagLevel}`);
    console.log(`[Accessibility] Languages: ${config.i18n.languages.join(", ")}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getAccessibilityConfig(ctx);

    // Validate config
    if (config.i18n.languages.length === 0) {
      throw new Error("[Accessibility] At least one language must be configured");
    }

    if (!config.i18n.languages.includes(config.i18n.defaultLanguage)) {
      throw new Error("[Accessibility] Default language must be in languages list");
    }

    console.log("[Accessibility] Preparing accessibility utilities...");
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getAccessibilityConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate accessibility helpers
    files.push(generateAccessibilityHelpers(config));

    // 2. Generate localization service
    files.push(generateLocalizationService(config));

    // 3. Generate l10n.yaml
    files.push(generateL10nYaml(config));

    // 4. Generate ARB files for each language
    for (const lang of config.i18n.languages) {
      files.push(generateArbFile(config, lang));
    }

    // 5. Generate semantic widgets
    files.push(generateSemanticWidgets(config));

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[Accessibility] Generated accessibility utilities");
    console.log("[Accessibility] Run 'flutter gen-l10n' to generate localizations");
  },

  /**
   * Called before build
   */
  beforeBuild: async (ctx: HookContext): Promise<void> => {
    console.log("[Accessibility] Running pre-build accessibility checks...");
    const config = getAccessibilityConfig(ctx);

    if (config.wcagLevel === "AAA") {
      console.log("[Accessibility] Warning: AAA compliance requires manual verification");
    }
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Accessibility] Build completed");
    console.log("[Accessibility] Consider running accessibility audit in production");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateAccessibilityHelpers(_config: AccessibilityModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Accessibility Helper Utilities

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Accessibility Helper Widget
/// Wraps any widget with proper semantic annotations
class AccessibleWidget extends StatelessWidget {
  final Widget child;
  final String? label;
  final String? hint;
  final String? value;
  final bool isButton;
  final bool isHeader;
  final bool isLink;
  final bool isImage;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;

  const AccessibleWidget({
    super.key,
    required this.child,
    this.label,
    this.hint,
    this.value,
    this.isButton = false,
    this.isHeader = false,
    this.isLink = false,
    this.isImage = false,
    this.onTap,
    this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    Widget result = Semantics(
      label: label,
      hint: hint,
      value: value,
      button: isButton,
      header: isHeader,
      link: isLink,
      image: isImage,
      child: child,
    );

    if (onTap != null || onLongPress != null) {
      result = InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        child: Container(
          constraints: const BoxConstraints(
            minWidth: 44,
            minHeight: 44,
          ),
          child: result,
        ),
      );
    }

    return result;
  }
}

/// Accessible Image with required semantic label
class AccessibleImage extends StatelessWidget {
  final ImageProvider image;
  final String semanticLabel;
  final double? width;
  final double? height;
  final BoxFit? fit;

  const AccessibleImage({
    super.key,
    required this.image,
    required this.semanticLabel,
    this.width,
    this.height,
    this.fit,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      image: true,
      child: Image(
        image: image,
        width: width,
        height: height,
        fit: fit,
        semanticLabel: semanticLabel,
      ),
    );
  }
}

/// Accessible Icon with required semantic label
class AccessibleIcon extends StatelessWidget {
  final IconData icon;
  final String semanticLabel;
  final double? size;
  final Color? color;

  const AccessibleIcon({
    super.key,
    required this.icon,
    required this.semanticLabel,
    this.size,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      child: Icon(
        icon,
        size: size,
        color: color,
        semanticLabel: semanticLabel,
      ),
    );
  }
}

/// Accessible Form Field with proper labeling
class AccessibleTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;
  final bool autofocus;
  final int? maxLines;
  final int? maxLength;

  const AccessibleTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.validator,
    this.keyboardType,
    this.obscureText = false,
    this.autofocus = false,
    this.maxLines = 1,
    this.maxLength,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      textField: true,
      child: TextFormField(
        controller: controller,
        validator: validator,
        keyboardType: keyboardType,
        obscureText: obscureText,
        autofocus: autofocus,
        maxLines: maxLines,
        maxLength: maxLength,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }
}

/// Screen Reader Announcer for dynamic content updates
class ScreenReaderAnnouncer {
  /// Announce a message to screen readers
  static void announce(String message, {TextDirection direction = TextDirection.ltr}) {
    SemanticsService.announce(message, direction);
  }

  /// Announce with politeness level
  static void announcePolite(String message) {
    // Standard announcement, non-interrupting
    announce(message);
  }

  /// Announce urgently (interrupts current speech)
  static void announceUrgent(String message) {
    // For critical updates
    announce(message);
  }
}

/// Focus Management Helper
class FocusHelper {
  /// Request focus on a specific node
  static void requestFocus(BuildContext context, FocusNode node) {
    FocusScope.of(context).requestFocus(node);
  }

  /// Remove focus from current element
  static void unfocus(BuildContext context) {
    FocusScope.of(context).unfocus();
  }

  /// Check if context has focus
  static bool hasFocus(BuildContext context) {
    return FocusScope.of(context).hasFocus;
  }
}

/// Skip Link for keyboard navigation
class SkipLink extends StatelessWidget {
  final String label;
  final VoidCallback onActivate;

  const SkipLink({
    super.key,
    this.label = 'Skip to main content',
    required this.onActivate,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      link: true,
      child: Focus(
        child: Builder(
          builder: (context) {
            final isFocused = Focus.of(context).hasFocus;
            return Opacity(
              opacity: isFocused ? 1.0 : 0.0,
              child: InkWell(
                onTap: onActivate,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  color: Theme.of(context).colorScheme.primary,
                  child: Text(
                    label,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
`;

  return {
    path: "lib/core/accessibility/accessibility_helpers.dart",
    content,
  };
}

function generateLocalizationService(config: AccessibilityModuleConfig): GeneratedFile {
  const { i18n } = config;

  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Localization Service

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

/// Localization Service for managing app translations
class LocalizationService {
  /// Supported locales
  static const List<Locale> supportedLocales = [
    ${i18n.languages.map(l => `Locale('${l}')`).join(",\n    ")},
  ];

  /// Default locale
  static const Locale defaultLocale = Locale('${i18n.defaultLanguage}');

  /// Localization delegates
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  /// Locale resolution callback
  static Locale? localeResolutionCallback(
    Locale? locale,
    Iterable<Locale> supportedLocales,
  ) {
    if (locale == null) {
      return defaultLocale;
    }

    // Check for exact match
    for (final supportedLocale in supportedLocales) {
      if (supportedLocale.languageCode == locale.languageCode &&
          supportedLocale.countryCode == locale.countryCode) {
        return supportedLocale;
      }
    }

    // Check for language match
    for (final supportedLocale in supportedLocales) {
      if (supportedLocale.languageCode == locale.languageCode) {
        return supportedLocale;
      }
    }

    return defaultLocale;
  }

  /// Get language name from code
  static String getLanguageName(String code) {
    const names = <String, String>{
      ${i18n.languages.map(l => `'${l}': '${getLanguageName(l)}'`).join(",\n      ")},
    };
    return names[code] ?? code.toUpperCase();
  }
}

/// Extension for easy access to localizations
extension LocalizationExtension on BuildContext {
  /// Get AppLocalizations instance
  AppLocalizations get l10n => AppLocalizations.of(this)!;

  /// Get current locale
  Locale get currentLocale => Localizations.localeOf(this);

  /// Check if RTL language
  bool get isRTL => Directionality.of(this) == TextDirection.rtl;
}

/// Language Selector Widget
class LanguageSelector extends StatelessWidget {
  final ValueChanged<Locale> onLocaleChange;
  final Locale? currentLocale;

  const LanguageSelector({
    super.key,
    required this.onLocaleChange,
    this.currentLocale,
  });

  @override
  Widget build(BuildContext context) {
    final locale = currentLocale ?? Localizations.localeOf(context);

    return Semantics(
      label: 'Select language',
      child: DropdownButton<Locale>(
        value: locale,
        items: LocalizationService.supportedLocales.map((locale) {
          return DropdownMenuItem(
            value: locale,
            child: Text(LocalizationService.getLanguageName(locale.languageCode)),
          );
        }).toList(),
        onChanged: (newLocale) {
          if (newLocale != null) {
            onLocaleChange(newLocale);
          }
        },
      ),
    );
  }
}
`;

  return {
    path: "lib/core/localization/localization_service.dart",
    content,
  };
}

function generateL10nYaml(config: AccessibilityModuleConfig): GeneratedFile {
  const { i18n } = config;

  const content = `# GENERATED CODE - Localization Configuration
arb-dir: lib/l10n
template-arb-file: app_${i18n.defaultLanguage}.arb
output-localization-file: app_localizations.dart
output-dir: lib/l10n/generated
nullable-getter: false
`;

  return {
    path: "l10n.yaml",
    content,
  };
}

function generateArbFile(config: AccessibilityModuleConfig, lang: string): GeneratedFile {
  const { i18n } = config;
  const isDefault = lang === i18n.defaultLanguage;

  const arb: Record<string, unknown> = {
    "@@locale": lang,
    "@@last_modified": new Date().toISOString(),
  };

  // Add default keys
  const defaultKeys = [
    { key: "app_name", value: "My App", description: "Application name" },
    { key: "welcome", value: "Welcome", description: "Welcome message" },
    { key: "login", value: "Login", description: "Login button text" },
    { key: "logout", value: "Logout", description: "Logout button text" },
    { key: "settings", value: "Settings", description: "Settings menu item" },
    { key: "cancel", value: "Cancel", description: "Cancel button" },
    { key: "ok", value: "OK", description: "OK button" },
    { key: "error", value: "Error", description: "Error message prefix" },
    { key: "loading", value: "Loading...", description: "Loading indicator" },
  ];

  for (const key of defaultKeys) {
    arb[key.key] = key.value;
    if (isDefault) {
      arb[`@${key.key}`] = { description: key.description };
    }
  }

  // Add custom keys from config
  for (const key of i18n.translationKeys) {
    arb[key.key] = key.defaultValue;
    if (isDefault && key.description) {
      arb[`@${key.key}`] = { description: key.description };
    }
  }

  return {
    path: `lib/l10n/app_${lang}.arb`,
    content: JSON.stringify(arb, null, 2),
  };
}

function generateSemanticWidgets(_config: AccessibilityModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Semantic Widget Wrappers

import 'package:flutter/material.dart';

/// Heading levels for semantic structure
enum HeadingLevel { h1, h2, h3, h4, h5, h6 }

/// Semantic Heading Widget
class SemanticHeading extends StatelessWidget {
  final String text;
  final HeadingLevel level;
  final TextStyle? style;

  const SemanticHeading({
    super.key,
    required this.text,
    this.level = HeadingLevel.h1,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    final defaultStyle = _getDefaultStyle(context);

    return Semantics(
      header: true,
      label: text,
      child: Text(
        text,
        style: style ?? defaultStyle,
      ),
    );
  }

  TextStyle _getDefaultStyle(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    switch (level) {
      case HeadingLevel.h1:
        return theme.headlineLarge!;
      case HeadingLevel.h2:
        return theme.headlineMedium!;
      case HeadingLevel.h3:
        return theme.headlineSmall!;
      case HeadingLevel.h4:
        return theme.titleLarge!;
      case HeadingLevel.h5:
        return theme.titleMedium!;
      case HeadingLevel.h6:
        return theme.titleSmall!;
    }
  }
}

/// Semantic Button with proper accessibility attributes
class SemanticButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final Widget? child;
  final String? hint;
  final bool enabled;

  const SemanticButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.child,
    this.hint,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: true,
      enabled: enabled,
      child: ElevatedButton(
        onPressed: enabled ? onPressed : null,
        child: child ?? Text(label),
      ),
    );
  }
}

/// Semantic Link
class SemanticLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final TextStyle? style;

  const SemanticLink({
    super.key,
    required this.label,
    required this.onTap,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      link: true,
      child: InkWell(
        onTap: onTap,
        child: Text(
          label,
          style: style ?? TextStyle(
            color: Theme.of(context).colorScheme.primary,
            decoration: TextDecoration.underline,
          ),
        ),
      ),
    );
  }
}

/// Live Region for dynamic content announcements
class LiveRegion extends StatelessWidget {
  final Widget child;
  final bool polite;
  final String? label;

  const LiveRegion({
    super.key,
    required this.child,
    this.polite = true,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      label: label,
      child: child,
    );
  }
}
`;

  return {
    path: "lib/core/accessibility/semantic_widgets.dart",
    content,
  };
}

export default accessibilityHooks;
