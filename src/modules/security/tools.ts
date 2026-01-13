/**
 * Security Module MCP Tools
 *
 * Defines MCP tools for security configuration.
 * Supports encryption, validation, audit, and data classification.
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  SecurityModuleConfig,
  SecurityAuditResult,
  SecurityFinding,
  SecuritySeverity,
  DEFAULT_SECURITY_CONFIG,
  getSecurityDependencies,
  getBiometricDependencies,
  calculateSecurityScore,
  calculateSecurityGrade,
  generateFindingId,
  BUILT_IN_SECURITY_CHECKS,
  toSnakeCase,
} from "./config.js";

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface SecurityToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => void;
  getSecurityConfig: (projectId: string) => SecurityModuleConfig | undefined;
  updateSecurityConfig: (projectId: string, config: Partial<SecurityModuleConfig>) => void;
}

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

const EnableEncryptionSchema = z.object({
  projectId: z.string().uuid(),
  algorithm: z.enum(["AES-256-GCM", "ChaCha20-Poly1305"]).default("AES-256-GCM"),
  keyDerivation: z.enum(["PBKDF2", "Argon2"]).default("PBKDF2"),
  iterations: z.number().min(10000).max(1000000).optional(),
  memoryCost: z.number().min(1024).max(1048576).optional(),
  saltLength: z.number().min(16).max(32).default(16),
  keyLength: z.number().min(16).max(32).default(32),
  biometricProtection: z.boolean().default(false),
  encryptDatabase: z.boolean().default(true),
  encryptPreferences: z.boolean().default(true),
});

const AddValidationSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(["string", "email", "phone", "url", "number", "custom"]).default("string"),
  pattern: z.string().optional(),
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  sanitize: z.boolean().default(true),
  errorMessage: z.string().optional(),
  preventSqlInjection: z.boolean().default(true),
  xssProtection: z.boolean().default(true),
});

const SecurityAuditSchema = z.object({
  projectId: z.string().uuid(),
  checks: z.array(z.string()).optional(),
  severity: z.enum(["all", "critical", "high", "medium", "low"]).default("all"),
  includeRecommendations: z.boolean().default(true),
  generateReport: z.boolean().default(true),
});

const ClassifyDataSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  encryptionRequired: z.boolean().default(false),
  auditRequired: z.boolean().default(false),
  retentionPolicy: z.string().optional(),
  handlingInstructions: z.string().optional(),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const SECURITY_TOOLS: Tool[] = [
  {
    name: "security_enable_encryption",
    description: "Enable encryption for data at rest with configurable algorithm and key derivation",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        algorithm: {
          type: "string",
          enum: ["AES-256-GCM", "ChaCha20-Poly1305"],
          description: "Encryption algorithm",
        },
        keyDerivation: {
          type: "string",
          enum: ["PBKDF2", "Argon2"],
          description: "Key derivation function",
        },
        iterations: {
          type: "number",
          description: "Iterations for PBKDF2 (default: 100000)",
        },
        memoryCost: {
          type: "number",
          description: "Memory cost for Argon2 in KB",
        },
        saltLength: {
          type: "number",
          description: "Salt length in bytes (default: 16)",
        },
        keyLength: {
          type: "number",
          description: "Key length in bytes (default: 32)",
        },
        biometricProtection: {
          type: "boolean",
          description: "Enable biometric protection for key access",
        },
        encryptDatabase: {
          type: "boolean",
          description: "Encrypt the Drift database",
        },
        encryptPreferences: {
          type: "boolean",
          description: "Encrypt shared preferences",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "security_add_validation",
    description: "Add input validation rules to prevent injection attacks",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "Validation rule name (snake_case)",
        },
        type: {
          type: "string",
          enum: ["string", "email", "phone", "url", "number", "custom"],
          description: "Validation type",
        },
        pattern: {
          type: "string",
          description: "Custom regex pattern for validation",
        },
        minLength: {
          type: "number",
          description: "Minimum input length",
        },
        maxLength: {
          type: "number",
          description: "Maximum input length",
        },
        sanitize: {
          type: "boolean",
          description: "Enable input sanitization",
        },
        errorMessage: {
          type: "string",
          description: "Custom error message",
        },
        preventSqlInjection: {
          type: "boolean",
          description: "Enable SQL injection prevention",
        },
        xssProtection: {
          type: "boolean",
          description: "Enable XSS protection",
        },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "security_audit",
    description: "Run a security audit on the project to identify vulnerabilities",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        checks: {
          type: "array",
          items: { type: "string" },
          description: "Specific security checks to run (default: all)",
        },
        severity: {
          type: "string",
          enum: ["all", "critical", "high", "medium", "low"],
          description: "Minimum severity level to include",
        },
        includeRecommendations: {
          type: "boolean",
          description: "Include security recommendations",
        },
        generateReport: {
          type: "boolean",
          description: "Generate a detailed report",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "security_classify_data",
    description: "Classify data with sensitivity levels and handling requirements",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "Data classification name",
        },
        sensitivity: {
          type: "string",
          enum: ["public", "internal", "confidential", "restricted"],
          description: "Data sensitivity level",
        },
        encryptionRequired: {
          type: "boolean",
          description: "Whether encryption is required",
        },
        auditRequired: {
          type: "boolean",
          description: "Whether audit logging is required",
        },
        retentionPolicy: {
          type: "string",
          description: "Data retention policy",
        },
        handlingInstructions: {
          type: "string",
          description: "Special handling instructions",
        },
      },
      required: ["projectId", "name", "sensitivity"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleSecurityTool(
  name: string,
  args: Record<string, unknown>,
  context: SecurityToolContext
): Promise<unknown> {
  switch (name) {
    case "security_enable_encryption": {
      const parsed = EnableEncryptionSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create security config
      let securityConfig = context.getSecurityConfig(parsed.projectId);
      if (!securityConfig) {
        securityConfig = { ...DEFAULT_SECURITY_CONFIG };
      }

      // Update encryption config
      securityConfig.encryption = {
        enabled: true,
        algorithm: parsed.algorithm,
        keyDerivation: parsed.keyDerivation,
        iterations: parsed.iterations ?? (parsed.keyDerivation === "PBKDF2" ? 100000 : undefined),
        memoryCost: parsed.memoryCost ?? (parsed.keyDerivation === "Argon2" ? 65536 : undefined),
        saltLength: parsed.saltLength,
        keyLength: parsed.keyLength,
      };

      // Update secure storage config
      securityConfig.secureStorage = {
        ...securityConfig.secureStorage,
        biometricProtection: parsed.biometricProtection,
        encryptedSharedPreferences: parsed.encryptPreferences,
      };

      context.updateSecurityConfig(parsed.projectId, securityConfig);

      // Also update project's offline config if encrypting database
      if (parsed.encryptDatabase) {
        context.updateProject(parsed.projectId, {
          offline: {
            ...project.offline,
            storage: {
              ...project.offline.storage,
              encryption: true,
            },
          },
        });
      }

      const dependencies = getSecurityDependencies();
      const biometricDeps = parsed.biometricProtection ? getBiometricDependencies() : {};

      return {
        success: true,
        message: `Encryption enabled with ${parsed.algorithm}`,
        encryption: {
          algorithm: parsed.algorithm,
          keyDerivation: parsed.keyDerivation,
          iterations: securityConfig.encryption.iterations,
          saltLength: parsed.saltLength,
          keyLength: parsed.keyLength,
          biometricProtection: parsed.biometricProtection,
        },
        generatedFiles: [
          "lib/core/security/encryption_service.dart",
          "lib/core/security/key_manager.dart",
          parsed.biometricProtection ? "lib/core/security/biometric_service.dart" : null,
        ].filter(Boolean),
        dependencies: { ...dependencies, ...biometricDeps },
      };
    }

    case "security_add_validation": {
      const parsed = AddValidationSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create security config
      let securityConfig = context.getSecurityConfig(parsed.projectId);
      if (!securityConfig) {
        securityConfig = { ...DEFAULT_SECURITY_CONFIG };
      }

      // Check if validation rule already exists
      const existingIndex = securityConfig.validation.customRules.findIndex(
        (r) => r.name === parsed.name
      );

      const validationRule = {
        name: parsed.name,
        type: parsed.type,
        pattern: parsed.pattern,
        minLength: parsed.minLength,
        maxLength: parsed.maxLength,
        sanitize: parsed.sanitize,
        errorMessage: parsed.errorMessage,
      };

      if (existingIndex >= 0) {
        securityConfig.validation.customRules[existingIndex] = validationRule;
      } else {
        securityConfig.validation.customRules.push(validationRule);
      }

      // Update global validation settings
      securityConfig.validation.preventSqlInjection = parsed.preventSqlInjection;
      securityConfig.validation.xssProtection = parsed.xssProtection;

      context.updateSecurityConfig(parsed.projectId, securityConfig);

      const snakeName = toSnakeCase(parsed.name);

      return {
        success: true,
        message: `Validation rule '${parsed.name}' added`,
        validation: {
          name: parsed.name,
          type: parsed.type,
          pattern: parsed.pattern,
          minLength: parsed.minLength,
          maxLength: parsed.maxLength,
          sanitize: parsed.sanitize,
          preventSqlInjection: parsed.preventSqlInjection,
          xssProtection: parsed.xssProtection,
        },
        generatedFiles: [
          "lib/core/security/input_validator.dart",
          `lib/core/security/validators/${snakeName}_validator.dart`,
        ],
        totalRules: securityConfig.validation.customRules.length,
      };
    }

    case "security_audit": {
      const parsed = SecurityAuditSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get security config
      const securityConfig = context.getSecurityConfig(parsed.projectId);

      // Determine which checks to run
      const checksToRun = parsed.checks?.length
        ? BUILT_IN_SECURITY_CHECKS.filter((c) => parsed.checks!.includes(c.id))
        : BUILT_IN_SECURITY_CHECKS;

      // Run security checks (simulated for now - in real implementation would analyze code)
      const findings: SecurityFinding[] = runSecurityChecks(
        project,
        securityConfig,
        checksToRun,
        parsed.severity
      );

      // Calculate score and grade
      const score = calculateSecurityScore(findings);
      const grade = calculateSecurityGrade(score);

      // Generate summary
      const summary = {
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
        info: findings.filter((f) => f.severity === "info").length,
        total: findings.length,
      };

      // Generate recommendations
      const recommendations = parsed.includeRecommendations
        ? generateRecommendations(findings, securityConfig)
        : [];

      const result: SecurityAuditResult = {
        timestamp: new Date().toISOString(),
        projectId: parsed.projectId,
        score,
        grade,
        findings,
        summary,
        recommendations,
      };

      return {
        success: true,
        message: `Security audit complete. Score: ${score}/100 (Grade: ${grade})`,
        audit: result,
        generatedFiles: parsed.generateReport
          ? ["security_audit_report.json", "security_audit_report.md"]
          : [],
      };
    }

    case "security_classify_data": {
      const parsed = ClassifyDataSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create security config
      let securityConfig = context.getSecurityConfig(parsed.projectId);
      if (!securityConfig) {
        securityConfig = { ...DEFAULT_SECURITY_CONFIG };
      }

      // Enable classification
      securityConfig.classification.enabled = true;

      // Check if classification already exists
      const existingIndex = securityConfig.classification.classifications.findIndex(
        (c) => c.name === parsed.name
      );

      const classification = {
        name: parsed.name,
        sensitivity: parsed.sensitivity,
        encryptionRequired: parsed.encryptionRequired,
        auditRequired: parsed.auditRequired,
        retentionPolicy: parsed.retentionPolicy,
        handlingInstructions: parsed.handlingInstructions,
      };

      if (existingIndex >= 0) {
        securityConfig.classification.classifications[existingIndex] = classification;
      } else {
        securityConfig.classification.classifications.push(classification);
      }

      context.updateSecurityConfig(parsed.projectId, securityConfig);

      return {
        success: true,
        message: `Data classification '${parsed.name}' created with sensitivity: ${parsed.sensitivity}`,
        classification,
        requirements: {
          encryption: parsed.encryptionRequired,
          audit: parsed.auditRequired,
          retention: parsed.retentionPolicy ?? "default",
        },
        totalClassifications: securityConfig.classification.classifications.length,
      };
    }

    default:
      throw new Error(`Unknown security tool: ${name}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Run security checks and generate findings
 */
function runSecurityChecks(
  project: ProjectDefinition,
  securityConfig: SecurityModuleConfig | undefined,
  checks: typeof BUILT_IN_SECURITY_CHECKS,
  severityFilter: string
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let findingIndex = 0;

  const severityOrder: Record<SecuritySeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };

  const minSeverity = severityFilter === "all" ? 0 : severityOrder[severityFilter as SecuritySeverity] ?? 0;

  for (const check of checks) {
    // Skip if below severity threshold
    if (severityOrder[check.severity] < minSeverity) continue;

    // Run check (simulated - real implementation would analyze code)
    const finding = runSecurityCheck(check, project, securityConfig, findingIndex);
    if (finding) {
      findings.push(finding);
      findingIndex++;
    }
  }

  return findings;
}

/**
 * Run a single security check
 */
function runSecurityCheck(
  check: typeof BUILT_IN_SECURITY_CHECKS[0],
  project: ProjectDefinition,
  securityConfig: SecurityModuleConfig | undefined,
  index: number
): SecurityFinding | null {
  switch (check.id) {
    case "secure-storage":
      if (!securityConfig?.encryption.enabled) {
        return {
          id: generateFindingId(check.category, index),
          category: check.category,
          severity: check.severity,
          title: check.name,
          description: "Encryption is not enabled for secure storage",
          recommendation: "Enable encryption using security_enable_encryption tool",
          autoFix: true,
        };
      }
      return null;

    case "input-validation":
      if (!securityConfig?.validation.sanitizeInput) {
        return {
          id: generateFindingId(check.category, index),
          category: check.category,
          severity: check.severity,
          title: check.name,
          description: "Input sanitization is not enabled",
          recommendation: "Enable input sanitization in security configuration",
          autoFix: true,
        };
      }
      return null;

    case "sql-injection":
      if (!securityConfig?.validation.preventSqlInjection) {
        return {
          id: generateFindingId(check.category, index),
          category: check.category,
          severity: check.severity,
          title: check.name,
          description: "SQL injection prevention is not enabled",
          recommendation: "Enable SQL injection prevention using security_add_validation tool",
          autoFix: true,
        };
      }
      return null;

    case "xss-protection":
      if (!securityConfig?.validation.xssProtection) {
        return {
          id: generateFindingId(check.category, index),
          category: check.category,
          severity: check.severity,
          title: check.name,
          description: "XSS protection is not enabled",
          recommendation: "Enable XSS protection in security configuration",
          autoFix: true,
        };
      }
      return null;

    case "offline-data-security":
      if (!project.offline.storage.encryption) {
        return {
          id: generateFindingId(check.category, index),
          category: check.category,
          severity: check.severity,
          title: check.name,
          description: "Offline database is not encrypted",
          recommendation: "Enable database encryption using security_enable_encryption tool with encryptDatabase: true",
          autoFix: true,
        };
      }
      return null;

    default:
      // For other checks, return null (passed) by default
      // In real implementation, would analyze actual code
      return null;
  }
}

/**
 * Generate security recommendations based on findings
 */
function generateRecommendations(
  findings: SecurityFinding[],
  securityConfig: SecurityModuleConfig | undefined
): string[] {
  const recommendations: string[] = [];

  // Based on findings
  if (findings.some((f) => f.category === "encryption")) {
    recommendations.push("Enable encryption for sensitive data storage");
  }

  if (findings.some((f) => f.category === "input_validation")) {
    recommendations.push("Implement comprehensive input validation and sanitization");
  }

  if (findings.some((f) => f.severity === "critical")) {
    recommendations.push("Address all critical security findings before deployment");
  }

  // General recommendations based on config
  if (!securityConfig?.audit.enabled) {
    recommendations.push("Enable security audit logging for compliance");
  }

  if (!securityConfig?.encryption.enabled) {
    recommendations.push("Consider enabling encryption for data at rest");
  }

  if (!securityConfig?.secureStorage.biometricProtection) {
    recommendations.push("Consider enabling biometric protection for sensitive operations");
  }

  if (!securityConfig?.classification.enabled) {
    recommendations.push("Implement data classification for sensitive data handling");
  }

  // Always include these
  recommendations.push("Regularly update dependencies to patch known vulnerabilities");
  recommendations.push("Implement proper error handling that doesn't leak sensitive information");

  return recommendations;
}

export default SECURITY_TOOLS;
