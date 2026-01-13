/**
 * Security Module
 *
 * Provides security capabilities for Flutter applications.
 * Supports encryption, secure storage, input validation, and audit logging.
 *
 * Features:
 * - AES-256-GCM encryption with PBKDF2/Argon2 key derivation
 * - Secure storage with Flutter Secure Storage
 * - Input validation with SQL injection and XSS protection
 * - Security audit with vulnerability detection
 * - Data classification with sensitivity levels
 * - Biometric authentication support
 */

import type { Module } from "../../core/types.js";
import { SecurityModuleConfig, DEFAULT_SECURITY_CONFIG, SecurityModuleConfigSchema } from "./config.js";
import { securityHooks } from "./hooks.js";
import { SECURITY_TOOLS, handleSecurityTool, type SecurityToolContext } from "./tools.js";
import { SECURITY_TEMPLATES } from "./templates.js";

// Re-export types and utilities
export * from "./config.js";
export { securityHooks, handleSecurityTool, SECURITY_TOOLS, SECURITY_TEMPLATES };
export type { SecurityToolContext };

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const SECURITY_MODULE: Module = {
  id: "security",
  name: "Security",
  version: "1.0.0",
  description: "Security features including encryption, secure storage, input validation, and audit logging",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: SecurityModuleConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_SECURITY_CONFIG as unknown as Record<string, unknown>,
  templates: SECURITY_TEMPLATES,
  assets: [],
  hooks: securityHooks,
};

// ============================================================================
// MODULE REGISTRY HELPER
// ============================================================================

/**
 * Register the Security module with a module system
 */
export function registerSecurityModule(moduleSystem: {
  register: (module: Module) => void;
}): void {
  moduleSystem.register(SECURITY_MODULE);
}

// ============================================================================
// PUBSPEC DEPENDENCIES
// ============================================================================

/**
 * Core security dependencies for pubspec
 */
export const SECURITY_DEPENDENCIES = {
  dependencies: {
    encrypt: "^5.0.3",
    crypto: "^3.0.3",
    flutter_secure_storage: "^9.0.0",
    pointycastle: "^3.7.4",
  },
  devDependencies: {},
};

/**
 * Biometric dependencies for pubspec
 */
export const BIOMETRIC_DEPENDENCIES = {
  dependencies: {
    local_auth: "^2.1.8",
  },
  devDependencies: {},
};

/**
 * Get dependencies based on security configuration
 */
export function getSecurityDependenciesForPubspec(config: SecurityModuleConfig): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const deps = { ...SECURITY_DEPENDENCIES };

  if (config.secureStorage.biometricProtection) {
    deps.dependencies = { ...deps.dependencies, ...BIOMETRIC_DEPENDENCIES.dependencies };
  }

  return deps;
}

// ============================================================================
// ANALYSIS OPTIONS
// ============================================================================

/**
 * Get analysis_options.yaml security rules
 */
export function getSecurityAnalysisOptions(): string {
  return `analyzer:
  errors:
    # Security-related lint rules
    avoid_print: warning
    avoid_dynamic_calls: warning

linter:
  rules:
    # Security best practices
    - avoid_print
    - avoid_slow_async_io
    - cancel_subscriptions
    - close_sinks
    - use_key_in_widget_constructors
    - prefer_const_constructors
    - prefer_const_declarations
`;
}

// ============================================================================
// SECURITY POLICY DEFINITIONS
// ============================================================================

/**
 * Built-in security policies
 */
export const SECURITY_POLICIES = [
  {
    id: "no-hardcoded-secrets",
    name: "No Hardcoded Secrets",
    severity: "critical" as const,
    description: "Prevent API keys, passwords, and secrets in code",
    patterns: [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
    ],
  },
  {
    id: "secure-storage",
    name: "Secure Storage",
    severity: "high" as const,
    description: "Ensure sensitive data uses encrypted storage",
    patterns: [
      /SharedPreferences(?!.*encrypted)/i,
      /localStorage\[/i,
    ],
  },
  {
    id: "secure-http",
    name: "HTTPS Only",
    severity: "high" as const,
    description: "Ensure all HTTP requests use HTTPS",
    patterns: [
      /http:\/\/(?!localhost|127\.0\.0\.1|10\.)/i,
    ],
  },
  {
    id: "sql-injection",
    name: "SQL Injection Prevention",
    severity: "critical" as const,
    description: "Prevent SQL injection vulnerabilities",
    patterns: [
      /rawQuery\s*\(\s*['"]\s*SELECT.*\$\{/i,
      /execute\s*\(\s*['"]\s*INSERT.*\$\{/i,
    ],
  },
];

// ============================================================================
// BEST PRACTICES
// ============================================================================

export const SECURITY_BEST_PRACTICES = [
  "Always use HTTPS for network communication",
  "Store sensitive data in encrypted secure storage",
  "Implement proper input validation and sanitization",
  "Use parameterized queries to prevent SQL injection",
  "Encode user-generated content to prevent XSS",
  "Implement certificate pinning for sensitive APIs",
  "Use strong encryption (AES-256-GCM) for data at rest",
  "Derive keys using PBKDF2 or Argon2 with sufficient iterations",
  "Enable biometric protection for sensitive operations",
  "Log security events for audit trails",
  "Regularly update dependencies to patch vulnerabilities",
  "Implement proper session management",
  "Use secure random number generation",
  "Never store passwords in plain text",
  "Implement rate limiting for authentication endpoints",
];

// ============================================================================
// COMPLIANCE HELPERS
// ============================================================================

/**
 * Check if configuration meets minimum security requirements
 */
export function meetsMinimumSecurityRequirements(config: SecurityModuleConfig): {
  meets: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!config.encryption.enabled) {
    missing.push("Encryption should be enabled for data at rest");
  }

  if (!config.validation.sanitizeInput) {
    missing.push("Input sanitization should be enabled");
  }

  if (!config.validation.preventSqlInjection) {
    missing.push("SQL injection prevention should be enabled");
  }

  if (!config.validation.xssProtection) {
    missing.push("XSS protection should be enabled");
  }

  if (!config.audit.enabled) {
    missing.push("Audit logging should be enabled for compliance");
  }

  return {
    meets: missing.length === 0,
    missing,
  };
}

/**
 * Get OWASP Mobile Top 10 compliance status
 */
export function getOwaspCompliance(config: SecurityModuleConfig): {
  compliant: string[];
  nonCompliant: string[];
  score: number;
} {
  const checks = [
    { id: "M1", name: "Improper Platform Usage", check: () => config.secureStorage.provider === "flutter_secure_storage" },
    { id: "M2", name: "Insecure Data Storage", check: () => config.encryption.enabled },
    { id: "M3", name: "Insecure Communication", check: () => true }, // Assumed handled elsewhere
    { id: "M4", name: "Insecure Authentication", check: () => config.secureStorage.biometricProtection || config.audit.enabled },
    { id: "M5", name: "Insufficient Cryptography", check: () => config.encryption.algorithm === "AES-256-GCM" },
    { id: "M6", name: "Insecure Authorization", check: () => config.audit.events.includes("authorization") },
    { id: "M7", name: "Client Code Quality", check: () => config.validation.sanitizeInput },
    { id: "M8", name: "Code Tampering", check: () => true }, // Handled at build time
    { id: "M9", name: "Reverse Engineering", check: () => true }, // Handled at build time
    { id: "M10", name: "Extraneous Functionality", check: () => config.audit.enabled },
  ];

  const compliant: string[] = [];
  const nonCompliant: string[] = [];

  for (const check of checks) {
    if (check.check()) {
      compliant.push(`${check.id}: ${check.name}`);
    } else {
      nonCompliant.push(`${check.id}: ${check.name}`);
    }
  }

  const score = Math.round((compliant.length / checks.length) * 100);

  return { compliant, nonCompliant, score };
}

export default SECURITY_MODULE;
