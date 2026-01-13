/**
 * Security Module Tests
 */

import {
  SecurityModuleConfig,
  DEFAULT_SECURITY_CONFIG,
  SecurityModuleConfigSchema,
  EncryptionConfigSchema,
  SecureStorageConfigSchema,
  ValidationConfigSchema,
  AuditConfigSchema,
  ClassificationConfigSchema,
  calculateSecurityScore,
  calculateSecurityGrade,
  getSecurityDependencies,
  getSecurityDevDependencies,
  getBiometricDependencies,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  generateFindingId,
  BUILT_IN_SECURITY_CHECKS,
  SECURITY_BEST_PRACTICES,
} from "../src/modules/security/config.js";
import {
  SECURITY_MODULE,
  SECURITY_DEPENDENCIES,
  BIOMETRIC_DEPENDENCIES,
  getSecurityDependenciesForPubspec,
  getSecurityAnalysisOptions,
  SECURITY_POLICIES,
  meetsMinimumSecurityRequirements,
  getOwaspCompliance,
} from "../src/modules/security/index.js";
import { securityHooks } from "../src/modules/security/hooks.js";
import { SECURITY_TOOLS, handleSecurityTool } from "../src/modules/security/tools.js";
import { SECURITY_TEMPLATES } from "../src/modules/security/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

// Valid UUID for testing
const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

describe("Security Config", () => {
  describe("Case Conversion Utilities", () => {
    test("toPascalCase should convert snake_case correctly", () => {
      expect(toPascalCase("encryption_service")).toBe("EncryptionService");
      expect(toPascalCase("secure_storage")).toBe("SecureStorage");
      expect(toPascalCase("test")).toBe("Test");
    });

    test("toPascalCase should convert kebab-case correctly", () => {
      expect(toPascalCase("key-manager")).toBe("KeyManager");
      expect(toPascalCase("input-validator")).toBe("InputValidator");
    });

    test("toCamelCase should convert snake_case correctly", () => {
      expect(toCamelCase("encryption_service")).toBe("encryptionService");
      expect(toCamelCase("secure_storage")).toBe("secureStorage");
      expect(toCamelCase("test")).toBe("test");
    });

    test("toSnakeCase should convert PascalCase correctly", () => {
      expect(toSnakeCase("EncryptionService")).toBe("encryption_service");
      expect(toSnakeCase("SecureStorage")).toBe("secure_storage");
    });

    test("toSnakeCase should convert camelCase correctly", () => {
      expect(toSnakeCase("encryptionService")).toBe("encryption_service");
      expect(toSnakeCase("secureStorage")).toBe("secure_storage");
    });
  });

  describe("Security Score Calculation", () => {
    test("should return 100 for no findings", () => {
      expect(calculateSecurityScore([])).toBe(100);
    });

    test("should deduct points based on severity", () => {
      const findings = [
        { id: "1", category: "encryption" as const, severity: "critical" as const, title: "Test", description: "Test", recommendation: "Test" },
      ];
      expect(calculateSecurityScore(findings)).toBe(75); // 100 - 25 (critical)
    });

    test("should handle multiple findings", () => {
      const findings = [
        { id: "1", category: "encryption" as const, severity: "high" as const, title: "Test", description: "Test", recommendation: "Test" },
        { id: "2", category: "encryption" as const, severity: "medium" as const, title: "Test", description: "Test", recommendation: "Test" },
      ];
      expect(calculateSecurityScore(findings)).toBe(75); // 100 - 15 (high) - 10 (medium)
    });

    test("should not go below 0", () => {
      const findings = Array(10).fill({
        id: "1",
        category: "encryption" as const,
        severity: "critical" as const,
        title: "Test",
        description: "Test",
        recommendation: "Test",
      });
      expect(calculateSecurityScore(findings)).toBe(0);
    });
  });

  describe("Security Grade Calculation", () => {
    test("should return A for score >= 90", () => {
      expect(calculateSecurityGrade(100)).toBe("A");
      expect(calculateSecurityGrade(90)).toBe("A");
    });

    test("should return B for score >= 80", () => {
      expect(calculateSecurityGrade(89)).toBe("B");
      expect(calculateSecurityGrade(80)).toBe("B");
    });

    test("should return C for score >= 70", () => {
      expect(calculateSecurityGrade(79)).toBe("C");
      expect(calculateSecurityGrade(70)).toBe("C");
    });

    test("should return D for score >= 60", () => {
      expect(calculateSecurityGrade(69)).toBe("D");
      expect(calculateSecurityGrade(60)).toBe("D");
    });

    test("should return F for score < 60", () => {
      expect(calculateSecurityGrade(59)).toBe("F");
      expect(calculateSecurityGrade(0)).toBe("F");
    });
  });

  describe("Finding ID Generation", () => {
    test("should generate correct finding IDs", () => {
      expect(generateFindingId("encryption", 0)).toBe("SEC-ENC-001");
      expect(generateFindingId("input_validation", 9)).toBe("SEC-INP-010");
      expect(generateFindingId("authentication", 99)).toBe("SEC-AUT-100");
    });
  });

  describe("Dependencies", () => {
    test("should return security dependencies", () => {
      const deps = getSecurityDependencies();
      expect(deps).toHaveProperty("encrypt");
      expect(deps).toHaveProperty("crypto");
      expect(deps).toHaveProperty("flutter_secure_storage");
      expect(deps).toHaveProperty("pointycastle");
    });

    test("should return empty dev dependencies", () => {
      const deps = getSecurityDevDependencies();
      expect(Object.keys(deps).length).toBe(0);
    });

    test("should return biometric dependencies", () => {
      const deps = getBiometricDependencies();
      expect(deps).toHaveProperty("local_auth");
    });
  });

  describe("Built-in Security Checks", () => {
    test("should have all required checks defined", () => {
      const checkIds = BUILT_IN_SECURITY_CHECKS.map((c) => c.id);
      expect(checkIds).toContain("no-hardcoded-secrets");
      expect(checkIds).toContain("secure-storage");
      expect(checkIds).toContain("input-validation");
      expect(checkIds).toContain("sql-injection");
      expect(checkIds).toContain("xss-protection");
      expect(checkIds).toContain("offline-data-security");
    });

    test("should have proper severity levels", () => {
      const criticalChecks = BUILT_IN_SECURITY_CHECKS.filter((c) => c.severity === "critical");
      expect(criticalChecks.length).toBeGreaterThanOrEqual(2); // At least hardcoded secrets and SQL injection
    });
  });

  describe("Best Practices", () => {
    test("should have best practices defined", () => {
      expect(SECURITY_BEST_PRACTICES.length).toBeGreaterThan(10);
      expect(SECURITY_BEST_PRACTICES).toContain("Always use HTTPS for network communication");
    });
  });
});

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe("Security Schemas", () => {
  describe("EncryptionConfigSchema", () => {
    test("should validate valid encryption config", () => {
      const config = {
        enabled: true,
        algorithm: "AES-256-GCM",
        keyDerivation: "PBKDF2",
        iterations: 100000,
        saltLength: 16,
        keyLength: 32,
      };
      expect(() => EncryptionConfigSchema.parse(config)).not.toThrow();
    });

    test("should reject invalid algorithm", () => {
      const config = {
        enabled: true,
        algorithm: "DES",
        keyDerivation: "PBKDF2",
        saltLength: 16,
        keyLength: 32,
      };
      expect(() => EncryptionConfigSchema.parse(config)).toThrow();
    });

    test("should reject low iteration count", () => {
      const config = {
        enabled: true,
        algorithm: "AES-256-GCM",
        keyDerivation: "PBKDF2",
        iterations: 100, // Too low
        saltLength: 16,
        keyLength: 32,
      };
      expect(() => EncryptionConfigSchema.parse(config)).toThrow();
    });
  });

  describe("SecureStorageConfigSchema", () => {
    test("should validate valid secure storage config", () => {
      const config = {
        provider: "flutter_secure_storage",
        biometricProtection: true,
        encryptedSharedPreferences: true,
        fallbackToMemory: false,
      };
      expect(() => SecureStorageConfigSchema.parse(config)).not.toThrow();
    });

    test("should reject invalid provider", () => {
      const config = {
        provider: "local_storage", // Invalid
        biometricProtection: false,
        encryptedSharedPreferences: true,
        fallbackToMemory: false,
      };
      expect(() => SecureStorageConfigSchema.parse(config)).toThrow();
    });
  });

  describe("ValidationConfigSchema", () => {
    test("should validate valid validation config", () => {
      const config = {
        sanitizeInput: true,
        preventSqlInjection: true,
        xssProtection: true,
        htmlEncode: true,
        sqlEscape: true,
        customRules: [],
      };
      expect(() => ValidationConfigSchema.parse(config)).not.toThrow();
    });

    test("should validate with custom rules", () => {
      const config = {
        sanitizeInput: true,
        preventSqlInjection: true,
        xssProtection: true,
        htmlEncode: true,
        sqlEscape: true,
        customRules: [
          {
            name: "email_validator",
            type: "email",
            sanitize: true,
          },
        ],
      };
      expect(() => ValidationConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("AuditConfigSchema", () => {
    test("should validate valid audit config", () => {
      const config = {
        enabled: true,
        level: "info",
        events: ["authentication", "authorization"],
        includeTimestamp: true,
        includeUserId: true,
        includeDeviceInfo: false,
        maxLogSize: 1024,
        rotationPolicy: "size",
        retentionDays: 30,
        encryptLogs: false,
        remoteLogging: false,
      };
      expect(() => AuditConfigSchema.parse(config)).not.toThrow();
    });

    test("should reject invalid log level", () => {
      const config = {
        enabled: true,
        level: "verbose", // Invalid
        events: ["authentication"],
        includeTimestamp: true,
        includeUserId: true,
        includeDeviceInfo: false,
        maxLogSize: 1024,
        rotationPolicy: "size",
        retentionDays: 30,
        encryptLogs: false,
        remoteLogging: false,
      };
      expect(() => AuditConfigSchema.parse(config)).toThrow();
    });
  });

  describe("ClassificationConfigSchema", () => {
    test("should validate valid classification config", () => {
      const config = {
        enabled: true,
        defaultSensitivity: "internal",
        classifications: [],
        enforceEncryption: true,
        enforceAudit: true,
      };
      expect(() => ClassificationConfigSchema.parse(config)).not.toThrow();
    });

    test("should validate with classifications", () => {
      const config = {
        enabled: true,
        defaultSensitivity: "internal",
        classifications: [
          {
            name: "user_pii",
            sensitivity: "restricted",
            encryptionRequired: true,
            auditRequired: true,
          },
        ],
        enforceEncryption: true,
        enforceAudit: true,
      };
      expect(() => ClassificationConfigSchema.parse(config)).not.toThrow();
    });
  });

  describe("SecurityModuleConfigSchema", () => {
    test("should validate default config", () => {
      expect(() => SecurityModuleConfigSchema.parse(DEFAULT_SECURITY_CONFIG)).not.toThrow();
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("Security Module", () => {
  test("should have correct module definition", () => {
    expect(SECURITY_MODULE.id).toBe("security");
    expect(SECURITY_MODULE.name).toBe("Security");
    expect(SECURITY_MODULE.version).toBe("1.0.0");
    expect(SECURITY_MODULE.compatibleTargets).toContain("web");
    expect(SECURITY_MODULE.compatibleTargets).toContain("android");
    expect(SECURITY_MODULE.compatibleTargets).toContain("ios");
  });

  test("should have security dependencies defined", () => {
    expect(SECURITY_DEPENDENCIES.dependencies).toHaveProperty("encrypt");
    expect(SECURITY_DEPENDENCIES.dependencies).toHaveProperty("flutter_secure_storage");
  });

  test("should have biometric dependencies defined", () => {
    expect(BIOMETRIC_DEPENDENCIES.dependencies).toHaveProperty("local_auth");
  });

  test("should return correct dependencies for config", () => {
    const configWithBiometric: SecurityModuleConfig = {
      ...DEFAULT_SECURITY_CONFIG,
      secureStorage: {
        ...DEFAULT_SECURITY_CONFIG.secureStorage,
        biometricProtection: true,
      },
    };

    const deps = getSecurityDependenciesForPubspec(configWithBiometric);
    expect(deps.dependencies).toHaveProperty("local_auth");
  });

  test("should generate analysis options", () => {
    const options = getSecurityAnalysisOptions();
    expect(options).toContain("avoid_print");
    expect(options).toContain("linter");
  });

  describe("Security Policies", () => {
    test("should have policies defined", () => {
      expect(SECURITY_POLICIES.length).toBeGreaterThan(0);
    });

    test("should have required policies", () => {
      const policyIds = SECURITY_POLICIES.map((p) => p.id);
      expect(policyIds).toContain("no-hardcoded-secrets");
      expect(policyIds).toContain("secure-storage");
      expect(policyIds).toContain("secure-http");
    });

    test("policies should have patterns", () => {
      for (const policy of SECURITY_POLICIES) {
        expect(policy.patterns.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Minimum Security Requirements", () => {
    test("should pass with fully secure config", () => {
      const secureConfig: SecurityModuleConfig = {
        ...DEFAULT_SECURITY_CONFIG,
        encryption: { ...DEFAULT_SECURITY_CONFIG.encryption, enabled: true },
        validation: {
          ...DEFAULT_SECURITY_CONFIG.validation,
          sanitizeInput: true,
          preventSqlInjection: true,
          xssProtection: true,
        },
        audit: { ...DEFAULT_SECURITY_CONFIG.audit, enabled: true },
      };

      const result = meetsMinimumSecurityRequirements(secureConfig);
      expect(result.meets).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    test("should fail with default config", () => {
      const result = meetsMinimumSecurityRequirements(DEFAULT_SECURITY_CONFIG);
      expect(result.meets).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe("OWASP Compliance", () => {
    test("should return compliance status", () => {
      const result = getOwaspCompliance(DEFAULT_SECURITY_CONFIG);
      expect(result.compliant).toBeInstanceOf(Array);
      expect(result.nonCompliant).toBeInstanceOf(Array);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test("should have better score with secure config", () => {
      const secureConfig: SecurityModuleConfig = {
        ...DEFAULT_SECURITY_CONFIG,
        encryption: { ...DEFAULT_SECURITY_CONFIG.encryption, enabled: true },
        secureStorage: { ...DEFAULT_SECURITY_CONFIG.secureStorage, biometricProtection: true },
        validation: { ...DEFAULT_SECURITY_CONFIG.validation, sanitizeInput: true },
        audit: { ...DEFAULT_SECURITY_CONFIG.audit, enabled: true },
      };

      const defaultResult = getOwaspCompliance(DEFAULT_SECURITY_CONFIG);
      const secureResult = getOwaspCompliance(secureConfig);

      expect(secureResult.score).toBeGreaterThanOrEqual(defaultResult.score);
    });
  });
});

// ============================================================================
// TOOLS TESTS
// ============================================================================

describe("Security Tools", () => {
  test("should have all required tools defined", () => {
    const toolNames = SECURITY_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("security_enable_encryption");
    expect(toolNames).toContain("security_add_validation");
    expect(toolNames).toContain("security_audit");
    expect(toolNames).toContain("security_classify_data");
  });

  test("tools should have proper input schemas", () => {
    for (const tool of SECURITY_TOOLS) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toBeDefined();
      expect(tool.inputSchema.required).toContain("projectId");
    }
  });
});

// ============================================================================
// TOOL HANDLER TESTS
// ============================================================================

describe("Security Tool Handlers", () => {
  let mockProject: ProjectDefinition;

  const getMockContext = () => ({
    getProject: (id: string) => (id === TEST_PROJECT_UUID ? mockProject : undefined),
    updateProject: (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
    },
    getSecurityConfig: (projectId: string) => {
      if (projectId !== TEST_PROJECT_UUID) return undefined;
      const moduleConfig = mockProject.modules.find((m) => m.id === "security");
      return moduleConfig?.config as SecurityModuleConfig | undefined;
    },
    updateSecurityConfig: (_projectId: string, config: Partial<SecurityModuleConfig>) => {
      const moduleIndex = mockProject.modules.findIndex((m) => m.id === "security");
      if (moduleIndex >= 0) {
        mockProject.modules[moduleIndex].config = {
          ...mockProject.modules[moduleIndex].config,
          ...config,
        };
      } else {
        mockProject.modules.push({
          id: "security",
          enabled: true,
          config: config as unknown as Record<string, unknown>,
        });
      }
    },
  });

  beforeEach(() => {
    // Deep copy DEFAULT_SECURITY_CONFIG to avoid array mutation issues between tests
    const freshSecurityConfig: SecurityModuleConfig = {
      ...DEFAULT_SECURITY_CONFIG,
      encryption: { ...DEFAULT_SECURITY_CONFIG.encryption },
      secureStorage: { ...DEFAULT_SECURITY_CONFIG.secureStorage },
      validation: {
        ...DEFAULT_SECURITY_CONFIG.validation,
        customRules: [], // Fresh empty array
      },
      audit: {
        ...DEFAULT_SECURITY_CONFIG.audit,
        events: [...DEFAULT_SECURITY_CONFIG.audit.events], // Fresh array
      },
      classification: {
        ...DEFAULT_SECURITY_CONFIG.classification,
        classifications: [], // Fresh empty array
      },
    };

    mockProject = {
      id: TEST_PROJECT_UUID,
      name: "test_project",
      displayName: "Test Project",
      version: "1.0.0",
      pwa: {
        name: "Test",
        shortName: "Test",
        description: "",
        themeColor: "#2196F3",
        backgroundColor: "#FFFFFF",
        display: "standalone",
        orientation: "any",
        icons: [],
        startUrl: "/",
        scope: "/",
      },
      offline: {
        strategy: "offline-first",
        storage: { type: "drift", encryption: false },
        caching: { assets: true, api: true, ttl: 3600 },
      },
      architecture: "feature-first",
      stateManagement: "riverpod",
      modules: [
        {
          id: "security",
          enabled: true,
          config: freshSecurityConfig as unknown as Record<string, unknown>,
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe("security_enable_encryption", () => {
    test("should enable encryption with default settings", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_enable_encryption",
        { projectId: TEST_PROJECT_UUID },
        mockContext
      )) as { success: boolean; encryption: { algorithm: string } };

      expect(result.success).toBe(true);
      expect(result.encryption.algorithm).toBe("AES-256-GCM");
    });

    test("should enable encryption with custom algorithm", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_enable_encryption",
        {
          projectId: TEST_PROJECT_UUID,
          algorithm: "ChaCha20-Poly1305",
          keyDerivation: "Argon2",
        },
        mockContext
      )) as { success: boolean; encryption: { algorithm: string; keyDerivation: string } };

      expect(result.success).toBe(true);
      expect(result.encryption.algorithm).toBe("ChaCha20-Poly1305");
      expect(result.encryption.keyDerivation).toBe("Argon2");
    });

    test("should enable biometric protection", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_enable_encryption",
        {
          projectId: TEST_PROJECT_UUID,
          biometricProtection: true,
        },
        mockContext
      )) as { success: boolean; encryption: { biometricProtection: boolean }; dependencies: Record<string, string> };

      expect(result.success).toBe(true);
      expect(result.encryption.biometricProtection).toBe(true);
      expect(result.dependencies).toHaveProperty("local_auth");
    });

    test("should throw error for non-existent project", async () => {
      const mockContext = getMockContext();
      await expect(
        handleSecurityTool(
          "security_enable_encryption",
          { projectId: NON_EXISTENT_UUID },
          mockContext
        )
      ).rejects.toThrow(/not found/);
    });
  });

  describe("security_add_validation", () => {
    test("should add validation rule", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_add_validation",
        {
          projectId: TEST_PROJECT_UUID,
          name: "email_input",
          type: "email",
        },
        mockContext
      )) as { success: boolean; validation: { name: string; type: string } };

      expect(result.success).toBe(true);
      expect(result.validation.name).toBe("email_input");
      expect(result.validation.type).toBe("email");
    });

    test("should add validation rule with custom pattern", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_add_validation",
        {
          projectId: TEST_PROJECT_UUID,
          name: "custom_id",
          type: "custom",
          pattern: "^[A-Z]{3}-[0-9]{4}$",
          minLength: 8,
          maxLength: 8,
        },
        mockContext
      )) as { success: boolean; validation: { name: string; pattern: string; minLength: number; maxLength: number } };

      expect(result.success).toBe(true);
      expect(result.validation.name).toBe("custom_id");
      expect(result.validation.pattern).toBe("^[A-Z]{3}-[0-9]{4}$");
      expect(result.validation.minLength).toBe(8);
      expect(result.validation.maxLength).toBe(8);
    });

    test("should update existing validation rule", async () => {
      const mockContext = getMockContext();
      // First add a rule
      await handleSecurityTool(
        "security_add_validation",
        {
          projectId: TEST_PROJECT_UUID,
          name: "email_input",
          type: "email",
        },
        mockContext
      );

      // Update the same rule
      const result = (await handleSecurityTool(
        "security_add_validation",
        {
          projectId: TEST_PROJECT_UUID,
          name: "email_input",
          type: "email",
          minLength: 5,
        },
        mockContext
      )) as { success: boolean; totalRules: number };

      expect(result.success).toBe(true);
      expect(result.totalRules).toBe(1); // Should update, not add
    });

    test("should throw error for non-existent project", async () => {
      const mockContext = getMockContext();
      await expect(
        handleSecurityTool(
          "security_add_validation",
          { projectId: NON_EXISTENT_UUID, name: "test" },
          mockContext
        )
      ).rejects.toThrow(/not found/);
    });
  });

  describe("security_audit", () => {
    test("should run security audit with default settings", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_audit",
        { projectId: TEST_PROJECT_UUID },
        mockContext
      )) as { success: boolean; audit: { score: number; grade: string; findings: unknown[]; summary: Record<string, number> } };

      expect(result.success).toBe(true);
      expect(result.audit).toBeDefined();
      expect(result.audit.score).toBeGreaterThanOrEqual(0);
      expect(result.audit.score).toBeLessThanOrEqual(100);
      expect(result.audit.grade).toMatch(/^[A-F]$/);
      expect(result.audit.findings).toBeInstanceOf(Array);
      expect(result.audit.summary).toBeDefined();
    });

    test("should filter by severity", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_audit",
        {
          projectId: TEST_PROJECT_UUID,
          severity: "critical",
        },
        mockContext
      )) as { success: boolean; audit: { findings: Array<{ severity: string }> } };

      expect(result.success).toBe(true);
      // All findings should be critical severity
      for (const finding of result.audit.findings) {
        expect(finding.severity).toBe("critical");
      }
    });

    test("should include recommendations", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_audit",
        {
          projectId: TEST_PROJECT_UUID,
          includeRecommendations: true,
        },
        mockContext
      )) as { success: boolean; audit: { recommendations: string[] } };

      expect(result.success).toBe(true);
      expect(result.audit.recommendations).toBeInstanceOf(Array);
      expect(result.audit.recommendations.length).toBeGreaterThan(0);
    });

    test("should generate report files", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_audit",
        {
          projectId: TEST_PROJECT_UUID,
          generateReport: true,
        },
        mockContext
      )) as { success: boolean; generatedFiles: string[] };

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toContain("security_audit_report.json");
      expect(result.generatedFiles).toContain("security_audit_report.md");
    });

    test("should throw error for non-existent project", async () => {
      const mockContext = getMockContext();
      await expect(
        handleSecurityTool(
          "security_audit",
          { projectId: NON_EXISTENT_UUID },
          mockContext
        )
      ).rejects.toThrow(/not found/);
    });
  });

  describe("security_classify_data", () => {
    test("should create data classification", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_classify_data",
        {
          projectId: TEST_PROJECT_UUID,
          name: "user_pii",
          sensitivity: "restricted",
          encryptionRequired: true,
          auditRequired: true,
        },
        mockContext
      )) as { success: boolean; classification: { name: string; sensitivity: string }; requirements: { encryption: boolean; audit: boolean } };

      expect(result.success).toBe(true);
      expect(result.classification.name).toBe("user_pii");
      expect(result.classification.sensitivity).toBe("restricted");
      expect(result.requirements.encryption).toBe(true);
      expect(result.requirements.audit).toBe(true);
    });

    test("should create classification with retention policy", async () => {
      const mockContext = getMockContext();
      const result = (await handleSecurityTool(
        "security_classify_data",
        {
          projectId: TEST_PROJECT_UUID,
          name: "financial_data",
          sensitivity: "confidential",
          retentionPolicy: "7 years",
          handlingInstructions: "Do not share externally",
        },
        mockContext
      )) as { success: boolean; classification: { name: string; retentionPolicy: string; handlingInstructions: string } };

      expect(result.success).toBe(true);
      expect(result.classification.name).toBe("financial_data");
      expect(result.classification.retentionPolicy).toBe("7 years");
      expect(result.classification.handlingInstructions).toBe("Do not share externally");
    });

    test("should update existing classification", async () => {
      const mockContext = getMockContext();
      // First add a classification
      await handleSecurityTool(
        "security_classify_data",
        {
          projectId: TEST_PROJECT_UUID,
          name: "user_pii",
          sensitivity: "confidential",
        },
        mockContext
      );

      // Update it
      const result = (await handleSecurityTool(
        "security_classify_data",
        {
          projectId: TEST_PROJECT_UUID,
          name: "user_pii",
          sensitivity: "restricted",
          encryptionRequired: true,
        },
        mockContext
      )) as { success: boolean; totalClassifications: number };

      expect(result.success).toBe(true);
      expect(result.totalClassifications).toBe(1); // Should update, not add
    });

    test("should throw error for non-existent project", async () => {
      const mockContext = getMockContext();
      await expect(
        handleSecurityTool(
          "security_classify_data",
          { projectId: NON_EXISTENT_UUID, name: "test", sensitivity: "public" },
          mockContext
        )
      ).rejects.toThrow(/not found/);
    });
  });

  describe("Unknown tool", () => {
    test("should throw error for unknown tool", async () => {
      const mockContext = getMockContext();
      await expect(
        handleSecurityTool("security_unknown_tool", { projectId: TEST_PROJECT_UUID }, mockContext)
      ).rejects.toThrow(/Unknown security tool/);
    });
  });
});

// ============================================================================
// TEMPLATES TESTS
// ============================================================================

describe("Security Templates", () => {
  test("should have all required templates defined", () => {
    const templateIds = SECURITY_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain("encryption_service");
    expect(templateIds).toContain("key_manager");
    expect(templateIds).toContain("input_validator");
    expect(templateIds).toContain("secure_storage_service");
    expect(templateIds).toContain("audit_logger");
    expect(templateIds).toContain("biometric_service");
  });

  test("templates should have proper structure", () => {
    for (const template of SECURITY_TEMPLATES) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.type).toBe("file");
      expect(template.source).toBeDefined();
      expect(template.source.length).toBeGreaterThan(0);
      expect(template.output).toBeDefined();
      expect(template.output.path).toBeDefined();
      expect(template.output.filename).toBeDefined();
      expect(template.output.extension).toBe(".dart");
    }
  });

  test("encryption_service template should contain encryption logic", () => {
    const template = SECURITY_TEMPLATES.find((t) => t.id === "encryption_service");
    expect(template).toBeDefined();
    expect(template!.source).toContain("encryptWithPassword");
    expect(template!.source).toContain("decryptWithPassword");
    expect(template!.source).toContain("AES");
  });

  test("input_validator template should contain validation logic", () => {
    const template = SECURITY_TEMPLATES.find((t) => t.id === "input_validator");
    expect(template).toBeDefined();
    expect(template!.source).toContain("sanitize");
    expect(template!.source).toContain("isValidEmail");
    expect(template!.source).toContain("_escapeSql");
    expect(template!.source).toContain("_escapeXss");
  });

  test("audit_logger template should contain logging logic", () => {
    const template = SECURITY_TEMPLATES.find((t) => t.id === "audit_logger");
    expect(template).toBeDefined();
    expect(template!.source).toContain("AuditEventType");
    expect(template!.source).toContain("AuditLogEntry");
    expect(template!.source).toContain("log");
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Security Hooks", () => {
  test("should have all required hooks defined", () => {
    expect(securityHooks.onInstall).toBeDefined();
    expect(securityHooks.beforeGenerate).toBeDefined();
    expect(securityHooks.onGenerate).toBeDefined();
    expect(securityHooks.afterGenerate).toBeDefined();
    expect(securityHooks.beforeBuild).toBeDefined();
    expect(securityHooks.afterBuild).toBeDefined();
    expect(securityHooks.onUninstall).toBeDefined();
  });
});
