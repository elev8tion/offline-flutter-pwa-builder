/**
 * Drift Module Tests
 */

import {
  DriftConfig,
  DEFAULT_DRIFT_CONFIG,
  DriftColumnSchema,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  columnTypeToDart,
  columnTypeToDrift,
} from "../src/modules/drift/config.js";
import {
  DRIFT_MODULE,
  getDriftDependencies,
  generateWebConfig,
  DRIFT_TEMPLATES,
} from "../src/modules/drift/index.js";
import { driftHooks } from "../src/modules/drift/hooks.js";
import { DRIFT_TOOLS, handleDriftTool } from "../src/modules/drift/tools.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

describe("Drift Config", () => {
  describe("Case Conversion Helpers", () => {
    test("toPascalCase should convert correctly", () => {
      expect(toPascalCase("hello_world")).toBe("HelloWorld");
      expect(toPascalCase("user_profile")).toBe("UserProfile");
      expect(toPascalCase("simple")).toBe("Simple");
    });

    test("toCamelCase should convert correctly", () => {
      expect(toCamelCase("hello_world")).toBe("helloWorld");
      expect(toCamelCase("user_profile")).toBe("userProfile");
      expect(toCamelCase("Simple")).toBe("simple");
    });

    test("toSnakeCase should convert correctly", () => {
      expect(toSnakeCase("helloWorld")).toBe("hello_world");
      expect(toSnakeCase("UserProfile")).toBe("user_profile");
      expect(toSnakeCase("simple")).toBe("simple");
    });
  });

  describe("Type Conversion", () => {
    test("columnTypeToDart should map correctly", () => {
      expect(columnTypeToDart("integer")).toBe("int");
      expect(columnTypeToDart("text")).toBe("String");
      expect(columnTypeToDart("real")).toBe("double");
      expect(columnTypeToDart("boolean")).toBe("bool");
      expect(columnTypeToDart("dateTime")).toBe("DateTime");
      expect(columnTypeToDart("blob")).toBe("Uint8List");
    });

    test("columnTypeToDrift should map correctly", () => {
      expect(columnTypeToDrift("integer")).toBe("IntColumn");
      expect(columnTypeToDrift("text")).toBe("TextColumn");
      expect(columnTypeToDrift("real")).toBe("RealColumn");
      expect(columnTypeToDrift("boolean")).toBe("BoolColumn");
      expect(columnTypeToDrift("dateTime")).toBe("DateTimeColumn");
      expect(columnTypeToDrift("blob")).toBe("BlobColumn");
    });
  });

  describe("Column Schema Validation", () => {
    test("should validate a valid column", () => {
      const column = {
        name: "id",
        type: "integer",
        primaryKey: true,
        autoIncrement: true,
      };

      const result = DriftColumnSchema.safeParse(column);
      expect(result.success).toBe(true);
    });

    test("should reject invalid column name", () => {
      const column = {
        name: "Invalid Name",
        type: "text",
      };

      const result = DriftColumnSchema.safeParse(column);
      expect(result.success).toBe(false);
    });

    test("should reject invalid column type", () => {
      const column = {
        name: "valid_name",
        type: "invalid_type",
      };

      const result = DriftColumnSchema.safeParse(column);
      expect(result.success).toBe(false);
    });
  });

  describe("Default Config", () => {
    test("should have valid default values", () => {
      expect(DEFAULT_DRIFT_CONFIG.databaseName).toBe("app_database");
      expect(DEFAULT_DRIFT_CONFIG.encryption).toBe(false);
      expect(DEFAULT_DRIFT_CONFIG.encryptionKeyStrategy).toBe("derived");
      expect(DEFAULT_DRIFT_CONFIG.tables).toEqual([]);
      expect(DEFAULT_DRIFT_CONFIG.relations).toEqual([]);
      expect(DEFAULT_DRIFT_CONFIG.enableMigrations).toBe(true);
      expect(DEFAULT_DRIFT_CONFIG.webWorker).toBe(true);
      expect(DEFAULT_DRIFT_CONFIG.opfs).toBe(true);
      expect(DEFAULT_DRIFT_CONFIG.schemaVersion).toBe(1);
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("Drift Module", () => {
  test("should have correct module metadata", () => {
    expect(DRIFT_MODULE.id).toBe("drift");
    expect(DRIFT_MODULE.name).toBe("Drift Database");
    expect(DRIFT_MODULE.version).toBe("2.14.0");
    expect(DRIFT_MODULE.compatibleTargets).toContain("web");
    expect(DRIFT_MODULE.compatibleTargets).toContain("android");
    expect(DRIFT_MODULE.compatibleTargets).toContain("ios");
  });

  test("should have templates", () => {
    expect(DRIFT_TEMPLATES.length).toBeGreaterThan(0);
    expect(DRIFT_TEMPLATES.some(t => t.id === "drift-database")).toBe(true);
    expect(DRIFT_TEMPLATES.some(t => t.id === "drift-table")).toBe(true);
    expect(DRIFT_TEMPLATES.some(t => t.id === "drift-dao")).toBe(true);
  });

  test("should have assets", () => {
    expect(DRIFT_MODULE.assets.length).toBe(2);
    expect(DRIFT_MODULE.assets.some(a => a.dest === "web/sqlite3.wasm")).toBe(true);
    expect(DRIFT_MODULE.assets.some(a => a.dest === "web/drift_worker.js")).toBe(true);
  });

  test("should have hooks", () => {
    expect(DRIFT_MODULE.hooks.onInstall).toBeDefined();
    expect(DRIFT_MODULE.hooks.beforeGenerate).toBeDefined();
    expect(DRIFT_MODULE.hooks.onGenerate).toBeDefined();
    expect(DRIFT_MODULE.hooks.afterGenerate).toBeDefined();
    expect(DRIFT_MODULE.hooks.beforeBuild).toBeDefined();
    expect(DRIFT_MODULE.hooks.afterBuild).toBeDefined();
  });
});

describe("Drift Dependencies", () => {
  test("should return base dependencies without encryption", () => {
    const deps = getDriftDependencies({ ...DEFAULT_DRIFT_CONFIG, encryption: false });

    expect(deps.dependencies.drift).toBeDefined();
    expect(deps.dependencies.drift_flutter).toBeDefined();
    expect(deps.dependencies.sqlite3_flutter_libs).toBeDefined();
    expect(deps.devDependencies.drift_dev).toBeDefined();
    expect(deps.devDependencies.build_runner).toBeDefined();
  });

  test("should include encryption dependencies when enabled", () => {
    const deps = getDriftDependencies({ ...DEFAULT_DRIFT_CONFIG, encryption: true });

    expect(deps.dependencies.sqlcipher_flutter_libs).toBeDefined();
    expect(deps.dependencies.flutter_secure_storage).toBeDefined();
    expect(deps.dependencies.crypto).toBeDefined();
    // sqlite3_flutter_libs should be removed when encryption is enabled
    expect(deps.dependencies.sqlite3_flutter_libs).toBeUndefined();
  });
});

describe("Web Config Generation", () => {
  test("should generate Vercel config", () => {
    const config = generateWebConfig("vercel");
    expect(config).toContain("Cross-Origin-Opener-Policy");
    expect(config).toContain("Cross-Origin-Embedder-Policy");
    expect(config).toContain("same-origin");
    expect(config).toContain("require-corp");
  });

  test("should generate Netlify config", () => {
    const config = generateWebConfig("netlify");
    expect(config).toContain("[[headers]]");
    expect(config).toContain("Cross-Origin-Opener-Policy");
    expect(config).toContain("Cross-Origin-Embedder-Policy");
  });

  test("should generate Firebase config", () => {
    const config = generateWebConfig("firebase");
    expect(config).toContain("hosting");
    expect(config).toContain("Cross-Origin-Opener-Policy");
    expect(config).toContain("Cross-Origin-Embedder-Policy");
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("Drift Tools", () => {
  test("should define all tools", () => {
    // 6 original + 5 Tier 1 + 5 Tier 2 + 1 seed data = 17 tools
    expect(DRIFT_TOOLS.length).toBe(17);

    const toolNames = DRIFT_TOOLS.map(t => t.name);
    // Original tools
    expect(toolNames).toContain("drift_add_table");
    expect(toolNames).toContain("drift_add_relation");
    expect(toolNames).toContain("drift_generate_dao");
    expect(toolNames).toContain("drift_create_migration");
    expect(toolNames).toContain("drift_enable_encryption");
    expect(toolNames).toContain("drift_run_codegen");
    // Tier 1: Critical Offline Features
    expect(toolNames).toContain("drift_configure_conflict_resolution");
    expect(toolNames).toContain("drift_configure_background_sync");
    expect(toolNames).toContain("drift_configure_offline_indicator");
    expect(toolNames).toContain("drift_configure_optimistic_updates");
    expect(toolNames).toContain("drift_configure_retry_policy");
    // Seed data tool
    expect(toolNames).toContain("drift_generate_seed_data");
    // Tier 2: Performance & Scalability
    expect(toolNames).toContain("drift_configure_pagination");
    expect(toolNames).toContain("drift_configure_lazy_loading");
    expect(toolNames).toContain("drift_configure_query_cache");
    expect(toolNames).toContain("drift_configure_batch_operations");
    expect(toolNames).toContain("drift_configure_data_compression");
  });

  test("drift_add_table should have correct schema", () => {
    const tool = DRIFT_TOOLS.find(t => t.name === "drift_add_table");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("name");
    expect(tool?.inputSchema.properties).toHaveProperty("columns");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("name");
    expect(tool?.inputSchema.required).toContain("columns");
  });

  test("drift_enable_encryption should have strategy options", () => {
    const tool = DRIFT_TOOLS.find(t => t.name === "drift_enable_encryption");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("strategy");
    const props = tool?.inputSchema.properties as Record<string, { enum?: string[] }>;
    const strategy = props?.strategy;
    expect(strategy?.enum).toContain("derived");
    expect(strategy?.enum).toContain("stored");
    expect(strategy?.enum).toContain("user-provided");
  });
});

describe("Drift Tool Handlers", () => {
  // Fresh mock project for each test
  let mockProject: ProjectDefinition;

  // Mock context that uses the current mockProject
  const getMockContext = () => ({
    getProject: (id: string) => (id === "test-project-id" ? mockProject : undefined),
    updateProject: async (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
      return mockProject;
    },
    getDriftConfig: (projectId: string) => {
      if (projectId !== "test-project-id") return undefined;
      const moduleConfig = mockProject.modules.find(m => m.id === "drift");
      return moduleConfig?.config as DriftConfig | undefined;
    },
    updateDriftConfig: (_projectId: string, config: Partial<DriftConfig>) => {
      const moduleConfig = mockProject.modules.find(m => m.id === "drift");
      if (moduleConfig) {
        moduleConfig.config = { ...moduleConfig.config, ...config };
      }
    },
  });

  beforeEach(() => {
    // Create fresh mock project for each test
    mockProject = {
      id: "test-project-id",
      name: "test_app",
      displayName: "Test App",
      version: "1.0.0",
      pwa: {
        name: "Test App",
        shortName: "Test",
        description: "A test app",
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
          id: "drift",
          enabled: true,
          config: { ...DEFAULT_DRIFT_CONFIG },
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  test("drift_add_table should add a table to config", async () => {
    const mockContext = getMockContext();
    const result = await handleDriftTool(
      "drift_add_table",
      {
        projectId: "test-project-id",
        name: "users",
        columns: [
          { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
          { name: "name", type: "text" },
          { name: "email", type: "text", unique: true },
        ],
        timestamps: true,
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Added table: users");

    const config = mockContext.getDriftConfig("test-project-id");
    expect(config?.tables.length).toBe(1);
    expect(config?.tables[0].name).toBe("users");
    expect(config?.tables[0].timestamps).toBe(true);
  });

  test("drift_add_table should reject duplicate table names", async () => {
    const mockContext = getMockContext();

    // Add first table
    await handleDriftTool(
      "drift_add_table",
      {
        projectId: "test-project-id",
        name: "products",
        columns: [{ name: "id", type: "integer", primaryKey: true }],
      },
      mockContext
    );

    // Try to add duplicate
    await expect(
      handleDriftTool(
        "drift_add_table",
        {
          projectId: "test-project-id",
          name: "products",
          columns: [{ name: "id", type: "integer" }],
        },
        mockContext
      )
    ).rejects.toThrow(/already exists/);
  });

  test("drift_add_relation should add a relation", async () => {
    const mockContext = getMockContext();

    // Add tables first with unique names
    await handleDriftTool(
      "drift_add_table",
      {
        projectId: "test-project-id",
        name: "authors",
        columns: [{ name: "id", type: "integer", primaryKey: true }],
      },
      mockContext
    );

    await handleDriftTool(
      "drift_add_table",
      {
        projectId: "test-project-id",
        name: "articles",
        columns: [
          { name: "id", type: "integer", primaryKey: true },
          { name: "authorId", type: "integer" },
        ],
      },
      mockContext
    );

    const result = await handleDriftTool(
      "drift_add_relation",
      {
        projectId: "test-project-id",
        name: "authorArticles",
        fromTable: "authors",
        toTable: "articles",
        type: "oneToMany",
        fromColumn: "id",
        toColumn: "authorId",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Added relation: authorArticles");

    const config = mockContext.getDriftConfig("test-project-id");
    expect(config?.relations.length).toBe(1);
    expect(config?.relations[0].name).toBe("authorArticles");
  });

  test("drift_enable_encryption should enable encryption", async () => {
    const mockContext = getMockContext();
    const result = await handleDriftTool(
      "drift_enable_encryption",
      {
        projectId: "test-project-id",
        strategy: "stored",
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Encryption enabled");

    const config = mockContext.getDriftConfig("test-project-id");
    expect(config?.encryption).toBe(true);
    expect(config?.encryptionKeyStrategy).toBe("stored");
  });

  test("drift_create_migration should increment schema version", async () => {
    const mockContext = getMockContext();
    const result = await handleDriftTool(
      "drift_create_migration",
      {
        projectId: "test-project-id",
        name: "add_user_table",
        upStatements: ["CREATE TABLE users (id INTEGER PRIMARY KEY)"],
        downStatements: ["DROP TABLE users"],
      },
      mockContext
    );

    expect(result.content[0].text).toContain("Created migration");
    expect(result.content[0].text).toContain("2");

    const config = mockContext.getDriftConfig("test-project-id");
    expect(config?.schemaVersion).toBe(2);
  });

  test("should throw error for non-existent project", async () => {
    const mockContext = getMockContext();
    await expect(
      handleDriftTool(
        "drift_add_table",
        {
          projectId: "non-existent-id",
          name: "test",
          columns: [{ name: "id", type: "integer" }],
        },
        mockContext
      )
    ).rejects.toThrow(/not found/);
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("Drift Hooks", () => {
  test("should have all required hooks", () => {
    expect(driftHooks.onInstall).toBeDefined();
    expect(driftHooks.beforeGenerate).toBeDefined();
    expect(driftHooks.onGenerate).toBeDefined();
    expect(driftHooks.afterGenerate).toBeDefined();
    expect(driftHooks.beforeBuild).toBeDefined();
    expect(driftHooks.afterBuild).toBeDefined();
  });
});
