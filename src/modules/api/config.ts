/**
 * API Module Configuration
 *
 * Types and configuration for API client generation, mock servers, and JSON models
 */

import { z } from "zod";

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthType = "none" | "bearer" | "basic" | "apiKey" | "oauth2";
export type ResponseFormat = "json" | "xml" | "text" | "binary";

// ============================================================================
// INTERFACES
// ============================================================================

export interface EndpointConfig {
  path: string;
  method: HttpMethod;
  description?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  delay?: number;
}

export interface MockServerConfig {
  port: number;
  endpoints: EndpointConfig[];
  useFaker: boolean;
  delayMs: number;
  corsEnabled: boolean;
}

export interface JsonFieldConfig {
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  nullable: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface JsonModelConfig {
  className: string;
  fields: JsonFieldConfig[];
  includeFromJson: boolean;
  includeToJson: boolean;
  immutable: boolean;
  generateRepository: boolean;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  authType: AuthType;
  retryAttempts: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export interface ApiModuleConfig {
  client: ApiClientConfig;
  mockServer: MockServerConfig;
  models: JsonModelConfig[];
  generateInterceptors: boolean;
  generateErrorHandling: boolean;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const EndpointConfigSchema = z.object({
  path: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  description: z.string().optional(),
  requestBody: z.record(z.unknown()).optional(),
  responseBody: z.record(z.unknown()).optional(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  delay: z.number().optional(),
});

export const MockServerConfigSchema = z.object({
  port: z.number().min(1024).max(65535),
  endpoints: z.array(EndpointConfigSchema),
  useFaker: z.boolean(),
  delayMs: z.number(),
  corsEnabled: z.boolean(),
});

export const JsonFieldConfigSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "integer", "boolean", "array", "object"]),
  nullable: z.boolean(),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
});

export const JsonModelConfigSchema = z.object({
  className: z.string(),
  fields: z.array(JsonFieldConfigSchema),
  includeFromJson: z.boolean(),
  includeToJson: z.boolean(),
  immutable: z.boolean(),
  generateRepository: z.boolean(),
});

export const ApiClientConfigSchema = z.object({
  baseUrl: z.string(),
  timeout: z.number(),
  authType: z.enum(["none", "bearer", "basic", "apiKey", "oauth2"]),
  retryAttempts: z.number(),
  retryDelay: z.number(),
  headers: z.record(z.string()),
});

export const ApiModuleConfigSchema = z.object({
  client: ApiClientConfigSchema,
  mockServer: MockServerConfigSchema,
  models: z.array(JsonModelConfigSchema),
  generateInterceptors: z.boolean(),
  generateErrorHandling: z.boolean(),
});

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_API_CONFIG: ApiModuleConfig = {
  client: {
    baseUrl: "http://localhost:3000/api",
    timeout: 30000,
    authType: "none",
    retryAttempts: 3,
    retryDelay: 1000,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  },
  mockServer: {
    port: 3001,
    endpoints: [],
    useFaker: true,
    delayMs: 200,
    corsEnabled: true,
  },
  models: [],
  generateInterceptors: true,
  generateErrorHandling: true,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert JSON type to Dart type
 */
export function jsonTypeToDart(jsonType: string, nullable: boolean): string {
  const typeMap: Record<string, string> = {
    string: "String",
    number: "double",
    integer: "int",
    boolean: "bool",
    array: "List<dynamic>",
    object: "Map<String, dynamic>",
  };
  const dartType = typeMap[jsonType] || "dynamic";
  return nullable ? `${dartType}?` : dartType;
}

/**
 * Convert class name to file name (snake_case)
 */
export function classNameToFileName(className: string): string {
  return className
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^./, (c) => c.toLowerCase());
}

/**
 * Generate HTTP method color for documentation
 */
export function getMethodColor(method: HttpMethod): string {
  const colors: Record<HttpMethod, string> = {
    GET: "#61affe",
    POST: "#49cc90",
    PUT: "#fca130",
    PATCH: "#50e3c2",
    DELETE: "#f93e3e",
  };
  return colors[method];
}

/**
 * Validate endpoint path format
 */
export function isValidEndpointPath(path: string): boolean {
  return /^\/[a-zA-Z0-9\-_\/{}:]*$/.test(path);
}
