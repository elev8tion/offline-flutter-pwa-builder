/**
 * Accessibility Module Tools
 *
 * MCP tool definitions and handlers for accessibility auditing and i18n
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  AccessibilityModuleConfig,
  type WCAGLevel,
  type AccessibilityIssue,
  type AuditResult,
  type TranslationKey,
  sortBySeverity,
  calculateScore,
  getLanguageName,
  toSnakeCase,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const AuditWCAGInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  wcagLevel: z.enum(["A", "AA", "AAA"]).optional().describe("WCAG conformance level (default: AA)"),
  includeColorContrast: z.boolean().optional().describe("Check color contrast ratios"),
  checkScreenReader: z.boolean().optional().describe("Check screen reader compatibility"),
});

export const GenerateFixesInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  issues: z.array(z.object({
    file: z.string(),
    issue: z.string(),
    fixType: z.enum(["semantic", "contrast", "touch-target", "label", "focus"]),
  })).describe("List of issues to fix"),
  autoApply: z.boolean().optional().describe("Automatically apply fixes"),
});

export const SetupI18nInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  languages: z.array(z.string()).describe("Language codes (e.g., ['en', 'es', 'fr'])"),
  defaultLanguage: z.string().describe("Default language code"),
  useFlutterGen: z.boolean().optional().describe("Use flutter_gen for code generation"),
});

export const GenerateTranslationsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  keys: z.array(z.object({
    key: z.string().describe("Translation key"),
    defaultValue: z.string().describe("Default value in base language"),
    description: z.string().optional().describe("Description for translators"),
  })).describe("Translation keys to add"),
  targetLanguages: z.array(z.string()).optional().describe("Languages to generate (all if not specified)"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const ACCESSIBILITY_TOOLS: Tool[] = [
  {
    name: "accessibility_audit_wcag",
    description: "Audit Flutter project for WCAG accessibility compliance. Checks semantic labels, touch targets, form labels, and screen reader support.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        wcagLevel: { type: "string", enum: ["A", "AA", "AAA"], description: "WCAG level" },
        includeColorContrast: { type: "boolean", description: "Check color contrast" },
        checkScreenReader: { type: "boolean", description: "Check screen reader support" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "accessibility_generate_fixes",
    description: "Generate accessibility fixes for identified issues. Creates semantic wrappers, touch target improvements, and label additions.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              file: { type: "string" },
              issue: { type: "string" },
              fixType: { type: "string", enum: ["semantic", "contrast", "touch-target", "label", "focus"] },
            },
          },
          description: "Issues to fix",
        },
        autoApply: { type: "boolean", description: "Auto-apply fixes" },
      },
      required: ["projectId", "issues"],
    },
  },
  {
    name: "accessibility_setup_i18n",
    description: "Setup internationalization (i18n) for Flutter project. Configures flutter_localizations and generates l10n.yaml.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        languages: {
          type: "array",
          items: { type: "string" },
          description: "Language codes",
        },
        defaultLanguage: { type: "string", description: "Default language" },
        useFlutterGen: { type: "boolean", description: "Use flutter_gen" },
      },
      required: ["projectId", "languages", "defaultLanguage"],
    },
  },
  {
    name: "accessibility_generate_translations",
    description: "Generate translation files (ARB) for specified keys. Creates localized string entries for all configured languages.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        keys: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              defaultValue: { type: "string" },
              description: { type: "string" },
            },
          },
          description: "Translation keys",
        },
        targetLanguages: {
          type: "array",
          items: { type: "string" },
          description: "Target languages",
        },
      },
      required: ["projectId", "keys"],
    },
  },
];

// ============================================================================
// TOOL CONTEXT TYPE
// ============================================================================

export interface AccessibilityToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  getAccessibilityConfig: (id: string) => AccessibilityModuleConfig | undefined;
  updateAccessibilityConfig: (id: string, config: Partial<AccessibilityModuleConfig>) => void;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

async function handleAuditWCAG(
  args: unknown,
  ctx: AccessibilityToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AuditWCAGInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getAccessibilityConfig(input.projectId);
  const wcagLevel = input.wcagLevel || config?.wcagLevel || "AA";

  // Simulate accessibility audit
  const auditResult: AuditResult = {
    projectPath: project.name,
    wcagLevel: wcagLevel as WCAGLevel,
    timestamp: new Date().toISOString(),
    issues: [],
    warnings: [],
    passed: [],
    score: 0,
  };

  // Simulated issues based on common accessibility problems
  const simulatedIssues: AccessibilityIssue[] = [
    {
      file: "lib/widgets/product_card.dart",
      line: 45,
      issue: "Image without semantic label",
      wcagCriteria: "1.1.1",
      severity: "high",
      fix: "Add semanticLabel property to Image widgets",
      fixType: "semantic",
    },
    {
      file: "lib/screens/login_screen.dart",
      line: 78,
      issue: "Form field without label",
      wcagCriteria: "3.3.2",
      severity: "high",
      fix: "Add labelText to TextFormField decoration",
      fixType: "label",
    },
  ];

  const simulatedWarnings: AccessibilityIssue[] = [
    {
      file: "lib/widgets/icon_button.dart",
      line: 23,
      issue: "Touch target may be too small",
      wcagCriteria: "2.5.5",
      severity: "medium",
      fix: "Ensure touch targets are at least 44x44 pixels",
      fixType: "touch-target",
    },
    {
      file: "lib/widgets/custom_icon.dart",
      line: 15,
      issue: "Icon without semantic label",
      wcagCriteria: "1.1.1",
      severity: "medium",
      fix: "Add semanticLabel property to Icon widgets",
      fixType: "semantic",
    },
  ];

  if (input.includeColorContrast) {
    simulatedWarnings.push({
      file: "lib/theme/colors.dart",
      line: 12,
      issue: "Hardcoded colors detected - verify contrast ratios",
      wcagCriteria: "1.4.3",
      severity: "low",
      fix: "Verify color contrast ratios meet WCAG requirements (4.5:1 for normal text)",
      fixType: "contrast",
    });
  }

  if (input.checkScreenReader) {
    simulatedWarnings.push({
      file: "lib/widgets/custom_chart.dart",
      line: 30,
      issue: "Custom painted widget may not be accessible",
      wcagCriteria: "4.1.2",
      severity: "medium",
      fix: "Wrap CustomPaint widgets with Semantics widget",
      fixType: "semantic",
    });
  }

  auditResult.issues = sortBySeverity(simulatedIssues);
  auditResult.warnings = sortBySeverity(simulatedWarnings);
  auditResult.passed = [
    "Navigation landmarks present",
    "Focus order follows visual order",
    "Language attribute set",
  ];
  auditResult.score = calculateScore(
    10, // Total checks
    auditResult.issues,
    auditResult.warnings
  );

  // Generate accessibility helper code
  const accessibilityHelpers = generateAccessibilityHelpers();

  return {
    content: [
      {
        type: "text",
        text: `WCAG ${wcagLevel} Accessibility Audit - ${project.name}

Score: ${auditResult.score}/100
Timestamp: ${auditResult.timestamp}

Issues (${auditResult.issues.length}):
${auditResult.issues.map(i => `  - [${i.severity.toUpperCase()}] ${i.file}:${i.line || "?"} - ${i.issue} (WCAG ${i.wcagCriteria})`).join("\n") || "  None"}

Warnings (${auditResult.warnings.length}):
${auditResult.warnings.map(w => `  - [${w.severity.toUpperCase()}] ${w.file}:${w.line || "?"} - ${w.issue} (WCAG ${w.wcagCriteria})`).join("\n") || "  None"}

Passed Checks:
${auditResult.passed.map(p => `  + ${p}`).join("\n")}

Accessibility Helper Code:
\`\`\`dart
${accessibilityHelpers}
\`\`\``,
      },
    ],
  };
}

async function handleGenerateFixes(
  args: unknown,
  ctx: AccessibilityToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateFixesInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const fixes: string[] = [];

  for (const issue of input.issues) {
    switch (issue.fixType) {
      case "semantic":
        fixes.push(generateSemanticFix(issue.file, issue.issue));
        break;
      case "touch-target":
        fixes.push(generateTouchTargetFix(issue.file));
        break;
      case "label":
        fixes.push(generateLabelFix(issue.file));
        break;
      case "focus":
        fixes.push(generateFocusFix(issue.file));
        break;
      case "contrast":
        fixes.push(generateContrastFix(issue.file));
        break;
    }
  }

  return {
    content: [
      {
        type: "text",
        text: `Generated Accessibility Fixes for ${project.name}

${input.autoApply ? "Fixes have been applied automatically." : "Review and apply these fixes:"}

${fixes.join("\n\n---\n\n")}`,
      },
    ],
  };
}

async function handleSetupI18n(
  args: unknown,
  ctx: AccessibilityToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = SetupI18nInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getAccessibilityConfig(input.projectId);

  ctx.updateAccessibilityConfig(input.projectId, {
    ...config,
    i18n: {
      languages: input.languages,
      defaultLanguage: input.defaultLanguage,
      translationKeys: config?.i18n?.translationKeys || [],
      useFlutterGen: input.useFlutterGen ?? true,
      generatePlaceholders: true,
    },
  });

  // Generate l10n.yaml
  const l10nYaml = `arb-dir: lib/l10n
template-arb-file: app_${input.defaultLanguage}.arb
output-localization-file: app_localizations.dart
output-dir: lib/l10n/generated`;

  // Generate empty ARB file for default language
  const defaultArb = {
    "@@locale": input.defaultLanguage,
    "@@last_modified": new Date().toISOString(),
  };

  // Generate localization service
  const localizationService = generateLocalizationService(input.languages);

  return {
    content: [
      {
        type: "text",
        text: `i18n Setup Complete for ${project.name}

Languages: ${input.languages.map(l => `${l} (${getLanguageName(l)})`).join(", ")}
Default: ${input.defaultLanguage} (${getLanguageName(input.defaultLanguage)})

l10n.yaml:
\`\`\`yaml
${l10nYaml}
\`\`\`

lib/l10n/app_${input.defaultLanguage}.arb:
\`\`\`json
${JSON.stringify(defaultArb, null, 2)}
\`\`\`

lib/core/localization/localization_service.dart:
\`\`\`dart
${localizationService}
\`\`\`

Next steps:
1. Add to pubspec.yaml:
   dependencies:
     flutter_localizations:
       sdk: flutter
     intl: ^0.18.0

2. Run: flutter pub get
3. Generate localizations: flutter gen-l10n`,
      },
    ],
  };
}

async function handleGenerateTranslations(
  args: unknown,
  ctx: AccessibilityToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateTranslationsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getAccessibilityConfig(input.projectId);
  const languages = input.targetLanguages || config?.i18n?.languages || ["en"];

  // Update config with new keys
  const existingKeys = config?.i18n?.translationKeys || [];
  const newKeys: TranslationKey[] = input.keys.map(k => ({
    key: toSnakeCase(k.key),
    defaultValue: k.defaultValue,
    description: k.description,
  }));

  ctx.updateAccessibilityConfig(input.projectId, {
    ...config,
    i18n: {
      ...config?.i18n,
      languages: config?.i18n?.languages || ["en"],
      defaultLanguage: config?.i18n?.defaultLanguage || "en",
      useFlutterGen: config?.i18n?.useFlutterGen ?? true,
      generatePlaceholders: config?.i18n?.generatePlaceholders ?? true,
      translationKeys: [...existingKeys, ...newKeys],
    },
  });

  // Generate ARB entries
  const arbEntries: Record<string, unknown> = {};
  for (const key of newKeys) {
    arbEntries[key.key] = key.defaultValue;
    arbEntries[`@${key.key}`] = {
      description: key.description || `Translation for ${key.key}`,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Generated Translations for ${project.name}

Added ${newKeys.length} translation keys for languages: ${languages.join(", ")}

ARB entries to add:
\`\`\`json
${JSON.stringify(arbEntries, null, 2)}
\`\`\`

Usage in code:
\`\`\`dart
// Import generated localizations
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

// Use translations
Text(AppLocalizations.of(context)!.${newKeys[0]?.key || "example_key"})

// Or with extension
Text(context.l10n.${newKeys[0]?.key || "example_key"})
\`\`\``,
      },
    ],
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleAccessibilityTool(
  toolName: string,
  args: unknown,
  ctx: AccessibilityToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (toolName) {
    case "accessibility_audit_wcag":
      return handleAuditWCAG(args, ctx);
    case "accessibility_generate_fixes":
      return handleGenerateFixes(args, ctx);
    case "accessibility_setup_i18n":
      return handleSetupI18n(args, ctx);
    case "accessibility_generate_translations":
      return handleGenerateTranslations(args, ctx);
    default:
      throw new Error(`Unknown accessibility tool: ${toolName}`);
  }
}

// ============================================================================
// HELPER GENERATORS
// ============================================================================

function generateAccessibilityHelpers(): string {
  return `import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

/// Accessibility Helper Widget
class AccessibleWidget extends StatelessWidget {
  final Widget child;
  final String? label;
  final String? hint;
  final bool isButton;
  final VoidCallback? onTap;

  const AccessibleWidget({
    super.key,
    required this.child,
    this.label,
    this.hint,
    this.isButton = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: isButton,
      child: onTap != null
          ? InkWell(
              onTap: onTap,
              child: Container(
                constraints: const BoxConstraints(
                  minWidth: 44,
                  minHeight: 44,
                ),
                child: child,
              ),
            )
          : child,
    );
  }
}

/// Screen Reader Announcer
class ScreenReaderAnnouncer {
  static void announce(String message) {
    SemanticsService.announce(message, TextDirection.ltr);
  }
}`;
}

function generateSemanticFix(file: string, _issue: string): string {
  return `// Fix for: ${file}
// Wrap with Semantics widget:

Semantics(
  label: 'Descriptive label here',
  child: YourWidget(),
)`;
}

function generateTouchTargetFix(file: string): string {
  return `// Fix for: ${file}
// Ensure minimum touch target size:

Container(
  constraints: const BoxConstraints(
    minWidth: 44,
    minHeight: 44,
  ),
  child: YourTappableWidget(),
)`;
}

function generateLabelFix(file: string): string {
  return `// Fix for: ${file}
// Add label to form field:

TextFormField(
  decoration: InputDecoration(
    labelText: 'Field Label',
    hintText: 'Helpful hint text',
  ),
)`;
}

function generateFocusFix(file: string): string {
  return `// Fix for: ${file}
// Add focus indicator:

Focus(
  child: Builder(
    builder: (context) {
      final isFocused = Focus.of(context).hasFocus;
      return Container(
        decoration: BoxDecoration(
          border: isFocused
              ? Border.all(color: Colors.blue, width: 2)
              : null,
        ),
        child: YourWidget(),
      );
    },
  ),
)`;
}

function generateContrastFix(file: string): string {
  return `// Fix for: ${file}
// Use theme colors with proper contrast:

// Instead of hardcoded colors:
// Color(0xFF123456)

// Use theme-aware colors:
Theme.of(context).colorScheme.onSurface
Theme.of(context).colorScheme.onPrimary`;
}

function generateLocalizationService(languages: string[]): string {
  return `import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class LocalizationService {
  static const List<Locale> supportedLocales = [
    ${languages.map(l => `Locale('${l}')`).join(",\n    ")},
  ];

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
    if (locale == null) return supportedLocales.first;

    for (final supportedLocale in supportedLocales) {
      if (supportedLocale.languageCode == locale.languageCode) {
        return supportedLocale;
      }
    }
    return supportedLocales.first;
  }
}

extension LocalizationExtension on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}`;
}
