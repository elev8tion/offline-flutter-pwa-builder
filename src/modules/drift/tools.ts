/**
 * Drift Module Tools
 *
 * MCP tool definitions and handlers for Drift operations
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  DriftConfig,
  DriftTableDefinition,
  DriftColumn,
  DriftRelation,
  DriftColumnSchema,
  toPascalCase,
  toSnakeCase,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const AddTableInputSchema = z.object({
  projectId: z.string().describe("Project ID to add table to"),
  name: z.string().regex(/^[a-z][a-z_0-9]*$/, "Table name must be snake_case"),
  columns: z.array(DriftColumnSchema).min(1, "At least one column is required"),
  timestamps: z.boolean().optional().describe("Auto-add createdAt/updatedAt columns"),
  softDelete: z.boolean().optional().describe("Auto-add deletedAt column for soft deletes"),
});

export const AddRelationInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  name: z.string().describe("Relation name"),
  type: z.enum(["oneToOne", "oneToMany", "manyToMany"]),
  fromTable: z.string().describe("Source table name"),
  fromColumn: z.string().describe("Source column name"),
  toTable: z.string().describe("Target table name"),
  toColumn: z.string().describe("Target column name"),
  throughTable: z.string().optional().describe("Junction table for many-to-many"),
});

export const GenerateDaoInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  tableName: z.string().describe("Table to generate DAO for"),
  customMethods: z.array(z.object({
    name: z.string(),
    description: z.string(),
    returnType: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })),
    query: z.string(),
  })).optional().describe("Custom query methods to add"),
});

export const CreateMigrationInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  name: z.string().describe("Migration name (e.g., 'add_users_table')"),
  upStatements: z.array(z.string()).describe("SQL statements for upgrade"),
  downStatements: z.array(z.string()).describe("SQL statements for rollback"),
});

export const EnableEncryptionInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  strategy: z.enum(["derived", "stored", "user-provided"]).describe("Key management strategy"),
});

export const RunCodegenInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  watch: z.boolean().optional().describe("Watch mode for continuous generation"),
});

// ============================================================================
// TIER 1: CRITICAL OFFLINE FEATURES - ZOD SCHEMAS
// ============================================================================

export const ConfigureConflictResolutionInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  strategy: z.enum(["serverWins", "clientWins", "lastWriteWins", "merge", "manual"])
    .describe("Default conflict resolution strategy"),
  tableStrategies: z.record(z.enum(["serverWins", "clientWins", "lastWriteWins", "merge", "manual"]))
    .optional().describe("Per-table strategy overrides"),
  fieldStrategies: z.record(z.enum(["serverWins", "clientWins"]))
    .optional().describe("Per-field strategy overrides (format: 'table.field')"),
});

export const ConfigureBackgroundSyncInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  intervalSeconds: z.number().min(10).max(3600).default(60)
    .describe("Sync interval in seconds"),
  maxRetries: z.number().min(1).max(10).default(3)
    .describe("Maximum retry attempts per operation"),
  batchSize: z.number().min(1).max(500).default(50)
    .describe("Number of items to sync per batch"),
  syncOnConnect: z.boolean().default(true)
    .describe("Trigger sync when connection is restored"),
  priorityTables: z.array(z.string()).optional()
    .describe("Tables to sync first"),
});

export const ConfigureOfflineIndicatorInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  showBanner: z.boolean().default(true)
    .describe("Show offline banner"),
  showSyncProgress: z.boolean().default(true)
    .describe("Show sync progress in banner"),
  bannerPosition: z.enum(["top", "bottom"]).default("top")
    .describe("Position of the offline banner"),
  customMessages: z.object({
    offline: z.string().optional(),
    syncing: z.string().optional(),
    pending: z.string().optional(),
  }).optional().describe("Custom banner messages"),
});

export const ConfigureOptimisticUpdatesInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  enabled: z.boolean().default(true)
    .describe("Enable optimistic updates"),
  confirmTimeoutSeconds: z.number().min(5).max(120).default(30)
    .describe("Timeout for confirming updates"),
  autoRollbackOnError: z.boolean().default(true)
    .describe("Automatically rollback on server error"),
  tables: z.array(z.string()).optional()
    .describe("Tables to enable optimistic updates for"),
});

export const ConfigureRetryPolicyInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  strategy: z.enum(["fixed", "exponentialBackoff", "linearBackoff", "fibonacciBackoff"])
    .default("exponentialBackoff").describe("Retry strategy"),
  maxRetries: z.number().min(1).max(20).default(5)
    .describe("Maximum number of retry attempts"),
  initialDelaySeconds: z.number().min(0.1).max(60).default(1)
    .describe("Initial delay between retries in seconds"),
  maxDelaySeconds: z.number().min(1).max(600).default(60)
    .describe("Maximum delay between retries in seconds"),
  addJitter: z.boolean().default(true)
    .describe("Add randomness to retry delays"),
});

// ============================================================================
// TIER 2: PERFORMANCE & SCALABILITY - ZOD SCHEMAS
// ============================================================================

export const ConfigurePaginationInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  mode: z.enum(["offset", "cursor", "keyset"]).default("offset")
    .describe("Pagination mode"),
  defaultPageSize: z.number().min(5).max(200).default(20)
    .describe("Default number of items per page"),
  maxPageSize: z.number().min(10).max(500).default(100)
    .describe("Maximum allowed page size"),
});

export const ConfigureLazyLoadingInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  enabled: z.boolean().default(true)
    .describe("Enable lazy loading"),
  pageSize: z.number().min(5).max(100).default(20)
    .describe("Number of items to load per request"),
  cacheForMinutes: z.number().min(1).max(60).optional()
    .describe("How long to cache lazy-loaded items"),
  preloadDistance: z.number().min(1).max(10).default(3)
    .describe("Number of pages to preload ahead"),
});

export const ConfigureQueryCacheInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  enabled: z.boolean().default(true)
    .describe("Enable query caching"),
  maxSize: z.number().min(10).max(10000).default(1000)
    .describe("Maximum number of cached queries"),
  defaultTtlMinutes: z.number().min(1).max(1440).default(5)
    .describe("Default cache TTL in minutes"),
  evictionPolicy: z.enum(["lru", "lfu", "fifo", "ttlOnly"]).default("lru")
    .describe("Cache eviction policy"),
});

export const ConfigureBatchOperationsInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  batchSize: z.number().min(10).max(1000).default(100)
    .describe("Number of items per batch"),
  useTransaction: z.boolean().default(true)
    .describe("Wrap batches in transactions"),
  stopOnError: z.boolean().default(false)
    .describe("Stop processing on first error"),
  delayBetweenBatchesMs: z.number().min(0).max(5000).default(0)
    .describe("Delay between batches in milliseconds"),
});

export const ConfigureDataCompressionInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  enabled: z.boolean().default(true)
    .describe("Enable data compression"),
  algorithm: z.enum(["gzip", "zlib"]).default("gzip")
    .describe("Compression algorithm"),
  level: z.enum(["none", "fast", "low", "medium", "high"]).default("medium")
    .describe("Compression level"),
  minSizeBytes: z.number().min(0).max(100000).default(1024)
    .describe("Minimum data size to compress (bytes)"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const DRIFT_TOOLS: Tool[] = [
  {
    name: "drift_add_table",
    description: "Add a new table to the Drift database schema. Tables are defined with columns, optional timestamps, and soft delete support.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID to add table to" },
        name: { type: "string", description: "Table name in snake_case" },
        columns: {
          type: "array",
          description: "Column definitions",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Column name in camelCase" },
              type: { type: "string", enum: ["integer", "text", "real", "blob", "boolean", "dateTime"] },
              nullable: { type: "boolean" },
              primaryKey: { type: "boolean" },
              autoIncrement: { type: "boolean" },
              unique: { type: "boolean" },
              defaultValue: { type: ["string", "number", "boolean", "null"] },
              references: {
                type: "object",
                properties: {
                  table: { type: "string" },
                  column: { type: "string" },
                  onDelete: { type: "string", enum: ["cascade", "setNull", "restrict", "noAction"] },
                  onUpdate: { type: "string", enum: ["cascade", "setNull", "restrict", "noAction"] },
                },
                required: ["table", "column"],
              },
            },
            required: ["name", "type"],
          },
        },
        timestamps: { type: "boolean", description: "Auto-add createdAt/updatedAt" },
        softDelete: { type: "boolean", description: "Auto-add deletedAt for soft deletes" },
      },
      required: ["projectId", "name", "columns"],
    },
  },
  {
    name: "drift_add_relation",
    description: "Add a relationship between two tables. Supports one-to-one, one-to-many, and many-to-many relations.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", description: "Relation name" },
        type: { type: "string", enum: ["oneToOne", "oneToMany", "manyToMany"] },
        fromTable: { type: "string" },
        fromColumn: { type: "string" },
        toTable: { type: "string" },
        toColumn: { type: "string" },
        throughTable: { type: "string", description: "Junction table for many-to-many" },
      },
      required: ["projectId", "name", "type", "fromTable", "fromColumn", "toTable", "toColumn"],
    },
  },
  {
    name: "drift_generate_dao",
    description: "Generate a Data Access Object (DAO) for a table with standard CRUD operations and optional custom methods.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        tableName: { type: "string" },
        customMethods: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              returnType: { type: "string" },
              parameters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                  },
                  required: ["name", "type"],
                },
              },
              query: { type: "string" },
            },
            required: ["name", "returnType", "query"],
          },
        },
      },
      required: ["projectId", "tableName"],
    },
  },
  {
    name: "drift_create_migration",
    description: "Create a database migration for schema changes. Migrations support both upgrade and rollback.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        name: { type: "string", description: "Migration name (e.g., add_users_table)" },
        upStatements: {
          type: "array",
          items: { type: "string" },
          description: "SQL statements for upgrade",
        },
        downStatements: {
          type: "array",
          items: { type: "string" },
          description: "SQL statements for rollback",
        },
      },
      required: ["projectId", "name", "upStatements", "downStatements"],
    },
  },
  {
    name: "drift_enable_encryption",
    description: "Enable SQLCipher encryption for the database with a specified key management strategy.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        strategy: {
          type: "string",
          enum: ["derived", "stored", "user-provided"],
          description: "Key management strategy: derived (from password), stored (in keychain), user-provided (manual)",
        },
      },
      required: ["projectId", "strategy"],
    },
  },
  {
    name: "drift_run_codegen",
    description: "Run Drift code generation (build_runner) to generate .g.dart files.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        watch: { type: "boolean", description: "Enable watch mode" },
      },
      required: ["projectId"],
    },
  },

  // ===== TIER 1: CRITICAL OFFLINE FEATURES =====
  {
    name: "drift_configure_conflict_resolution",
    description: "Configure conflict resolution strategy for syncing offline changes with server data.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        strategy: {
          type: "string",
          enum: ["serverWins", "clientWins", "lastWriteWins", "merge", "manual"],
          description: "Default conflict resolution strategy",
        },
        tableStrategies: {
          type: "object",
          additionalProperties: {
            type: "string",
            enum: ["serverWins", "clientWins", "lastWriteWins", "merge", "manual"],
          },
          description: "Per-table strategy overrides",
        },
        fieldStrategies: {
          type: "object",
          additionalProperties: {
            type: "string",
            enum: ["serverWins", "clientWins"],
          },
          description: "Per-field strategy overrides (format: 'table.field')",
        },
      },
      required: ["projectId", "strategy"],
    },
  },
  {
    name: "drift_configure_background_sync",
    description: "Configure background synchronization service for offline data.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        intervalSeconds: {
          type: "number",
          description: "Sync interval in seconds (10-3600)",
          default: 60,
        },
        maxRetries: {
          type: "number",
          description: "Maximum retry attempts (1-10)",
          default: 3,
        },
        batchSize: {
          type: "number",
          description: "Items per sync batch (1-500)",
          default: 50,
        },
        syncOnConnect: {
          type: "boolean",
          description: "Sync when connection is restored",
          default: true,
        },
        priorityTables: {
          type: "array",
          items: { type: "string" },
          description: "Tables to sync first",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_offline_indicator",
    description: "Configure UI components for offline status indication.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        showBanner: { type: "boolean", description: "Show offline banner", default: true },
        showSyncProgress: { type: "boolean", description: "Show sync progress", default: true },
        bannerPosition: {
          type: "string",
          enum: ["top", "bottom"],
          description: "Banner position",
          default: "top",
        },
        customMessages: {
          type: "object",
          properties: {
            offline: { type: "string" },
            syncing: { type: "string" },
            pending: { type: "string" },
          },
          description: "Custom banner messages",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_optimistic_updates",
    description: "Configure optimistic UI updates with rollback support.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        enabled: { type: "boolean", description: "Enable optimistic updates", default: true },
        confirmTimeoutSeconds: {
          type: "number",
          description: "Timeout for confirming updates (5-120)",
          default: 30,
        },
        autoRollbackOnError: {
          type: "boolean",
          description: "Auto rollback on server error",
          default: true,
        },
        tables: {
          type: "array",
          items: { type: "string" },
          description: "Tables to enable optimistic updates for",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_retry_policy",
    description: "Configure retry policies for failed sync operations.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        strategy: {
          type: "string",
          enum: ["fixed", "exponentialBackoff", "linearBackoff", "fibonacciBackoff"],
          description: "Retry strategy",
          default: "exponentialBackoff",
        },
        maxRetries: { type: "number", description: "Max retry attempts (1-20)", default: 5 },
        initialDelaySeconds: { type: "number", description: "Initial delay (0.1-60)", default: 1 },
        maxDelaySeconds: { type: "number", description: "Max delay (1-600)", default: 60 },
        addJitter: { type: "boolean", description: "Add randomness to delays", default: true },
      },
      required: ["projectId"],
    },
  },

  // ===== TIER 2: PERFORMANCE & SCALABILITY =====
  {
    name: "drift_configure_pagination",
    description: "Configure pagination for large datasets.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        mode: {
          type: "string",
          enum: ["offset", "cursor", "keyset"],
          description: "Pagination mode",
          default: "offset",
        },
        defaultPageSize: { type: "number", description: "Default page size (5-200)", default: 20 },
        maxPageSize: { type: "number", description: "Maximum page size (10-500)", default: 100 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_lazy_loading",
    description: "Configure lazy loading for related entities and large datasets.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        enabled: { type: "boolean", description: "Enable lazy loading", default: true },
        pageSize: { type: "number", description: "Items per load (5-100)", default: 20 },
        cacheForMinutes: { type: "number", description: "Cache duration (1-60)" },
        preloadDistance: { type: "number", description: "Pages to preload (1-10)", default: 3 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_query_cache",
    description: "Configure in-memory query result caching.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        enabled: { type: "boolean", description: "Enable query caching", default: true },
        maxSize: { type: "number", description: "Max cached queries (10-10000)", default: 1000 },
        defaultTtlMinutes: { type: "number", description: "Default TTL (1-1440)", default: 5 },
        evictionPolicy: {
          type: "string",
          enum: ["lru", "lfu", "fifo", "ttlOnly"],
          description: "Eviction policy",
          default: "lru",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_batch_operations",
    description: "Configure batch insert, update, and delete operations.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        batchSize: { type: "number", description: "Items per batch (10-1000)", default: 100 },
        useTransaction: { type: "boolean", description: "Wrap in transactions", default: true },
        stopOnError: { type: "boolean", description: "Stop on first error", default: false },
        delayBetweenBatchesMs: { type: "number", description: "Delay between batches (0-5000)", default: 0 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_configure_data_compression",
    description: "Configure data compression for storage efficiency.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        enabled: { type: "boolean", description: "Enable compression", default: true },
        algorithm: {
          type: "string",
          enum: ["gzip", "zlib"],
          description: "Compression algorithm",
          default: "gzip",
        },
        level: {
          type: "string",
          enum: ["none", "fast", "low", "medium", "high"],
          description: "Compression level",
          default: "medium",
        },
        minSizeBytes: { type: "number", description: "Minimum size to compress (0-100000)", default: 1024 },
      },
      required: ["projectId"],
    },
  },
  {
    name: "drift_generate_seed_data",
    description: "Generate seed data for database testing and development.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        tables: {
          type: "array",
          items: { type: "string" },
          description: "Tables to generate seed data for (all if not specified)",
        },
        rowsPerTable: { type: "number", description: "Number of rows per table (default: 10)", default: 10 },
        outputFormat: {
          type: "string",
          enum: ["dart", "sql", "json"],
          description: "Output format for seed data",
          default: "dart",
        },
        useFaker: { type: "boolean", description: "Use realistic fake data", default: true },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export interface DriftToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => Promise<ProjectDefinition>;
  getDriftConfig: (projectId: string) => DriftConfig | undefined;
  updateDriftConfig: (projectId: string, config: Partial<DriftConfig>) => void;
}

export async function handleDriftTool(
  name: string,
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (name) {
    // Original tools
    case "drift_add_table":
      return handleAddTable(args, ctx);
    case "drift_add_relation":
      return handleAddRelation(args, ctx);
    case "drift_generate_dao":
      return handleGenerateDao(args, ctx);
    case "drift_create_migration":
      return handleCreateMigration(args, ctx);
    case "drift_enable_encryption":
      return handleEnableEncryption(args, ctx);
    case "drift_run_codegen":
      return handleRunCodegen(args, ctx);
    // Tier 1: Critical Offline Features
    case "drift_configure_conflict_resolution":
      return handleConfigureConflictResolution(args, ctx);
    case "drift_configure_background_sync":
      return handleConfigureBackgroundSync(args, ctx);
    case "drift_configure_offline_indicator":
      return handleConfigureOfflineIndicator(args, ctx);
    case "drift_configure_optimistic_updates":
      return handleConfigureOptimisticUpdates(args, ctx);
    case "drift_configure_retry_policy":
      return handleConfigureRetryPolicy(args, ctx);
    // Tier 2: Performance & Scalability
    case "drift_configure_pagination":
      return handleConfigurePagination(args, ctx);
    case "drift_configure_lazy_loading":
      return handleConfigureLazyLoading(args, ctx);
    case "drift_configure_query_cache":
      return handleConfigureQueryCache(args, ctx);
    case "drift_configure_batch_operations":
      return handleConfigureBatchOperations(args, ctx);
    case "drift_configure_data_compression":
      return handleConfigureDataCompression(args, ctx);
    case "drift_generate_seed_data":
      return handleGenerateSeedData(args, ctx);
    default:
      throw new Error(`Unknown drift tool: ${name}`);
  }
}

async function handleAddTable(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AddTableInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Check for duplicate table
  if (config.tables.some((t) => t.name === input.name)) {
    throw new Error(`Table already exists: ${input.name}`);
  }

  // Ensure at least one primary key
  const hasPrimaryKey = input.columns.some((c) => c.primaryKey);
  if (!hasPrimaryKey) {
    // Add auto-increment id column
    input.columns.unshift({
      name: "id",
      type: "integer",
      primaryKey: true,
      autoIncrement: true,
    });
  }

  const table: DriftTableDefinition = {
    name: input.name,
    columns: input.columns as DriftColumn[],
    timestamps: input.timestamps,
    softDelete: input.softDelete,
  };

  // Update config
  config.tables.push(table);
  ctx.updateDriftConfig(input.projectId, { tables: config.tables });

  return {
    content: [
      {
        type: "text",
        text: `✓ Added table: ${input.name}

Table: ${toPascalCase(input.name)}Table
Columns:
${input.columns.map((c) => `  - ${c.name}: ${c.type}${c.primaryKey ? " (PK)" : ""}${c.nullable ? " (nullable)" : ""}`).join("\n")}
${input.timestamps ? "  - createdAt: dateTime\n  - updatedAt: dateTime" : ""}
${input.softDelete ? "  - deletedAt: dateTime (nullable)" : ""}

Generated files:
  - lib/core/database/${toSnakeCase(input.name)}_table.dart
  - lib/core/database/${toSnakeCase(input.name)}_dao.dart

Run 'dart run build_runner build' to generate .g.dart files.`,
      },
    ],
  };
}

async function handleAddRelation(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AddRelationInputSchema.parse(args);

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Validate tables exist
  const fromTable = config.tables.find((t) => t.name === input.fromTable);
  const toTable = config.tables.find((t) => t.name === input.toTable);

  if (!fromTable) {
    throw new Error(`Source table not found: ${input.fromTable}`);
  }
  if (!toTable) {
    throw new Error(`Target table not found: ${input.toTable}`);
  }

  // Check for duplicate relation
  if (config.relations.some((r) => r.name === input.name)) {
    throw new Error(`Relation already exists: ${input.name}`);
  }

  const relation: DriftRelation = {
    name: input.name,
    type: input.type,
    from: { table: input.fromTable, column: input.fromColumn },
    to: { table: input.toTable, column: input.toColumn },
    throughTable: input.throughTable,
  };

  // For many-to-many, create junction table if not exists
  if (input.type === "manyToMany") {
    const junctionName = input.throughTable || `${input.fromTable}_${input.toTable}`;
    if (!config.tables.some((t) => t.name === junctionName)) {
      const junctionTable: DriftTableDefinition = {
        name: junctionName,
        columns: [
          { name: "id", type: "integer", primaryKey: true, autoIncrement: true },
          { name: `${input.fromTable}Id`, type: "integer", references: { table: input.fromTable, column: "id", onDelete: "cascade" } },
          { name: `${input.toTable}Id`, type: "integer", references: { table: input.toTable, column: "id", onDelete: "cascade" } },
        ],
        timestamps: true,
      };
      config.tables.push(junctionTable);
      relation.throughTable = junctionName;
    }
  }

  config.relations.push(relation);
  ctx.updateDriftConfig(input.projectId, {
    tables: config.tables,
    relations: config.relations,
  });

  return {
    content: [
      {
        type: "text",
        text: `✓ Added relation: ${input.name}

Type: ${input.type}
From: ${input.fromTable}.${input.fromColumn}
To: ${input.toTable}.${input.toColumn}
${input.type === "manyToMany" ? `Junction: ${relation.throughTable}` : ""}`,
      },
    ],
  };
}

async function handleGenerateDao(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateDaoInputSchema.parse(args);

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  const table = config.tables.find((t) => t.name === input.tableName);
  if (!table) {
    throw new Error(`Table not found: ${input.tableName}`);
  }

  return {
    content: [
      {
        type: "text",
        text: `✓ DAO generated for table: ${input.tableName}

Generated methods:
  - getAll() -> Future<List<${toPascalCase(input.tableName)}>>
  - watchAll() -> Stream<List<${toPascalCase(input.tableName)}>>
  - getById(id) -> Future<${toPascalCase(input.tableName)}?>
  - watchById(id) -> Stream<${toPascalCase(input.tableName)}?>
  - insertOne(entry) -> Future<int>
  - upsertOne(entry) -> Future<int>
  - updateOne(entry) -> Future<bool>
  - deleteById(id) -> Future<int>
  - deleteAll() -> Future<int>
  - count() -> Future<int>
${table.softDelete ? "  - hardDeleteById(id) -> Future<int>\n  - restoreById(id) -> Future<int>" : ""}
${input.customMethods?.length ? `\nCustom methods:\n${input.customMethods.map((m) => `  - ${m.name}`).join("\n")}` : ""}

File: lib/core/database/${toSnakeCase(input.tableName)}_dao.dart`,
      },
    ],
  };
}

async function handleCreateMigration(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = CreateMigrationInputSchema.parse(args);

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  const newVersion = config.schemaVersion + 1;

  // Update schema version
  ctx.updateDriftConfig(input.projectId, { schemaVersion: newVersion });

  return {
    content: [
      {
        type: "text",
        text: `✓ Created migration: ${input.name}

Schema version: ${config.schemaVersion} → ${newVersion}

Up statements:
${input.upStatements.map((s) => `  ${s}`).join("\n")}

Down statements:
${input.downStatements.map((s) => `  ${s}`).join("\n")}

File: lib/core/database/migrations/migration_${newVersion}.dart

Remember to update the migration strategy in your database class.`,
      },
    ],
  };
}

async function handleEnableEncryption(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = EnableEncryptionInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  ctx.updateDriftConfig(input.projectId, {
    encryption: true,
    encryptionKeyStrategy: input.strategy,
  });

  const strategyDescription = {
    derived: "Key derived from user password using PBKDF2",
    stored: "Key securely stored in platform keychain",
    "user-provided": "User provides encryption key directly",
  };

  return {
    content: [
      {
        type: "text",
        text: `✓ Encryption enabled

Strategy: ${input.strategy}
Description: ${strategyDescription[input.strategy]}

Generated files:
  - lib/core/database/key_manager.dart

Required dependencies (add to pubspec.yaml):
  flutter_secure_storage: ^9.0.0
  crypto: ^3.0.3
  sqlcipher_flutter_libs: ^0.6.0

Note: SQLCipher replaces sqlite3_flutter_libs for encrypted databases.`,
      },
    ],
  };
}

async function handleRunCodegen(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = RunCodegenInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const command = input.watch
    ? "dart run build_runner watch"
    : "dart run build_runner build --delete-conflicting-outputs";

  return {
    content: [
      {
        type: "text",
        text: `To generate Drift code, run:

${command}

This will generate:
  - *.g.dart files for all tables and DAOs
  - Type-safe query builders
  - Data classes with copyWith

Required dev dependencies:
  build_runner: ^2.4.0
  drift_dev: ^2.14.0`,
      },
    ],
  };
}

// ============================================================================
// TIER 1: CRITICAL OFFLINE FEATURES - HANDLERS
// ============================================================================

async function handleConfigureConflictResolution(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureConflictResolutionInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update conflict resolution config
  const conflictConfig = {
    strategy: input.strategy,
    tableStrategies: input.tableStrategies || {},
    fieldStrategies: input.fieldStrategies || {},
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    conflictResolution: conflictConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Conflict resolution configured for project: ${project.name}

Default Strategy: ${input.strategy}
${Object.keys(input.tableStrategies || {}).length > 0 ? `Table Overrides: ${JSON.stringify(input.tableStrategies, null, 2)}` : ""}
${Object.keys(input.fieldStrategies || {}).length > 0 ? `Field Overrides: ${JSON.stringify(input.fieldStrategies, null, 2)}` : ""}

Generated files:
  - lib/core/sync/conflict_resolver.dart

Strategies:
  - serverWins: Server data always takes precedence
  - clientWins: Local data always takes precedence
  - lastWriteWins: Most recent timestamp wins
  - merge: Intelligently merge non-conflicting fields
  - manual: Flag for user intervention`,
      },
    ],
  };
}

async function handleConfigureBackgroundSync(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureBackgroundSyncInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update sync config
  const syncConfig = {
    intervalSeconds: input.intervalSeconds ?? 60,
    maxRetries: input.maxRetries ?? 3,
    batchSize: input.batchSize ?? 50,
    syncOnConnect: input.syncOnConnect ?? true,
    priorityTables: input.priorityTables || [],
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    sync: syncConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Background sync configured for project: ${project.name}

Settings:
  - Sync Interval: ${syncConfig.intervalSeconds} seconds
  - Max Retries: ${syncConfig.maxRetries}
  - Batch Size: ${syncConfig.batchSize}
  - Sync on Connect: ${syncConfig.syncOnConnect}
  - Priority Tables: ${syncConfig.priorityTables.length > 0 ? syncConfig.priorityTables.join(", ") : "None"}

Generated files:
  - lib/core/sync/background_sync_service.dart

Required dependencies:
  - connectivity_plus: ^5.0.0`,
      },
    ],
  };
}

async function handleConfigureOfflineIndicator(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureOfflineIndicatorInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update offline indicator config
  const indicatorConfig = {
    showBanner: input.showBanner ?? true,
    showSyncProgress: input.showSyncProgress ?? true,
    bannerPosition: input.bannerPosition ?? "top",
    customMessages: input.customMessages || {},
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    offlineIndicator: indicatorConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Offline indicator configured for project: ${project.name}

Settings:
  - Show Banner: ${indicatorConfig.showBanner}
  - Show Sync Progress: ${indicatorConfig.showSyncProgress}
  - Banner Position: ${indicatorConfig.bannerPosition}
  - Custom Messages: ${Object.keys(indicatorConfig.customMessages).length > 0 ? "Yes" : "Default"}

Generated files:
  - lib/core/ui/offline_indicator.dart

Components:
  - OfflineBanner: Banner widget for offline status
  - ConnectionQualityIndicator: Connection quality icon
  - SyncStatusIndicator: Sync progress widget
  - ConnectivityMonitor: State management for connectivity

Required dependencies:
  - connectivity_plus: ^5.0.0`,
      },
    ],
  };
}

async function handleConfigureOptimisticUpdates(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureOptimisticUpdatesInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update optimistic updates config
  const optimisticConfig = {
    enabled: input.enabled ?? true,
    confirmTimeoutSeconds: input.confirmTimeoutSeconds ?? 30,
    autoRollbackOnError: input.autoRollbackOnError ?? true,
    tables: input.tables || [],
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    optimisticUpdates: optimisticConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Optimistic updates configured for project: ${project.name}

Settings:
  - Enabled: ${optimisticConfig.enabled}
  - Confirm Timeout: ${optimisticConfig.confirmTimeoutSeconds} seconds
  - Auto Rollback: ${optimisticConfig.autoRollbackOnError}
  - Tables: ${optimisticConfig.tables.length > 0 ? optimisticConfig.tables.join(", ") : "All"}

Generated files:
  - lib/core/sync/optimistic_update_manager.dart

Features:
  - Instant UI updates before server confirmation
  - Automatic rollback on failure
  - Pending update tracking
  - OptimisticMixin for repositories`,
      },
    ],
  };
}

async function handleConfigureRetryPolicy(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureRetryPolicyInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update retry policy config
  const retryConfig = {
    strategy: input.strategy ?? "exponentialBackoff",
    maxRetries: input.maxRetries ?? 5,
    initialDelaySeconds: input.initialDelaySeconds ?? 1,
    maxDelaySeconds: input.maxDelaySeconds ?? 60,
    addJitter: input.addJitter ?? true,
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    retry: retryConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Retry policy configured for project: ${project.name}

Settings:
  - Strategy: ${retryConfig.strategy}
  - Max Retries: ${retryConfig.maxRetries}
  - Initial Delay: ${retryConfig.initialDelaySeconds} seconds
  - Max Delay: ${retryConfig.maxDelaySeconds} seconds
  - Add Jitter: ${retryConfig.addJitter}

Generated files:
  - lib/core/sync/retry_policy.dart

Strategies:
  - fixed: Same delay between retries
  - exponentialBackoff: Delay doubles each retry
  - linearBackoff: Delay increases linearly
  - fibonacciBackoff: Delay follows Fibonacci sequence

Presets available:
  - RetryPresets.aggressive (10 retries, fast)
  - RetryPresets.conservative (3 retries, slower)
  - RetryPresets.quick (5 retries, 200ms delay)
  - RetryPresets.backgroundSync (5 retries, up to 5 min)`,
      },
    ],
  };
}

// ============================================================================
// TIER 2: PERFORMANCE & SCALABILITY - HANDLERS
// ============================================================================

async function handleConfigurePagination(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigurePaginationInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update pagination config
  const paginationConfig = {
    mode: input.mode ?? "offset",
    defaultPageSize: input.defaultPageSize ?? 20,
    maxPageSize: input.maxPageSize ?? 100,
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    pagination: paginationConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Pagination configured for project: ${project.name}

Settings:
  - Mode: ${paginationConfig.mode}
  - Default Page Size: ${paginationConfig.defaultPageSize}
  - Max Page Size: ${paginationConfig.maxPageSize}

Generated files:
  - lib/core/data/pagination.dart

Modes:
  - offset: Traditional OFFSET/LIMIT (simple, good for small datasets)
  - cursor: Cursor-based pagination (better for real-time data)
  - keyset: Keyset pagination (most efficient for large datasets)

Components:
  - Page<T>: Paginated result container
  - PageRequest: Pagination request parameters
  - PaginationManager: Core pagination logic
  - InfiniteScrollController: UI controller for infinite scroll`,
      },
    ],
  };
}

async function handleConfigureLazyLoading(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureLazyLoadingInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update lazy loading config
  const lazyConfig = {
    enabled: input.enabled ?? true,
    pageSize: input.pageSize ?? 20,
    cacheForMinutes: input.cacheForMinutes,
    preloadDistance: input.preloadDistance ?? 3,
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    lazyLoading: lazyConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Lazy loading configured for project: ${project.name}

Settings:
  - Enabled: ${lazyConfig.enabled}
  - Page Size: ${lazyConfig.pageSize}
  - Cache Duration: ${lazyConfig.cacheForMinutes ? lazyConfig.cacheForMinutes + " minutes" : "No caching"}
  - Preload Distance: ${lazyConfig.preloadDistance} pages

Generated files:
  - lib/core/data/lazy_loading.dart

Components:
  - Lazy<T>: Single lazy-loaded value
  - LazyList<T>: On-demand list loading
  - LazyRelation<T>: Lazy one-to-one relations
  - LazyCollection<T>: Lazy one-to-many relations
  - LazyLoadable mixin: Easy integration`,
      },
    ],
  };
}

async function handleConfigureQueryCache(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureQueryCacheInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update query cache config
  const cacheConfig = {
    enabled: input.enabled ?? true,
    maxSize: input.maxSize ?? 1000,
    defaultTtlMinutes: input.defaultTtlMinutes ?? 5,
    evictionPolicy: input.evictionPolicy ?? "lru",
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    queryCache: cacheConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Query cache configured for project: ${project.name}

Settings:
  - Enabled: ${cacheConfig.enabled}
  - Max Size: ${cacheConfig.maxSize} entries
  - Default TTL: ${cacheConfig.defaultTtlMinutes} minutes
  - Eviction Policy: ${cacheConfig.evictionPolicy}

Generated files:
  - lib/core/data/query_cache.dart

Eviction Policies:
  - lru: Least Recently Used (default)
  - lfu: Least Frequently Used
  - fifo: First In First Out
  - ttlOnly: Only expire by TTL

Features:
  - Automatic cache invalidation by table
  - Tag-based invalidation
  - Pattern-based invalidation
  - Cache statistics tracking
  - CachedQueries mixin for DAOs`,
      },
    ],
  };
}

async function handleConfigureBatchOperations(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureBatchOperationsInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update batch operations config
  const batchConfig = {
    batchSize: input.batchSize ?? 100,
    useTransaction: input.useTransaction ?? true,
    stopOnError: input.stopOnError ?? false,
    delayBetweenBatchesMs: input.delayBetweenBatchesMs ?? 0,
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    batch: batchConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Batch operations configured for project: ${project.name}

Settings:
  - Batch Size: ${batchConfig.batchSize} items
  - Use Transactions: ${batchConfig.useTransaction}
  - Stop on Error: ${batchConfig.stopOnError}
  - Delay Between Batches: ${batchConfig.delayBetweenBatchesMs}ms

Generated files:
  - lib/core/data/batch_operations.dart

Features:
  - insertAll: Batch insert with progress
  - updateAll: Batch update with progress
  - upsertAll: Batch upsert (insert or update)
  - deleteByIds: Batch delete by IDs
  - Progress callbacks for UI
  - Error tracking and reporting
  - Table extensions for easy use`,
      },
    ],
  };
}

async function handleConfigureDataCompression(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureDataCompressionInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getDriftConfig(input.projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Update compression config
  const compressionConfig = {
    enabled: input.enabled ?? true,
    algorithm: input.algorithm ?? "gzip",
    level: input.level ?? "medium",
    minSizeBytes: input.minSizeBytes ?? 1024,
  };

  ctx.updateDriftConfig(input.projectId, {
    ...config,
    compression: compressionConfig,
  } as Partial<DriftConfig>);

  return {
    content: [
      {
        type: "text",
        text: `Data compression configured for project: ${project.name}

Settings:
  - Enabled: ${compressionConfig.enabled}
  - Algorithm: ${compressionConfig.algorithm}
  - Level: ${compressionConfig.level}
  - Min Size: ${compressionConfig.minSizeBytes} bytes

Generated files:
  - lib/core/data/data_compression.dart

Features:
  - Automatic compression for large text/blob fields
  - Transparent compression/decompression
  - Compression statistics tracking
  - CompressedBlob wrapper for storage
  - CompressedStringConverter for Drift

Compression Levels:
  - none: No compression (level 0)
  - fast: Quick compression (level 1)
  - low: Light compression (level 3)
  - medium: Balanced (level 6)
  - high: Maximum compression (level 9)`,
      },
    ],
  };
}

async function handleGenerateSeedData(
  args: Record<string, unknown>,
  ctx: DriftToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { projectId, tables, rowsPerTable = 10, outputFormat = "dart", useFaker = true } = args as {
    projectId: string;
    tables?: string[];
    rowsPerTable?: number;
    outputFormat?: "dart" | "sql" | "json";
    useFaker?: boolean;
  };

  const project = ctx.getProject(projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const config = ctx.getDriftConfig(projectId);
  if (!config) {
    throw new Error("Drift module not installed on this project");
  }

  // Filter tables if specified
  const tablesToSeed = tables ? config.tables.filter((t) => tables.includes(t.name)) : config.tables;

  if (tablesToSeed.length === 0) {
    throw new Error("No tables found to generate seed data");
  }

  // Helper to generate fake data based on column type
  const generateFakeValue = (columnType: string, columnName: string): string => {
    const lowerName = columnName.toLowerCase();
    const lowerType = columnType.toLowerCase();

    if (useFaker) {
      // Name patterns
      if (lowerName.includes("name") && lowerName.includes("first")) return "faker.person.firstName()";
      if (lowerName.includes("name") && lowerName.includes("last")) return "faker.person.lastName()";
      if (lowerName.includes("name")) return "faker.person.fullName()";
      if (lowerName.includes("email")) return "faker.internet.email()";
      if (lowerName.includes("phone")) return "faker.phone.number()";
      if (lowerName.includes("address")) return "faker.location.streetAddress()";
      if (lowerName.includes("city")) return "faker.location.city()";
      if (lowerName.includes("country")) return "faker.location.country()";
      if (lowerName.includes("company")) return "faker.company.name()";
      if (lowerName.includes("title")) return "faker.person.jobTitle()";
      if (lowerName.includes("description")) return "faker.lorem.paragraph()";
      if (lowerName.includes("url")) return "faker.internet.url()";
      if (lowerName.includes("avatar") || lowerName.includes("image")) return "faker.image.avatar()";
    }

    // Type-based generation
    if (lowerType === "text") return useFaker ? "faker.lorem.sentence()" : "'Sample text'";
    if (lowerType === "integer") return "faker.number.int({ min: 1, max: 1000 })";
    if (lowerType === "real") return "faker.number.float({ min: 0, max: 100 })";
    if (lowerType === "boolean") return "faker.datatype.boolean()";
    if (lowerType === "datetime") return "DateTime.now()";

    return useFaker ? "faker.lorem.word()" : "'sample'";
  };

  let seedCode = "";

  if (outputFormat === "dart") {
    seedCode = `// Generated seed data for Drift database
import 'package:drift/drift.dart';
${useFaker ? "import 'package:faker/faker.dart';\n" : ""}
import 'database.dart';

${useFaker ? "final faker = Faker();\n" : ""}
Future<void> seedDatabase(AppDatabase db) async {
  print('Seeding database...');

${tablesToSeed
  .map((table) => {
    const className = table.name.charAt(0).toUpperCase() + table.name.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const columns = table.columns.filter((c) => !c.autoIncrement);

    return `  // Seed ${table.name} table
  final ${table.name}Items = List.generate(${rowsPerTable}, (i) {
    return ${className}Companion(
${columns
  .map(
    (col) =>
      `      ${col.name}: Value(${generateFakeValue(col.type, col.name)}),`
  )
  .join("\n")}
    );
  });

  for (final item in ${table.name}Items) {
    await db.into(db.${table.name}).insert(item);
  }
  print('Seeded ${rowsPerTable} rows into ${table.name}');
`;
  })
  .join("\n")}
  print('Database seeding complete!');
}`;
  } else if (outputFormat === "sql") {
    seedCode = `-- Generated seed data for Drift database\n\n`;
    tablesToSeed.forEach((table) => {
      seedCode += `-- Seed ${table.name} table\n`;
      for (let i = 0; i < rowsPerTable; i++) {
        const values = table.columns
          .filter((c) => !c.autoIncrement)
          .map((col) => {
            if (col.type === "text") return `'Sample ${col.name} ${i}'`;
            if (col.type === "integer") return `${i + 1}`;
            if (col.type === "real") return `${(i + 1) * 1.5}`;
            if (col.type === "boolean") return i % 2 === 0 ? "1" : "0";
            return `'value${i}'`;
          })
          .join(", ");
        seedCode += `INSERT INTO ${table.name} (${table.columns
          .filter((c) => !c.autoIncrement)
          .map((c) => c.name)
          .join(", ")}) VALUES (${values});\n`;
      }
      seedCode += "\n";
    });
  } else if (outputFormat === "json") {
    const jsonData: Record<string, unknown[]> = {};
    tablesToSeed.forEach((table) => {
      jsonData[table.name] = Array.from({ length: rowsPerTable }, (_, i) => {
        const row: Record<string, unknown> = {};
        table.columns
          .filter((c) => !c.autoIncrement)
          .forEach((col) => {
            if (col.type === "text") row[col.name] = `Sample ${col.name} ${i}`;
            else if (col.type === "integer") row[col.name] = i + 1;
            else if (col.type === "real") row[col.name] = (i + 1) * 1.5;
            else if (col.type === "boolean") row[col.name] = i % 2 === 0;
            else row[col.name] = `value${i}`;
          });
        return row;
      });
    });
    seedCode = JSON.stringify(jsonData, null, 2);
  }

  return {
    content: [
      {
        type: "text",
        text: `# Drift Seed Data Generated

Tables: ${tablesToSeed.map((t) => t.name).join(", ")}
Rows per table: ${rowsPerTable}
Output format: ${outputFormat}
Using faker: ${useFaker}

${outputFormat === "dart" ? "## Dart Code\n\nAdd this to your project and call \`seedDatabase(db)\` to populate test data:\n\n" : outputFormat === "sql" ? "## SQL Statements\n\nExecute these statements to populate your database:\n\n" : "## JSON Data\n\n"}
\`\`\`${outputFormat}
${seedCode}
\`\`\`

${outputFormat === "dart" && useFaker ? "\n**Note:** Add \`faker: ^2.1.0\` to your pubspec.yaml to use this seed data." : ""}`,
      },
    ],
  };
}

export default DRIFT_TOOLS;
