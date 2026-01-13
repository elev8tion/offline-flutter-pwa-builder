/**
 * State Module Tests
 */

import {
  StateModuleConfig,
  DEFAULT_STATE_CONFIG,
  StateModuleConfigSchema,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  generateProviderName,
  generateBlocNames,
  getStateDependencies,
} from "../src/modules/state/config.js";
import {
  STATE_MODULE,
  RIVERPOD_DEPENDENCIES,
  BLOC_DEPENDENCIES,
  PROVIDER_DEPENDENCIES,
  getStateDependenciesForPubspec,
  getRiverpodBuildYaml,
  getRiverpodAnalysisOptions,
  generateOfflineSyncService,
  STATE_BEST_PRACTICES,
} from "../src/modules/state/index.js";
import { stateHooks } from "../src/modules/state/hooks.js";
import { STATE_TOOLS, handleStateTool } from "../src/modules/state/tools.js";
import { STATE_TEMPLATES } from "../src/modules/state/templates.js";
import type { ProjectDefinition } from "../src/core/types.js";

// ============================================================================
// CONFIG TESTS
// ============================================================================

// Valid UUID for testing
const TEST_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NON_EXISTENT_UUID = "00000000-0000-0000-0000-000000000000";

describe("State Config", () => {
  describe("Case Conversion Utilities", () => {
    test("toPascalCase should convert snake_case correctly", () => {
      expect(toPascalCase("user_settings")).toBe("UserSettings");
      expect(toPascalCase("user_profile")).toBe("UserProfile");
      expect(toPascalCase("test")).toBe("Test");
    });

    test("toPascalCase should convert kebab-case correctly", () => {
      expect(toPascalCase("user-profile")).toBe("UserProfile");
      expect(toPascalCase("my-component")).toBe("MyComponent");
    });

    test("toCamelCase should convert snake_case correctly", () => {
      expect(toCamelCase("user_settings")).toBe("userSettings");
      expect(toCamelCase("user_profile")).toBe("userProfile");
      expect(toCamelCase("test")).toBe("test");
    });

    test("toCamelCase should convert kebab-case correctly", () => {
      expect(toCamelCase("user-profile")).toBe("userProfile");
      expect(toCamelCase("my-component")).toBe("myComponent");
    });

    test("toSnakeCase should convert PascalCase correctly", () => {
      expect(toSnakeCase("UserSettings")).toBe("user_settings");
      expect(toSnakeCase("TestCase")).toBe("test_case");
    });

    test("toSnakeCase should convert camelCase correctly", () => {
      expect(toSnakeCase("userSettings")).toBe("user_settings");
      expect(toSnakeCase("testCase")).toBe("test_case");
    });
  });

  describe("Provider Name Generation", () => {
    test("should generate provider names correctly", () => {
      // generateProviderName converts to camelCase + type suffix
      expect(generateProviderName("user_settings", "provider")).toBe("userSettingsProvider");
      expect(generateProviderName("user_settings", "stateProvider")).toBe("userSettingsStateProvider");
      // stateNotifierProvider generates *NotifierProvider (not *StateNotifierProvider)
      expect(generateProviderName("auth", "stateNotifierProvider")).toBe("authNotifierProvider");
      expect(generateProviderName("data", "futureProvider")).toBe("dataFutureProvider");
      expect(generateProviderName("stream", "streamProvider")).toBe("streamStreamProvider");
    });
  });

  describe("BLoC Names Generation", () => {
    test("should generate BLoC names correctly", () => {
      // Use snake_case input as toPascalCase is designed for snake_case/kebab-case
      const names = generateBlocNames("user_auth", false);
      expect(names.bloc).toBe("UserAuthBloc");
      expect(names.event).toBe("UserAuthEvent");
      expect(names.state).toBe("UserAuthState");
      expect(names.fileName).toBe("user_auth_bloc");
    });

    test("should generate Cubit names correctly", () => {
      const names = generateBlocNames("counter", true);
      expect(names.bloc).toBe("CounterCubit");
      expect(names.event).toBe("CounterEvent");
      expect(names.state).toBe("CounterState");
      expect(names.fileName).toBe("counter_cubit");
    });
  });

  describe("Dependencies", () => {
    test("should return Riverpod dependencies", () => {
      const deps = getStateDependencies("riverpod");
      expect(deps.dependencies).toHaveProperty("flutter_riverpod");
      expect(deps.devDependencies).toHaveProperty("riverpod_generator");
    });

    test("should return BLoC dependencies", () => {
      const deps = getStateDependencies("bloc");
      expect(deps.dependencies).toHaveProperty("flutter_bloc");
      expect(deps.dependencies).toHaveProperty("equatable");
      expect(deps.devDependencies).toHaveProperty("bloc_test");
    });

    test("should return Provider dependencies", () => {
      const deps = getStateDependencies("provider");
      expect(deps.dependencies).toHaveProperty("provider");
      // Note: config.ts getStateDependencies for provider only returns provider
      // The index.ts PROVIDER_DEPENDENCIES includes connectivity_plus
    });
  });

  describe("Default Config", () => {
    test("should have valid default values", () => {
      expect(DEFAULT_STATE_CONFIG.type).toBe("riverpod");
      expect(DEFAULT_STATE_CONFIG.providers).toEqual([]);
      expect(DEFAULT_STATE_CONFIG.blocs).toEqual([]);
      expect(DEFAULT_STATE_CONFIG.offlineSync.enabled).toBe(true);
      expect(DEFAULT_STATE_CONFIG.offlineSync.strategy).toBe("auto");
    });

    test("should have offline sync config", () => {
      expect(DEFAULT_STATE_CONFIG.offlineSync.conflictResolution).toBe("lastWrite");
      expect(DEFAULT_STATE_CONFIG.offlineSync.retryAttempts).toBe(3);
      expect(DEFAULT_STATE_CONFIG.offlineSync.retryDelay).toBe(1000);
      expect(DEFAULT_STATE_CONFIG.offlineSync.queuePersistence).toBe(true);
    });

    test("should have code generation config", () => {
      expect(DEFAULT_STATE_CONFIG.codeGeneration.generateFreezed).toBe(false);
      expect(DEFAULT_STATE_CONFIG.codeGeneration.generateJsonSerializable).toBe(true);
      expect(DEFAULT_STATE_CONFIG.codeGeneration.generateEquatable).toBe(true);
    });
  });

  describe("Schema Validation", () => {
    test("should validate valid config", () => {
      const result = StateModuleConfigSchema.safeParse(DEFAULT_STATE_CONFIG);
      expect(result.success).toBe(true);
    });

    test("should validate config with providers", () => {
      const config: StateModuleConfig = {
        ...DEFAULT_STATE_CONFIG,
        providers: [
          {
            name: "userSettings",
            type: "stateProvider",
            stateType: "UserSettings",
            asyncState: false,
            autoDispose: true,
            family: false,
          },
        ],
      };
      const result = StateModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test("should validate config with BLoCs", () => {
      const config: StateModuleConfig = {
        ...DEFAULT_STATE_CONFIG,
        type: "bloc",
        blocs: [
          {
            name: "Auth",
            events: [{ name: "LoginRequested" }],
            states: [{ name: "AuthInitial", isInitial: true }],
            useCubit: false,
            useEquatable: true,
            useFreezesd: false,
          },
        ],
      };
      const result = StateModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test("should reject invalid state type", () => {
      const config = {
        ...DEFAULT_STATE_CONFIG,
        type: "invalid",
      };
      const result = StateModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// MODULE TESTS
// ============================================================================

describe("State Module", () => {
  test("should have correct module metadata", () => {
    expect(STATE_MODULE.id).toBe("state");
    expect(STATE_MODULE.name).toBe("State Management");
    expect(STATE_MODULE.version).toBe("1.0.0");
    expect(STATE_MODULE.compatibleTargets).toContain("web");
    expect(STATE_MODULE.compatibleTargets).toContain("android");
    expect(STATE_MODULE.compatibleTargets).toContain("ios");
  });

  test("should have templates", () => {
    expect(STATE_TEMPLATES.length).toBeGreaterThan(0);
    expect(STATE_TEMPLATES.some((t) => t.id === "state-riverpod-provider")).toBe(true);
    expect(STATE_TEMPLATES.some((t) => t.id === "state-bloc-main")).toBe(true);
    expect(STATE_TEMPLATES.some((t) => t.id === "state-feature-repository")).toBe(true);
    expect(STATE_TEMPLATES.some((t) => t.id === "state-feature-model")).toBe(true);
  });

  test("should have hooks", () => {
    expect(STATE_MODULE.hooks.onInstall).toBeDefined();
    expect(STATE_MODULE.hooks.beforeGenerate).toBeDefined();
    expect(STATE_MODULE.hooks.onGenerate).toBeDefined();
    expect(STATE_MODULE.hooks.afterGenerate).toBeDefined();
    expect(STATE_MODULE.hooks.beforeBuild).toBeDefined();
    expect(STATE_MODULE.hooks.afterBuild).toBeDefined();
  });
});

describe("State Helper Functions", () => {
  test("getStateDependenciesForPubspec should return Riverpod deps", () => {
    const deps = getStateDependenciesForPubspec("riverpod");
    expect(deps.dependencies).toHaveProperty("flutter_riverpod");
    expect(deps.devDependencies).toHaveProperty("riverpod_generator");
  });

  test("getStateDependenciesForPubspec should return BLoC deps", () => {
    const deps = getStateDependenciesForPubspec("bloc");
    expect(deps.dependencies).toHaveProperty("flutter_bloc");
    expect(deps.devDependencies).toHaveProperty("bloc_test");
  });

  test("getStateDependenciesForPubspec should return Provider deps", () => {
    const deps = getStateDependenciesForPubspec("provider");
    expect(deps.dependencies).toHaveProperty("provider");
  });

  test("getRiverpodBuildYaml should generate build.yaml content", () => {
    const yaml = getRiverpodBuildYaml();
    expect(yaml).toContain("riverpod_generator");
    expect(yaml).toContain("targets");
    expect(yaml).toContain("provider_name_suffix");
  });

  test("getRiverpodAnalysisOptions should generate analysis_options content", () => {
    const options = getRiverpodAnalysisOptions();
    expect(options).toContain("custom_lint");
    expect(options).toContain("riverpod_final_provider");
  });

  test("generateOfflineSyncService should generate Dart code", () => {
    const service = generateOfflineSyncService(DEFAULT_STATE_CONFIG);
    expect(service).toContain("OfflineSyncService");
    expect(service).toContain("SyncOperation");
    expect(service).toContain("connectivity_plus");
    expect(service).toContain(String(DEFAULT_STATE_CONFIG.offlineSync.retryAttempts));
    expect(service).toContain(String(DEFAULT_STATE_CONFIG.offlineSync.retryDelay));
  });

  test("should have best practices", () => {
    expect(STATE_BEST_PRACTICES.length).toBeGreaterThan(5);
    expect(STATE_BEST_PRACTICES.some((t) => t.includes("autoDispose"))).toBe(true);
    expect(STATE_BEST_PRACTICES.some((t) => t.includes("BLoC"))).toBe(true);
    expect(STATE_BEST_PRACTICES.some((t) => t.includes("offline"))).toBe(true);
  });
});

// ============================================================================
// TOOL TESTS
// ============================================================================

describe("State Tools", () => {
  test("should define all tools", () => {
    expect(STATE_TOOLS.length).toBe(4);

    const toolNames = STATE_TOOLS.map((t) => t.name);
    expect(toolNames).toContain("state_create_provider");
    expect(toolNames).toContain("state_create_bloc");
    expect(toolNames).toContain("state_generate_feature");
    expect(toolNames).toContain("state_configure_offline_sync");
  });

  test("state_create_provider should have correct schema", () => {
    const tool = STATE_TOOLS.find((t) => t.name === "state_create_provider");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("name");
    expect(tool?.inputSchema.properties).toHaveProperty("type");
    expect(tool?.inputSchema.properties).toHaveProperty("stateType");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("name");
    expect(tool?.inputSchema.required).toContain("stateType");
  });

  test("state_create_bloc should have correct schema", () => {
    const tool = STATE_TOOLS.find((t) => t.name === "state_create_bloc");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("name");
    expect(tool?.inputSchema.properties).toHaveProperty("events");
    expect(tool?.inputSchema.properties).toHaveProperty("states");
    expect(tool?.inputSchema.properties).toHaveProperty("useCubit");
    expect(tool?.inputSchema.required).toContain("projectId");
    expect(tool?.inputSchema.required).toContain("name");
  });

  test("state_generate_feature should have correct schema", () => {
    const tool = STATE_TOOLS.find((t) => t.name === "state_generate_feature");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("name");
    expect(tool?.inputSchema.properties).toHaveProperty("stateType");
    expect(tool?.inputSchema.properties).toHaveProperty("operations");
  });

  test("state_configure_offline_sync should have correct schema", () => {
    const tool = STATE_TOOLS.find((t) => t.name === "state_configure_offline_sync");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("projectId");
    expect(tool?.inputSchema.properties).toHaveProperty("enabled");
    expect(tool?.inputSchema.properties).toHaveProperty("strategy");
    expect(tool?.inputSchema.properties).toHaveProperty("conflictResolution");
  });
});

describe("State Tool Handlers", () => {
  let mockProject: ProjectDefinition;

  const getMockContext = () => ({
    getProject: (id: string) => (id === TEST_PROJECT_UUID ? mockProject : undefined),
    updateProject: (_id: string, updates: Partial<ProjectDefinition>) => {
      Object.assign(mockProject, updates);
    },
    getStateConfig: (projectId: string) => {
      if (projectId !== TEST_PROJECT_UUID) return undefined;
      const moduleConfig = mockProject.modules.find((m) => m.id === "state");
      return moduleConfig?.config as StateModuleConfig | undefined;
    },
    updateStateConfig: (_projectId: string, config: Partial<StateModuleConfig>) => {
      const moduleIndex = mockProject.modules.findIndex((m) => m.id === "state");
      if (moduleIndex >= 0) {
        mockProject.modules[moduleIndex].config = {
          ...mockProject.modules[moduleIndex].config,
          ...config,
        };
      } else {
        mockProject.modules.push({
          id: "state",
          enabled: true,
          config: config,
        });
      }
    },
  });

  beforeEach(() => {
    // Deep copy DEFAULT_STATE_CONFIG to avoid array mutation issues between tests
    const freshStateConfig: StateModuleConfig = {
      ...DEFAULT_STATE_CONFIG,
      providers: [], // Fresh empty array for each test
      blocs: [],     // Fresh empty array for each test
      offlineSync: { ...DEFAULT_STATE_CONFIG.offlineSync },
      codeGeneration: { ...DEFAULT_STATE_CONFIG.codeGeneration },
    };

    mockProject = {
      id: TEST_PROJECT_UUID,
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
          id: "state",
          enabled: true,
          config: freshStateConfig as unknown as Record<string, unknown>,
        },
      ],
      targets: ["web"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  test("state_create_provider should create a provider", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_create_provider",
      {
        projectId: TEST_PROJECT_UUID,
        name: "userSettings", // Schema requires camelCase (no underscores)
        type: "stateProvider",
        stateType: "UserSettings",
        autoDispose: true,
      },
      mockContext
    ) as { success: boolean; message: string };

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("message");
    // The message includes the generated provider name
    expect(result.message).toContain("StateProvider");

    const config = mockContext.getStateConfig(TEST_PROJECT_UUID);
    expect(config?.providers.length).toBe(1);
    expect(config?.providers[0].name).toBe("userSettings");
    expect(config?.providers[0].type).toBe("stateProvider");
  });

  test("state_create_bloc should create a BLoC", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_create_bloc",
      {
        projectId: TEST_PROJECT_UUID,
        name: "Auth",
        events: ["LoginRequested", "LogoutRequested"],
        states: ["AuthInitial", "AuthLoading", "AuthSuccess", "AuthFailure"],
        useEquatable: true,
      },
      mockContext
    ) as { success: boolean; message: string };

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("message");
    expect(result.message).toContain("AuthBloc");

    const config = mockContext.getStateConfig(TEST_PROJECT_UUID);
    expect(config?.blocs.length).toBe(1);
    expect(config?.blocs[0].name).toBe("Auth");
    expect(config?.blocs[0].events.length).toBe(2);
    expect(config?.blocs[0].states.length).toBe(4);
  });

  test("state_create_bloc should create a Cubit", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_create_bloc",
      {
        projectId: TEST_PROJECT_UUID,
        name: "Counter",
        events: ["Increment", "Decrement"],
        states: ["CounterValue"],
        useCubit: true,
      },
      mockContext
    ) as { success: boolean; message: string };

    expect(result).toHaveProperty("success", true);
    expect(result.message).toContain("Cubit");
    expect(result.message).toContain("CounterCubit");
  });

  test("state_generate_feature should generate feature files", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_generate_feature",
      {
        projectId: TEST_PROJECT_UUID,
        name: "user_profile",
        stateType: "riverpod",
        hasUI: true,
        hasRepository: true,
        hasModel: true,
        offlineEnabled: true,
        operations: ["create", "read", "update", "delete", "list"],
      },
      mockContext
    ) as { success: boolean; files: string[] };

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("files");
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((f: string) => f.includes("user_profile"))).toBe(true);
    expect(result.files.some((f: string) => f.includes("repository"))).toBe(true);
    expect(result.files.some((f: string) => f.includes("provider"))).toBe(true);
  });

  test("state_generate_feature with BLoC should include BLoC files", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_generate_feature",
      {
        projectId: TEST_PROJECT_UUID,
        name: "todo_item",
        stateType: "bloc",
        hasUI: true,
        hasRepository: true,
        hasModel: true,
      },
      mockContext
    ) as { success: boolean; files: string[] };

    expect(result).toHaveProperty("success", true);
    expect(result.files.some((f: string) => f.includes("bloc"))).toBe(true);
    expect(result.files.some((f: string) => f.includes("event"))).toBe(true);
    expect(result.files.some((f: string) => f.includes("state"))).toBe(true);
  });

  test("state_configure_offline_sync should update sync settings", async () => {
    const mockContext = getMockContext();
    const result = await handleStateTool(
      "state_configure_offline_sync",
      {
        projectId: TEST_PROJECT_UUID,
        enabled: true,
        strategy: "periodic",
        conflictResolution: "serverWins",
        periodicInterval: 60,
        retryAttempts: 5,
        retryDelay: 2000,
        queuePersistence: true,
      },
      mockContext
    ) as { success: boolean; message: string };

    expect(result).toHaveProperty("success", true);
    expect(result.message).toContain("periodic");

    const config = mockContext.getStateConfig(TEST_PROJECT_UUID);
    expect(config?.offlineSync.strategy).toBe("periodic");
    expect(config?.offlineSync.conflictResolution).toBe("serverWins");
    expect(config?.offlineSync.periodicInterval).toBe(60);
    expect(config?.offlineSync.retryAttempts).toBe(5);
  });

  test("should throw error for non-existent project", async () => {
    const mockContext = getMockContext();
    await expect(
      handleStateTool(
        "state_create_provider",
        {
          projectId: NON_EXISTENT_UUID,
          name: "test",
          stateType: "String",
        },
        mockContext
      )
    ).rejects.toThrow(/not found/);
  });

  test("should update existing provider", async () => {
    const mockContext = getMockContext();

    // Create first provider
    await handleStateTool(
      "state_create_provider",
      {
        projectId: TEST_PROJECT_UUID,
        name: "settings",
        type: "stateProvider",
        stateType: "String",
      },
      mockContext
    );

    // Update the same provider
    await handleStateTool(
      "state_create_provider",
      {
        projectId: TEST_PROJECT_UUID,
        name: "settings",
        type: "futureProvider",
        stateType: "List<String>",
      },
      mockContext
    );

    const config = mockContext.getStateConfig(TEST_PROJECT_UUID);
    expect(config?.providers.length).toBe(1);
    expect(config?.providers[0].type).toBe("futureProvider");
    expect(config?.providers[0].stateType).toBe("List<String>");
  });
});

// ============================================================================
// HOOKS TESTS
// ============================================================================

describe("State Hooks", () => {
  test("should have all required hooks", () => {
    expect(stateHooks.onInstall).toBeDefined();
    expect(stateHooks.beforeGenerate).toBeDefined();
    expect(stateHooks.onGenerate).toBeDefined();
    expect(stateHooks.afterGenerate).toBeDefined();
    expect(stateHooks.beforeBuild).toBeDefined();
    expect(stateHooks.afterBuild).toBeDefined();
  });
});

// ============================================================================
// TEMPLATES TESTS
// ============================================================================

describe("State Templates", () => {
  test("should have all required templates", () => {
    expect(STATE_TEMPLATES.length).toBe(8);

    const templateIds = STATE_TEMPLATES.map((t) => t.id);
    expect(templateIds).toContain("state-riverpod-provider");
    expect(templateIds).toContain("state-riverpod-offline");
    expect(templateIds).toContain("state-bloc-event");
    expect(templateIds).toContain("state-bloc-state");
    expect(templateIds).toContain("state-bloc-main");
    expect(templateIds).toContain("state-bloc-offline");
    expect(templateIds).toContain("state-feature-repository");
    expect(templateIds).toContain("state-feature-model");
  });

  test("templates should have correct structure", () => {
    for (const template of STATE_TEMPLATES) {
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("description");
      expect(template).toHaveProperty("type");
      expect(template).toHaveProperty("source");
      expect(template).toHaveProperty("output");
      expect(template.type).toBe("file");
      expect(template.output).toHaveProperty("path");
      expect(template.output).toHaveProperty("filename");
      expect(template.output).toHaveProperty("extension");
    }
  });

  test("riverpod provider template should have valid source", () => {
    const template = STATE_TEMPLATES.find((t) => t.id === "state-riverpod-provider");
    expect(template).toBeDefined();
    expect(template?.source).toContain("flutter_riverpod");
    expect(template?.source).toContain("Provider");
  });

  test("bloc main template should have valid source", () => {
    const template = STATE_TEMPLATES.find((t) => t.id === "state-bloc-main");
    expect(template).toBeDefined();
    expect(template?.source).toContain("flutter_bloc");
    expect(template?.source).toContain("Bloc");
    expect(template?.source).toContain("Cubit");
  });

  test("feature repository template should have valid source", () => {
    const template = STATE_TEMPLATES.find((t) => t.id === "state-feature-repository");
    expect(template).toBeDefined();
    expect(template?.source).toContain("Repository");
    expect(template?.source).toContain("create");
    expect(template?.source).toContain("read");
    expect(template?.source).toContain("update");
    expect(template?.source).toContain("delete");
  });

  test("feature model template should have valid source", () => {
    const template = STATE_TEMPLATES.find((t) => t.id === "state-feature-model");
    expect(template).toBeDefined();
    expect(template?.source).toContain("copyWith");
    expect(template?.source).toContain("fromJson");
    expect(template?.source).toContain("toJson");
  });
});

// ============================================================================
// DEPENDENCY CONSTANTS TESTS
// ============================================================================

describe("Dependency Constants", () => {
  test("RIVERPOD_DEPENDENCIES should have correct packages", () => {
    expect(RIVERPOD_DEPENDENCIES.dependencies).toHaveProperty("flutter_riverpod");
    expect(RIVERPOD_DEPENDENCIES.dependencies).toHaveProperty("riverpod_annotation");
    expect(RIVERPOD_DEPENDENCIES.dependencies).toHaveProperty("connectivity_plus");
    expect(RIVERPOD_DEPENDENCIES.devDependencies).toHaveProperty("riverpod_generator");
    expect(RIVERPOD_DEPENDENCIES.devDependencies).toHaveProperty("build_runner");
    expect(RIVERPOD_DEPENDENCIES.devDependencies).toHaveProperty("riverpod_lint");
  });

  test("BLOC_DEPENDENCIES should have correct packages", () => {
    expect(BLOC_DEPENDENCIES.dependencies).toHaveProperty("flutter_bloc");
    expect(BLOC_DEPENDENCIES.dependencies).toHaveProperty("bloc");
    expect(BLOC_DEPENDENCIES.dependencies).toHaveProperty("equatable");
    expect(BLOC_DEPENDENCIES.dependencies).toHaveProperty("connectivity_plus");
    expect(BLOC_DEPENDENCIES.devDependencies).toHaveProperty("bloc_test");
  });

  test("PROVIDER_DEPENDENCIES should have correct packages", () => {
    expect(PROVIDER_DEPENDENCIES.dependencies).toHaveProperty("provider");
    expect(PROVIDER_DEPENDENCIES.dependencies).toHaveProperty("connectivity_plus");
  });
});
