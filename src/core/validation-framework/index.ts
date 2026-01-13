/**
 * Validation Framework
 *
 * Extensible validation system for projects, modules, files, code, and configs.
 * Supports autofix capabilities.
 */

import type {
  Validator,
  ValidationInput,
  ValidationResult,
  ValidationIssue,
  ProjectDefinition,
  ValidationFramework as IValidationFramework,
} from "../types.js";

// ============================================================================
// VALIDATION FRAMEWORK IMPLEMENTATION
// ============================================================================

export class ValidationFramework implements IValidationFramework {
  private validators: Map<string, Validator> = new Map();

  constructor() {
    // Register built-in validators
    this.registerBuiltinValidators();
  }

  register(validator: Validator): void {
    this.validators.set(validator.id, validator);
  }

  unregister(validatorId: string): void {
    this.validators.delete(validatorId);
  }

  get(validatorId: string): Validator | undefined {
    return this.validators.get(validatorId);
  }

  list(): Validator[] {
    return Array.from(this.validators.values());
  }

  async validate(input: ValidationInput): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Find applicable validators
    const applicableValidators = Array.from(this.validators.values()).filter(
      (validator) => {
        // Match by target
        if (validator.target !== input.target) return false;

        // Match by patterns if specified
        if (validator.patterns && input.path) {
          const matchesPattern = validator.patterns.some((pattern) => {
            const regex = new RegExp(pattern.replace("*", ".*"));
            return regex.test(input.path!);
          });
          if (!matchesPattern) return false;
        }

        return true;
      }
    );

    // Run validators
    for (const validator of applicableValidators) {
      try {
        const result = await validator.validate(input);
        issues.push(...result.issues);
      } catch (error) {
        issues.push({
          validator: validator.id,
          severity: "error",
          message: `Validator error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Determine validity (valid if no errors)
    const valid = !issues.some((issue) => issue.severity === "error");

    return { valid, issues };
  }

  async validateProject(project: ProjectDefinition): Promise<ValidationResult> {
    return this.validate({
      target: "project",
      content: project as unknown as Record<string, unknown>,
    });
  }

  private registerBuiltinValidators(): void {
    // Project name validator
    this.register({
      id: "project-name",
      name: "Project Name Validator",
      target: "project",
      severity: "error",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const project = input.content as unknown as ProjectDefinition;

        if (!project.name) {
          issues.push({
            validator: "project-name",
            severity: "error",
            message: "Project name is required",
          });
        } else if (!/^[a-z][a-z0-9_]*$/.test(project.name)) {
          issues.push({
            validator: "project-name",
            severity: "error",
            message:
              "Project name must start with lowercase letter and contain only lowercase letters, numbers, and underscores",
            suggestion: project.name
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "_")
              .replace(/^[^a-z]/, "app_$&"),
          });
        }

        return { valid: issues.length === 0, issues };
      },
    });

    // PWA config validator
    this.register({
      id: "pwa-config",
      name: "PWA Configuration Validator",
      target: "project",
      severity: "warning",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const project = input.content as unknown as ProjectDefinition;

        if (!project.pwa.name) {
          issues.push({
            validator: "pwa-config",
            severity: "error",
            message: "PWA name is required",
          });
        }

        if (!project.pwa.shortName) {
          issues.push({
            validator: "pwa-config",
            severity: "warning",
            message: "PWA short name is recommended",
            suggestion: project.pwa.name?.substring(0, 12),
          });
        } else if (project.pwa.shortName.length > 12) {
          issues.push({
            validator: "pwa-config",
            severity: "warning",
            message: "PWA short name should be 12 characters or less",
            suggestion: project.pwa.shortName.substring(0, 12),
          });
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(project.pwa.themeColor)) {
          issues.push({
            validator: "pwa-config",
            severity: "error",
            message: "Theme color must be a valid hex color (e.g., #2196F3)",
          });
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(project.pwa.backgroundColor)) {
          issues.push({
            validator: "pwa-config",
            severity: "error",
            message: "Background color must be a valid hex color",
          });
        }

        if (project.pwa.icons.length === 0) {
          issues.push({
            validator: "pwa-config",
            severity: "warning",
            message: "No PWA icons configured. Icons are required for installable PWAs",
          });
        }

        return { valid: !issues.some((i) => i.severity === "error"), issues };
      },
    });

    // Offline config validator
    this.register({
      id: "offline-config",
      name: "Offline Configuration Validator",
      target: "project",
      severity: "warning",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const project = input.content as unknown as ProjectDefinition;

        if (project.offline.storage.encryption && !project.offline.sync?.enabled) {
          issues.push({
            validator: "offline-config",
            severity: "info",
            message:
              "Encryption is enabled but sync is disabled. Encrypted data will only be available locally.",
          });
        }

        if (project.offline.caching.ttl < 0) {
          issues.push({
            validator: "offline-config",
            severity: "error",
            message: "Cache TTL must be non-negative",
          });
        }

        if (project.offline.sync?.enabled && project.offline.sync.strategy === "periodic") {
          if (!project.offline.sync.interval || project.offline.sync.interval < 60) {
            issues.push({
              validator: "offline-config",
              severity: "warning",
              message: "Periodic sync interval should be at least 60 seconds",
              suggestion: "60",
            });
          }
        }

        return { valid: !issues.some((i) => i.severity === "error"), issues };
      },
    });

    // Targets validator
    this.register({
      id: "targets",
      name: "Target Platforms Validator",
      target: "project",
      severity: "warning",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const project = input.content as unknown as ProjectDefinition;

        if (project.targets.length === 0) {
          issues.push({
            validator: "targets",
            severity: "error",
            message: "At least one target platform is required",
          });
        }

        // PWA requires web target
        if (!project.targets.includes("web")) {
          issues.push({
            validator: "targets",
            severity: "warning",
            message:
              "Web target is recommended for PWA functionality. PWA features will only work on web.",
          });
        }

        return { valid: !issues.some((i) => i.severity === "error"), issues };
      },
    });

    // Dart code validator
    this.register({
      id: "dart-syntax",
      name: "Dart Syntax Validator",
      target: "code",
      patterns: ["*.dart"],
      severity: "error",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const code = input.content as string;

        // Basic syntax checks
        const lines = code.split("\n");

        // Check for unbalanced braces
        let braceCount = 0;
        let parenCount = 0;
        let bracketCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip comments
          if (line.trim().startsWith("//")) continue;

          for (const char of line) {
            switch (char) {
              case "{":
                braceCount++;
                break;
              case "}":
                braceCount--;
                break;
              case "(":
                parenCount++;
                break;
              case ")":
                parenCount--;
                break;
              case "[":
                bracketCount++;
                break;
              case "]":
                bracketCount--;
                break;
            }
          }

          // Check for common issues
          if (line.includes(";;")) {
            issues.push({
              validator: "dart-syntax",
              severity: "error",
              message: "Double semicolon detected",
              file: input.path,
              line: i + 1,
            });
          }
        }

        if (braceCount !== 0) {
          issues.push({
            validator: "dart-syntax",
            severity: "error",
            message: `Unbalanced braces: ${braceCount > 0 ? "missing closing" : "extra closing"} brace`,
            file: input.path,
          });
        }

        if (parenCount !== 0) {
          issues.push({
            validator: "dart-syntax",
            severity: "error",
            message: `Unbalanced parentheses`,
            file: input.path,
          });
        }

        if (bracketCount !== 0) {
          issues.push({
            validator: "dart-syntax",
            severity: "error",
            message: `Unbalanced brackets`,
            file: input.path,
          });
        }

        return { valid: issues.length === 0, issues };
      },
    });

    // Import validator
    this.register({
      id: "dart-imports",
      name: "Dart Imports Validator",
      target: "code",
      patterns: ["*.dart"],
      severity: "warning",
      validate: async (input) => {
        const issues: ValidationIssue[] = [];
        const code = input.content as string;
        const lines = code.split("\n");

        let foundNonImportCode = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
            continue;
          }

          if (line.startsWith("import ") || line.startsWith("export ")) {
            if (foundNonImportCode) {
              issues.push({
                validator: "dart-imports",
                severity: "warning",
                message: "Import statements should be at the top of the file",
                file: input.path,
                line: i + 1,
              });
            }
          } else if (!line.startsWith("library ") && !line.startsWith("part ")) {
            foundNonImportCode = true;
          }
        }

        return { valid: true, issues };
      },
    });
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function formatValidationResult(result: ValidationResult): string {
  if (result.valid && result.issues.length === 0) {
    return "✓ Validation passed";
  }

  const lines: string[] = [];

  if (!result.valid) {
    lines.push("✗ Validation failed\n");
  } else {
    lines.push("⚠ Validation passed with warnings\n");
  }

  const grouped = {
    error: result.issues.filter((i) => i.severity === "error"),
    warning: result.issues.filter((i) => i.severity === "warning"),
    info: result.issues.filter((i) => i.severity === "info"),
  };

  for (const [severity, issues] of Object.entries(grouped)) {
    if (issues.length === 0) continue;

    const icon = severity === "error" ? "✗" : severity === "warning" ? "⚠" : "ℹ";
    lines.push(`${icon} ${issues.length} ${severity}(s):`);

    for (const issue of issues) {
      let location = "";
      if (issue.file) {
        location = issue.file;
        if (issue.line) {
          location += `:${issue.line}`;
          if (issue.column) {
            location += `:${issue.column}`;
          }
        }
        location = ` (${location})`;
      }

      lines.push(`  - [${issue.validator}]${location} ${issue.message}`);

      if (issue.suggestion) {
        lines.push(`    Suggestion: ${issue.suggestion}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
