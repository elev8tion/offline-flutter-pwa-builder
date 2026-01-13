/**
 * State Module MCP Tools
 *
 * Defines MCP tools for state management configuration.
 * Supports Riverpod providers and BLoC patterns.
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  StateModuleConfig,
  ProviderConfig,
  BlocConfig,
  ProviderTypeSchema,
  BlocEventConfigSchema,
  BlocStateConfigSchema,
  DEFAULT_STATE_CONFIG,
  toPascalCase,
  toSnakeCase,
  generateProviderName,
  generateBlocNames,
  getStateDependencies,
} from "./config.js";

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface StateToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => void;
  getStateConfig: (projectId: string) => StateModuleConfig | undefined;
  updateStateConfig: (projectId: string, config: Partial<StateModuleConfig>) => void;
}

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

const CreateProviderSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-z][a-zA-Z0-9]*$/),
  type: ProviderTypeSchema.default("stateProvider"),
  stateType: z.string().min(1),
  asyncState: z.boolean().default(false),
  autoDispose: z.boolean().default(true),
  family: z.boolean().default(false),
  familyParamType: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  initialValue: z.string().optional(),
  description: z.string().optional(),
});

const CreateBlocSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/),
  events: z.array(z.union([
    z.string(), // Simple event name
    BlocEventConfigSchema, // Full event config
  ])).min(1),
  states: z.array(z.union([
    z.string(), // Simple state name
    BlocStateConfigSchema, // Full state config
  ])).min(1),
  useCubit: z.boolean().default(false),
  useEquatable: z.boolean().default(true),
  useFreezed: z.boolean().default(false),
  description: z.string().optional(),
});

const GenerateFeatureSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/),
  description: z.string().optional(),
  stateType: z.enum(["riverpod", "bloc", "provider"]).default("riverpod"),
  hasUI: z.boolean().default(true),
  hasRepository: z.boolean().default(true),
  hasModel: z.boolean().default(true),
  offlineEnabled: z.boolean().default(true),
  operations: z.array(z.enum(["create", "read", "update", "delete", "list"]))
    .default(["create", "read", "update", "delete", "list"]),
});

const ConfigureOfflineSyncSchema = z.object({
  projectId: z.string().uuid(),
  enabled: z.boolean().default(true),
  strategy: z.enum(["manual", "auto", "periodic"]).default("auto"),
  conflictResolution: z.enum(["lastWrite", "serverWins", "clientWins", "merge"]).default("lastWrite"),
  periodicInterval: z.number().min(10).max(3600).optional(),
  retryAttempts: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(100).max(60000).default(1000),
  queuePersistence: z.boolean().default(true),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const STATE_TOOLS: Tool[] = [
  {
    name: "state_create_provider",
    description: "Create a Riverpod provider for state management",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "Provider name (camelCase, e.g., 'userSettings')",
        },
        type: {
          type: "string",
          enum: [
            "provider",
            "stateProvider",
            "stateNotifierProvider",
            "futureProvider",
            "streamProvider",
            "changeNotifierProvider",
            "notifierProvider",
            "asyncNotifierProvider",
          ],
          description: "Type of Riverpod provider",
        },
        stateType: {
          type: "string",
          description: "Dart type of the state (e.g., 'String', 'List<User>')",
        },
        asyncState: {
          type: "boolean",
          description: "Whether the state is async (FutureProvider/StreamProvider)",
        },
        autoDispose: {
          type: "boolean",
          description: "Auto-dispose when no longer used",
        },
        family: {
          type: "boolean",
          description: "Create a family provider (parameterized)",
        },
        familyParamType: {
          type: "string",
          description: "Parameter type for family providers",
        },
        dependencies: {
          type: "array",
          items: { type: "string" },
          description: "Import paths for dependencies",
        },
        initialValue: {
          type: "string",
          description: "Initial value expression",
        },
        description: {
          type: "string",
          description: "Provider description",
        },
      },
      required: ["projectId", "name", "stateType"],
    },
  },
  {
    name: "state_create_bloc",
    description: "Create a BLoC (Business Logic Component) with events and states",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "BLoC name (PascalCase, e.g., 'UserAuth')",
        },
        events: {
          type: "array",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  properties: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        required: { type: "boolean" },
                      },
                    },
                  },
                  description: { type: "string" },
                },
              },
            ],
          },
          description: "BLoC events (strings or full config objects)",
        },
        states: {
          type: "array",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  name: { type: "string" },
                  properties: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string" },
                        required: { type: "boolean" },
                      },
                    },
                  },
                  isInitial: { type: "boolean" },
                  description: { type: "string" },
                },
              },
            ],
          },
          description: "BLoC states (strings or full config objects)",
        },
        useCubit: {
          type: "boolean",
          description: "Use Cubit instead of BLoC (simpler, no events)",
        },
        useEquatable: {
          type: "boolean",
          description: "Use Equatable for state/event comparison",
        },
        useFreezed: {
          type: "boolean",
          description: "Use Freezed for immutable classes",
        },
        description: {
          type: "string",
          description: "BLoC description",
        },
      },
      required: ["projectId", "name", "events", "states"],
    },
  },
  {
    name: "state_generate_feature",
    description: "Generate a complete feature with state, repository, and model",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        name: {
          type: "string",
          description: "Feature name (snake_case, e.g., 'user_profile')",
        },
        description: {
          type: "string",
          description: "Feature description",
        },
        stateType: {
          type: "string",
          enum: ["riverpod", "bloc", "provider"],
          description: "State management approach",
        },
        hasUI: {
          type: "boolean",
          description: "Generate UI widget",
        },
        hasRepository: {
          type: "boolean",
          description: "Generate repository pattern",
        },
        hasModel: {
          type: "boolean",
          description: "Generate model class",
        },
        offlineEnabled: {
          type: "boolean",
          description: "Enable offline sync for this feature",
        },
        operations: {
          type: "array",
          items: {
            type: "string",
            enum: ["create", "read", "update", "delete", "list"],
          },
          description: "CRUD operations to generate",
        },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "state_configure_offline_sync",
    description: "Configure offline sync settings for state management",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        enabled: {
          type: "boolean",
          description: "Enable offline sync",
        },
        strategy: {
          type: "string",
          enum: ["manual", "auto", "periodic"],
          description: "Sync strategy",
        },
        conflictResolution: {
          type: "string",
          enum: ["lastWrite", "serverWins", "clientWins", "merge"],
          description: "Conflict resolution strategy",
        },
        periodicInterval: {
          type: "number",
          description: "Sync interval in seconds (for periodic strategy)",
        },
        retryAttempts: {
          type: "number",
          description: "Number of retry attempts",
        },
        retryDelay: {
          type: "number",
          description: "Delay between retries in milliseconds",
        },
        queuePersistence: {
          type: "boolean",
          description: "Persist sync queue to storage",
        },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleStateTool(
  name: string,
  args: Record<string, unknown>,
  context: StateToolContext
): Promise<unknown> {
  switch (name) {
    case "state_create_provider": {
      const parsed = CreateProviderSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create state config
      let stateConfig = context.getStateConfig(parsed.projectId);
      if (!stateConfig) {
        stateConfig = { ...DEFAULT_STATE_CONFIG };
      }

      // Check if provider already exists
      const existingIndex = stateConfig.providers.findIndex(
        (p) => p.name === parsed.name
      );

      const providerConfig: ProviderConfig = {
        name: parsed.name,
        type: parsed.type,
        stateType: parsed.stateType,
        asyncState: parsed.asyncState,
        autoDispose: parsed.autoDispose,
        family: parsed.family,
        familyParamType: parsed.familyParamType,
        dependencies: parsed.dependencies,
        initialValue: parsed.initialValue,
        description: parsed.description,
      };

      if (existingIndex >= 0) {
        stateConfig.providers[existingIndex] = providerConfig;
      } else {
        stateConfig.providers.push(providerConfig);
      }

      context.updateStateConfig(parsed.projectId, stateConfig);

      const providerName = generateProviderName(parsed.name, parsed.type);
      const snakeName = toSnakeCase(parsed.name);

      return {
        success: true,
        message: `Created provider: ${providerName}`,
        provider: {
          name: parsed.name,
          providerName,
          type: parsed.type,
          stateType: parsed.stateType,
          outputPath: `lib/providers/${snakeName}_provider.dart`,
        },
        dependencies: getStateDependencies("riverpod"),
      };
    }

    case "state_create_bloc": {
      const parsed = CreateBlocSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create state config
      let stateConfig = context.getStateConfig(parsed.projectId);
      if (!stateConfig) {
        stateConfig = { ...DEFAULT_STATE_CONFIG, type: "bloc" };
      }

      // Normalize events (convert strings to objects)
      const normalizedEvents = parsed.events.map((e) => {
        if (typeof e === "string") {
          return { name: e };
        }
        return e;
      });

      // Normalize states (convert strings to objects)
      const normalizedStates = parsed.states.map((s, index) => {
        if (typeof s === "string") {
          return { name: s, isInitial: index === 0 };
        }
        return { ...s, isInitial: s.isInitial ?? index === 0 };
      });

      // Check if BLoC already exists
      const existingIndex = stateConfig.blocs.findIndex(
        (b) => b.name === parsed.name
      );

      const blocConfig: BlocConfig = {
        name: parsed.name,
        events: normalizedEvents,
        states: normalizedStates,
        useCubit: parsed.useCubit,
        useEquatable: parsed.useEquatable,
        useFreezesd: parsed.useFreezed,
        description: parsed.description,
      };

      if (existingIndex >= 0) {
        stateConfig.blocs[existingIndex] = blocConfig;
      } else {
        stateConfig.blocs.push(blocConfig);
      }

      context.updateStateConfig(parsed.projectId, stateConfig);

      const names = generateBlocNames(parsed.name, parsed.useCubit);

      return {
        success: true,
        message: `Created ${parsed.useCubit ? "Cubit" : "BLoC"}: ${names.bloc}`,
        bloc: {
          name: parsed.name,
          className: names.bloc,
          eventClass: names.event,
          stateClass: names.state,
          events: normalizedEvents.map((e) => e.name),
          states: normalizedStates.map((s) => s.name),
          outputPath: `lib/blocs/${names.fileName}.dart`,
        },
        dependencies: getStateDependencies("bloc"),
      };
    }

    case "state_generate_feature": {
      const parsed = GenerateFeatureSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      const className = toPascalCase(parsed.name);
      const snakeName = toSnakeCase(parsed.name);

      const generatedFiles: string[] = [];

      // Generate model
      if (parsed.hasModel) {
        generatedFiles.push(`lib/features/${snakeName}/domain/${snakeName}.dart`);
      }

      // Generate repository
      if (parsed.hasRepository) {
        generatedFiles.push(`lib/features/${snakeName}/data/${snakeName}_repository.dart`);
      }

      // Generate state
      if (parsed.stateType === "riverpod") {
        generatedFiles.push(`lib/features/${snakeName}/presentation/${snakeName}_provider.dart`);
      } else if (parsed.stateType === "bloc") {
        generatedFiles.push(`lib/features/${snakeName}/presentation/${snakeName}_bloc.dart`);
        generatedFiles.push(`lib/features/${snakeName}/presentation/${snakeName}_event.dart`);
        generatedFiles.push(`lib/features/${snakeName}/presentation/${snakeName}_state.dart`);
      }

      // Generate UI
      if (parsed.hasUI) {
        generatedFiles.push(`lib/features/${snakeName}/presentation/${snakeName}_page.dart`);
      }

      // Generate offline sync if enabled
      if (parsed.offlineEnabled) {
        generatedFiles.push(`lib/features/${snakeName}/data/${snakeName}_sync.dart`);
      }

      return {
        success: true,
        message: `Generated feature: ${className}`,
        feature: {
          name: parsed.name,
          className,
          snakeName,
          stateType: parsed.stateType,
          operations: parsed.operations,
          offlineEnabled: parsed.offlineEnabled,
        },
        files: generatedFiles,
        dependencies: getStateDependencies(parsed.stateType),
      };
    }

    case "state_configure_offline_sync": {
      const parsed = ConfigureOfflineSyncSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Get or create state config
      let stateConfig = context.getStateConfig(parsed.projectId);
      if (!stateConfig) {
        stateConfig = { ...DEFAULT_STATE_CONFIG };
      }

      stateConfig.offlineSync = {
        enabled: parsed.enabled,
        strategy: parsed.strategy,
        conflictResolution: parsed.conflictResolution,
        periodicInterval: parsed.periodicInterval,
        retryAttempts: parsed.retryAttempts,
        retryDelay: parsed.retryDelay,
        queuePersistence: parsed.queuePersistence,
      };

      context.updateStateConfig(parsed.projectId, stateConfig);

      // Also update project's offline config
      context.updateProject(parsed.projectId, {
        offline: {
          ...project.offline,
          sync: {
            enabled: parsed.enabled,
            strategy: parsed.strategy,
          },
        },
      });

      return {
        success: true,
        message: `Configured offline sync: ${parsed.strategy} strategy`,
        config: stateConfig.offlineSync,
      };
    }

    default:
      throw new Error(`Unknown state tool: ${name}`);
  }
}

export default STATE_TOOLS;
