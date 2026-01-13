/**
 * Drift Module Configuration
 *
 * Types and defaults for SQLite + WASM + OPFS storage
 */

import { z } from "zod";

// ============================================================================
// COLUMN TYPES
// ============================================================================

export type DriftColumnType =
  | "integer"
  | "text"
  | "real"
  | "blob"
  | "boolean"
  | "dateTime";

export interface DriftColumn {
  name: string;
  type: DriftColumnType;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  defaultValue?: string | number | boolean | null;
  references?: {
    table: string;
    column: string;
    onDelete?: "cascade" | "setNull" | "restrict" | "noAction";
    onUpdate?: "cascade" | "setNull" | "restrict" | "noAction";
  };
}

export interface DriftIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

// ============================================================================
// TABLE DEFINITION
// ============================================================================

export interface DriftTableDefinition {
  name: string;
  columns: DriftColumn[];
  indexes?: DriftIndex[];
  timestamps?: boolean; // Auto-add createdAt, updatedAt
  softDelete?: boolean; // Auto-add deletedAt
}

// ============================================================================
// RELATION TYPES
// ============================================================================

export type RelationType = "oneToOne" | "oneToMany" | "manyToMany";

export interface DriftRelation {
  name: string;
  type: RelationType;
  from: {
    table: string;
    column: string;
  };
  to: {
    table: string;
    column: string;
  };
  throughTable?: string; // For many-to-many
}

// ============================================================================
// MIGRATION
// ============================================================================

export interface DriftMigration {
  version: number;
  name: string;
  up: string; // SQL statements
  down: string; // Rollback SQL
  createdAt: string;
}

// ============================================================================
// MODULE CONFIG
// ============================================================================

export interface DriftConfig {
  databaseName: string;
  encryption: boolean;
  encryptionKeyStrategy: "derived" | "stored" | "user-provided";
  tables: DriftTableDefinition[];
  relations: DriftRelation[];
  enableMigrations: boolean;
  webWorker: boolean;
  opfs: boolean;
  schemaVersion: number;
}

export const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  databaseName: "app_database",
  encryption: false,
  encryptionKeyStrategy: "derived",
  tables: [],
  relations: [],
  enableMigrations: true,
  webWorker: true,
  opfs: true,
  schemaVersion: 1,
};

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const DriftColumnSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "Column name must be camelCase"),
  type: z.enum(["integer", "text", "real", "blob", "boolean", "dateTime"]),
  nullable: z.boolean().optional(),
  primaryKey: z.boolean().optional(),
  autoIncrement: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  references: z
    .object({
      table: z.string(),
      column: z.string(),
      onDelete: z.enum(["cascade", "setNull", "restrict", "noAction"]).optional(),
      onUpdate: z.enum(["cascade", "setNull", "restrict", "noAction"]).optional(),
    })
    .optional(),
});

export const DriftIndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()).min(1),
  unique: z.boolean().optional(),
});

export const DriftTableSchema = z.object({
  name: z.string().regex(/^[a-z][a-z_0-9]*$/, "Table name must be snake_case"),
  columns: z.array(DriftColumnSchema).min(1),
  indexes: z.array(DriftIndexSchema).optional(),
  timestamps: z.boolean().optional(),
  softDelete: z.boolean().optional(),
});

export const DriftRelationSchema = z.object({
  name: z.string(),
  type: z.enum(["oneToOne", "oneToMany", "manyToMany"]),
  from: z.object({
    table: z.string(),
    column: z.string(),
  }),
  to: z.object({
    table: z.string(),
    column: z.string(),
  }),
  throughTable: z.string().optional(),
});

export const DriftConfigSchema = z.object({
  databaseName: z.string().regex(/^[a-z][a-z_0-9]*$/),
  encryption: z.boolean(),
  encryptionKeyStrategy: z.enum(["derived", "stored", "user-provided"]),
  tables: z.array(DriftTableSchema),
  relations: z.array(DriftRelationSchema),
  enableMigrations: z.boolean(),
  webWorker: z.boolean(),
  opfs: z.boolean(),
  schemaVersion: z.number().int().positive(),
});

// ============================================================================
// DART TYPE MAPPING
// ============================================================================

export function columnTypeToDart(type: DriftColumnType): string {
  switch (type) {
    case "integer":
      return "int";
    case "text":
      return "String";
    case "real":
      return "double";
    case "blob":
      return "Uint8List";
    case "boolean":
      return "bool";
    case "dateTime":
      return "DateTime";
    default:
      return "dynamic";
  }
}

export function columnTypeToDrift(type: DriftColumnType): string {
  switch (type) {
    case "integer":
      return "IntColumn";
    case "text":
      return "TextColumn";
    case "real":
      return "RealColumn";
    case "blob":
      return "BlobColumn";
    case "boolean":
      return "BoolColumn";
    case "dateTime":
      return "DateTimeColumn";
    default:
      return "TextColumn";
  }
}

export function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}
