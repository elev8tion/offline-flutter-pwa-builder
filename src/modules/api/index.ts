/**
 * API Module
 *
 * API client generation, mock servers, and JSON model serialization
 * for Flutter projects.
 */

import type { Module } from "../../core/types.js";
import {
  ApiModuleConfig,
  DEFAULT_API_CONFIG,
  ApiModuleConfigSchema,
  HttpMethod,
  AuthType,
  ResponseFormat,
  EndpointConfig,
  MockServerConfig,
  JsonFieldConfig,
  JsonModelConfig,
  ApiClientConfig,
  jsonTypeToDart,
  classNameToFileName,
  toPascalCase,
  toCamelCase,
  getMethodColor,
  isValidEndpointPath,
} from "./config.js";
import {
  API_TOOLS,
  ApiToolContext,
  handleApiTool,
  GenerateApiClientInputSchema,
  CreateMockServerInputSchema,
  GenerateJsonModelInputSchema,
} from "./tools.js";
import { apiHooks, registerApiHelpers } from "./hooks.js";
import { API_TEMPLATES } from "./templates.js";

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const ApiModule: Module = {
  id: "api",
  name: "API Module",
  version: "1.0.0",
  description: "API client generation, mock servers, and JSON model serialization",
  compatibleTargets: ["web", "android", "ios", "windows", "macos", "linux"],
  dependencies: [],
  conflicts: [],
  configSchema: ApiModuleConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_API_CONFIG as unknown as Record<string, unknown>,
  hooks: apiHooks,
  templates: API_TEMPLATES,
  assets: [],
};

// ============================================================================
// EXPORTS
// ============================================================================

// Config exports
export type {
  ApiModuleConfig,
  HttpMethod,
  AuthType,
  ResponseFormat,
  EndpointConfig,
  MockServerConfig,
  JsonFieldConfig,
  JsonModelConfig,
  ApiClientConfig,
};

export {
  DEFAULT_API_CONFIG,
  ApiModuleConfigSchema,
  jsonTypeToDart,
  classNameToFileName,
  toPascalCase,
  toCamelCase,
  getMethodColor,
  isValidEndpointPath,
};

// Tools exports
export type { ApiToolContext };

export {
  API_TOOLS,
  handleApiTool,
  GenerateApiClientInputSchema,
  CreateMockServerInputSchema,
  GenerateJsonModelInputSchema,
};

// Hooks exports
export { apiHooks, registerApiHelpers };

// Templates exports
export { API_TEMPLATES };

// Module export
export default ApiModule;
