/**
 * Security Module Configuration
 *
 * Defines configuration types and schemas for security features in Flutter apps.
 * Supports encryption, secure storage, input validation, and audit logging.
 */

import { z } from "zod";

// ============================================================================
// ENCRYPTION TYPES
// ============================================================================

export type EncryptionAlgorithm = "AES-256-GCM" | "ChaCha20-Poly1305";
export type KeyDerivationFunction = "PBKDF2" | "Argon2";

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: EncryptionAlgorithm;
  keyDerivation: KeyDerivationFunction;
  iterations?: number; // For PBKDF2
  memoryCost?: number; // For Argon2
  saltLength: number;
  keyLength: number;
}

export const EncryptionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  algorithm: z.enum(["AES-256-GCM", "ChaCha20-Poly1305"]).default("AES-256-GCM"),
  keyDerivation: z.enum(["PBKDF2", "Argon2"]).default("PBKDF2"),
  iterations: z.number().min(10000).max(1000000).optional(),
  memoryCost: z.number().min(1024).max(1048576).optional(), // 1KB to 1GB
  saltLength: z.number().min(16).max(32).default(16),
  keyLength: z.number().min(16).max(32).default(32),
});

// ============================================================================
// SECURE STORAGE TYPES
// ============================================================================

export type SecureStorageProvider = "flutter_secure_storage" | "web_crypto";

export interface SecureStorageConfig {
  provider: SecureStorageProvider;
  biometricProtection: boolean;
  keychainAccessGroup?: string; // iOS
  encryptedSharedPreferences: boolean; // Android
  fallbackToMemory: boolean;
}

export const SecureStorageConfigSchema = z.object({
  provider: z.enum(["flutter_secure_storage", "web_crypto"]).default("flutter_secure_storage"),
  biometricProtection: z.boolean().default(false),
  keychainAccessGroup: z.string().optional(),
  encryptedSharedPreferences: z.boolean().default(true),
  fallbackToMemory: z.boolean().default(false),
});

// ============================================================================
// INPUT VALIDATION TYPES
// ============================================================================

export interface ValidationRule {
  name: string;
  pattern?: string; // Regex pattern
  minLength?: number;
  maxLength?: number;
  type: "string" | "email" | "phone" | "url" | "number" | "custom";
  sanitize: boolean;
  errorMessage?: string;
}

export interface ValidationConfig {
  sanitizeInput: boolean;
  preventSqlInjection: boolean;
  xssProtection: boolean;
  htmlEncode: boolean;
  sqlEscape: boolean;
  customRules: ValidationRule[];
}

export const ValidationRuleSchema = z.object({
  name: z.string().min(1),
  pattern: z.string().optional(),
  minLength: z.number().min(0).optional(),
  maxLength: z.number().min(1).optional(),
  type: z.enum(["string", "email", "phone", "url", "number", "custom"]).default("string"),
  sanitize: z.boolean().default(true),
  errorMessage: z.string().optional(),
});

export const ValidationConfigSchema = z.object({
  sanitizeInput: z.boolean().default(true),
  preventSqlInjection: z.boolean().default(true),
  xssProtection: z.boolean().default(true),
  htmlEncode: z.boolean().default(true),
  sqlEscape: z.boolean().default(true),
  customRules: z.array(ValidationRuleSchema).default([]),
});

// ============================================================================
// AUDIT LOGGING TYPES
// ============================================================================

export type AuditEventType =
  | "authentication"
  | "authorization"
  | "data_access"
  | "data_modification"
  | "encryption"
  | "validation_failure"
  | "security_violation"
  | "configuration_change";

export type AuditLogLevel = "debug" | "info" | "warning" | "error" | "critical";

export interface AuditConfig {
  enabled: boolean;
  level: AuditLogLevel;
  events: AuditEventType[];
  includeTimestamp: boolean;
  includeUserId: boolean;
  includeDeviceInfo: boolean;
  maxLogSize: number; // in KB
  rotationPolicy: "size" | "time" | "none";
  retentionDays: number;
  encryptLogs: boolean;
  remoteLogging: boolean;
  remoteEndpoint?: string;
}

export const AuditConfigSchema = z.object({
  enabled: z.boolean().default(true),
  level: z.enum(["debug", "info", "warning", "error", "critical"]).default("info"),
  events: z.array(
    z.enum([
      "authentication",
      "authorization",
      "data_access",
      "data_modification",
      "encryption",
      "validation_failure",
      "security_violation",
      "configuration_change",
    ])
  ).default(["authentication", "authorization", "security_violation"]),
  includeTimestamp: z.boolean().default(true),
  includeUserId: z.boolean().default(true),
  includeDeviceInfo: z.boolean().default(false),
  maxLogSize: z.number().min(100).max(102400).default(1024), // 100KB to 100MB
  rotationPolicy: z.enum(["size", "time", "none"]).default("size"),
  retentionDays: z.number().min(1).max(365).default(30),
  encryptLogs: z.boolean().default(false),
  remoteLogging: z.boolean().default(false),
  remoteEndpoint: z.string().url().optional(),
});

// ============================================================================
// DATA CLASSIFICATION TYPES
// ============================================================================

export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

export interface DataClassification {
  name: string;
  sensitivity: DataSensitivity;
  encryptionRequired: boolean;
  auditRequired: boolean;
  retentionPolicy?: string;
  handlingInstructions?: string;
}

export interface ClassificationConfig {
  enabled: boolean;
  defaultSensitivity: DataSensitivity;
  classifications: DataClassification[];
  enforceEncryption: boolean;
  enforceAudit: boolean;
}

export const DataClassificationSchema = z.object({
  name: z.string().min(1),
  sensitivity: z.enum(["public", "internal", "confidential", "restricted"]),
  encryptionRequired: z.boolean().default(false),
  auditRequired: z.boolean().default(false),
  retentionPolicy: z.string().optional(),
  handlingInstructions: z.string().optional(),
});

export const ClassificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultSensitivity: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
  classifications: z.array(DataClassificationSchema).default([]),
  enforceEncryption: z.boolean().default(true),
  enforceAudit: z.boolean().default(true),
});

// ============================================================================
// MODULE CONFIG
// ============================================================================

export interface SecurityModuleConfig {
  encryption: EncryptionConfig;
  secureStorage: SecureStorageConfig;
  validation: ValidationConfig;
  audit: AuditConfig;
  classification: ClassificationConfig;
}

export const SecurityModuleConfigSchema = z.object({
  encryption: EncryptionConfigSchema,
  secureStorage: SecureStorageConfigSchema,
  validation: ValidationConfigSchema,
  audit: AuditConfigSchema,
  classification: ClassificationConfigSchema,
});

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_SECURITY_CONFIG: SecurityModuleConfig = {
  encryption: {
    enabled: false,
    algorithm: "AES-256-GCM",
    keyDerivation: "PBKDF2",
    iterations: 100000,
    saltLength: 16,
    keyLength: 32,
  },
  secureStorage: {
    provider: "flutter_secure_storage",
    biometricProtection: false,
    encryptedSharedPreferences: true,
    fallbackToMemory: false,
  },
  validation: {
    sanitizeInput: true,
    preventSqlInjection: true,
    xssProtection: true,
    htmlEncode: true,
    sqlEscape: true,
    customRules: [],
  },
  audit: {
    enabled: true,
    level: "info",
    events: ["authentication", "authorization", "security_violation"],
    includeTimestamp: true,
    includeUserId: true,
    includeDeviceInfo: false,
    maxLogSize: 1024,
    rotationPolicy: "size",
    retentionDays: 30,
    encryptLogs: false,
    remoteLogging: false,
  },
  classification: {
    enabled: false,
    defaultSensitivity: "internal",
    classifications: [],
    enforceEncryption: true,
    enforceAudit: true,
  },
};

// ============================================================================
// SECURITY FINDING TYPES
// ============================================================================

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";
export type SecurityCategory =
  | "encryption"
  | "authentication"
  | "authorization"
  | "data_protection"
  | "input_validation"
  | "configuration"
  | "dependency"
  | "code_quality";

export interface SecurityFinding {
  id: string;
  category: SecurityCategory;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location?: string;
  line?: number;
  recommendation: string;
  autoFix?: boolean;
  fixCode?: string;
}

export interface SecurityAuditResult {
  timestamp: string;
  projectId: string;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  recommendations: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate security score based on findings
 */
export function calculateSecurityScore(findings: SecurityFinding[]): number {
  if (findings.length === 0) return 100;

  const weights: Record<SecuritySeverity, number> = {
    critical: 25,
    high: 15,
    medium: 10,
    low: 5,
    info: 1,
  };

  const totalDeductions = findings.reduce((sum, finding) => {
    return sum + weights[finding.severity];
  }, 0);

  return Math.max(0, Math.min(100, 100 - totalDeductions));
}

/**
 * Calculate security grade based on score
 */
export function calculateSecurityGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/**
 * Get security dependencies for pubspec
 */
export function getSecurityDependencies(): Record<string, string> {
  return {
    encrypt: "^5.0.3",
    crypto: "^3.0.3",
    flutter_secure_storage: "^9.0.0",
    pointycastle: "^3.7.4",
  };
}

/**
 * Get security dev dependencies for pubspec
 */
export function getSecurityDevDependencies(): Record<string, string> {
  return {};
}

/**
 * Get biometric dependencies for pubspec
 */
export function getBiometricDependencies(): Record<string, string> {
  return {
    local_auth: "^2.1.8",
  };
}

/**
 * Convert a name to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert a name to camelCase
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a name to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/[_\s-]+/g, "_");
}

/**
 * Generate finding ID
 */
export function generateFindingId(category: SecurityCategory, index: number): string {
  const categoryCode = category.substring(0, 3).toUpperCase();
  return `SEC-${categoryCode}-${String(index + 1).padStart(3, "0")}`;
}

/**
 * Built-in security checks
 */
export const BUILT_IN_SECURITY_CHECKS: Array<{
  id: string;
  category: SecurityCategory;
  name: string;
  description: string;
  severity: SecuritySeverity;
}> = [
  {
    id: "no-hardcoded-secrets",
    category: "data_protection",
    name: "No Hardcoded Secrets",
    description: "Checks for API keys, passwords, and secrets in code",
    severity: "critical",
  },
  {
    id: "secure-storage",
    category: "encryption",
    name: "Secure Storage",
    description: "Ensures sensitive data uses encrypted storage",
    severity: "high",
  },
  {
    id: "input-validation",
    category: "input_validation",
    name: "Input Validation",
    description: "Validates user input to prevent injection attacks",
    severity: "high",
  },
  {
    id: "sql-injection",
    category: "input_validation",
    name: "SQL Injection Prevention",
    description: "Checks for SQL injection vulnerabilities",
    severity: "critical",
  },
  {
    id: "xss-protection",
    category: "input_validation",
    name: "XSS Protection",
    description: "Checks for Cross-Site Scripting vulnerabilities",
    severity: "high",
  },
  {
    id: "secure-communication",
    category: "data_protection",
    name: "Secure Communication",
    description: "Ensures HTTPS is used for all network requests",
    severity: "high",
  },
  {
    id: "dependency-audit",
    category: "dependency",
    name: "Dependency Audit",
    description: "Checks for known vulnerabilities in dependencies",
    severity: "medium",
  },
  {
    id: "secure-headers",
    category: "configuration",
    name: "Secure Headers",
    description: "Validates security headers configuration",
    severity: "medium",
  },
  {
    id: "offline-data-security",
    category: "encryption",
    name: "Offline Data Security",
    description: "Ensures OPFS data is encrypted properly",
    severity: "high",
  },
  {
    id: "authentication-flow",
    category: "authentication",
    name: "Authentication Flow",
    description: "Validates secure authentication implementation",
    severity: "critical",
  },
];

/**
 * Security best practices
 */
export const SECURITY_BEST_PRACTICES: string[] = [
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
