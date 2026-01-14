/**
 * Accessibility Module Templates
 *
 * Handlebars templates for accessibility code generation
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// TEMPLATE SOURCES
// ============================================================================

const ACCESSIBILITY_WIDGET_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Accessible Widget: {{widgetName}}

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

class {{widgetName}} extends StatelessWidget {
  final Widget child;
  final String semanticLabel;
  {{#if hasHint}}
  final String? semanticHint;
  {{/if}}
  {{#if isInteractive}}
  final VoidCallback? onTap;
  {{/if}}

  const {{widgetName}}({
    super.key,
    required this.child,
    required this.semanticLabel,
    {{#if hasHint}}
    this.semanticHint,
    {{/if}}
    {{#if isInteractive}}
    this.onTap,
    {{/if}}
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: semanticLabel,
      {{#if hasHint}}
      hint: semanticHint,
      {{/if}}
      {{#if isButton}}
      button: true,
      {{/if}}
      {{#if isImage}}
      image: true,
      {{/if}}
      child: {{#if isInteractive}}InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(
            minWidth: {{minWidth}},
            minHeight: {{minHeight}},
          ),
          child: child,
        ),
      ){{else}}child{{/if}},
    );
  }
}
`;

const LOCALIZATION_SERVICE_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Localization Service

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class LocalizationService {
  static const List<Locale> supportedLocales = [
    {{#each languages}}
    Locale('{{this}}'),
    {{/each}}
  ];

  static const Locale defaultLocale = Locale('{{defaultLanguage}}');

  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];

  static Locale? localeResolutionCallback(
    Locale? locale,
    Iterable<Locale> supportedLocales,
  ) {
    if (locale == null) return defaultLocale;

    for (final supportedLocale in supportedLocales) {
      if (supportedLocale.languageCode == locale.languageCode) {
        return supportedLocale;
      }
    }
    return defaultLocale;
  }
}

extension LocalizationExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
`;

const ARB_FILE_SOURCE = `{
  "@@locale": "{{locale}}",
  "@@last_modified": "{{timestamp}}"{{#each keys}},
  "{{key}}": "{{value}}"{{#if ../isDefault}},
  "@{{key}}": {
    "description": "{{description}}"
  }{{/if}}{{/each}}
}
`;

const SEMANTIC_HEADING_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Semantic Heading Component

import 'package:flutter/material.dart';

enum HeadingLevel { h1, h2, h3, h4, h5, h6 }

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
    return Semantics(
      header: true,
      child: Text(
        text,
        style: style ?? _getStyleForLevel(context),
      ),
    );
  }

  TextStyle _getStyleForLevel(BuildContext context) {
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
`;

const ACCESSIBILITY_AUDIT_REPORT_SOURCE = `# Accessibility Audit Report

**Project:** {{projectName}}
**Date:** {{timestamp}}
**WCAG Level:** {{wcagLevel}}
**Score:** {{score}}/100

## Issues ({{issues.length}})

{{#each issues}}
### {{severityIcon severity}} {{issue}}

- **File:** {{file}}{{#if line}}:{{line}}{{/if}}
- **WCAG Criteria:** {{wcagCriteria}}
- **Severity:** {{severity}}
- **Fix:** {{fix}}

{{/each}}

## Warnings ({{warnings.length}})

{{#each warnings}}
- **{{file}}**: {{issue}} ({{wcagCriteria}})
{{/each}}

## Passed Checks

{{#each passed}}
- {{this}}
{{/each}}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const ACCESSIBILITY_TEMPLATES: Template[] = [
  {
    id: "accessibility-widget",
    name: "Accessible Widget",
    description: "Widget with semantic annotations for accessibility",
    type: "file",
    source: ACCESSIBILITY_WIDGET_SOURCE,
    output: {
      path: "lib/widgets/accessibility",
      filename: "{{snakeCase widgetName}}",
      extension: "dart",
    },
  },
  {
    id: "accessibility-localization-service",
    name: "Localization Service",
    description: "Service for managing app translations",
    type: "file",
    source: LOCALIZATION_SERVICE_SOURCE,
    output: {
      path: "lib/core/localization",
      filename: "localization_service",
      extension: "dart",
    },
  },
  {
    id: "accessibility-arb-file",
    name: "ARB Translation File",
    description: "Application Resource Bundle file for translations",
    type: "file",
    source: ARB_FILE_SOURCE,
    output: {
      path: "lib/l10n",
      filename: "app_{{locale}}",
      extension: "arb",
    },
  },
  {
    id: "accessibility-semantic-heading",
    name: "Semantic Heading",
    description: "Heading component with proper semantic structure",
    type: "file",
    source: SEMANTIC_HEADING_SOURCE,
    output: {
      path: "lib/widgets/accessibility",
      filename: "semantic_heading",
      extension: "dart",
    },
  },
  {
    id: "accessibility-audit-report",
    name: "Accessibility Audit Report",
    description: "Markdown report of accessibility audit results",
    type: "file",
    source: ACCESSIBILITY_AUDIT_REPORT_SOURCE,
    output: {
      path: "reports",
      filename: "accessibility_audit_{{date}}",
      extension: "md",
    },
  },
];

export default ACCESSIBILITY_TEMPLATES;
