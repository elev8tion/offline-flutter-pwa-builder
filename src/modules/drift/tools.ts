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

export default DRIFT_TOOLS;
