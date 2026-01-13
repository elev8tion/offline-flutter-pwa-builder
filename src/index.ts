#!/usr/bin/env node

/**
 * Offline Flutter PWA Builder - MCP Server
 *
 * Generates production-ready, offline-first Progressive Web Applications built with Flutter.
 * Uses Drift + WASM + OPFS for browser SQLite, Service Workers for caching.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ProjectEngine } from "./core/project-engine/index.js";
import { TemplateEngine } from "./core/template-engine/index.js";
import { ModuleSystem } from "./core/module-system/index.js";
import { ValidationFramework } from "./core/validation-framework/index.js";
import { LocalFileSystem } from "./core/filesystem/index.js";
import { getTools, handleToolCall } from "./tools/index.js";
import { getResources, readResource } from "./resources/index.js";

// Phase 2: Drift Module
import { DRIFT_MODULE, DRIFT_TEMPLATES } from "./modules/drift/index.js";

// Initialize core components
const fileSystem = new LocalFileSystem();
const templateEngine = new TemplateEngine();
const moduleSystem = new ModuleSystem();
const validationFramework = new ValidationFramework();
const projectEngine = new ProjectEngine(
  fileSystem,
  templateEngine,
  moduleSystem,
  validationFramework
);

// Register modules
moduleSystem.register(DRIFT_MODULE);

// Register templates from modules
for (const template of DRIFT_TEMPLATES) {
  templateEngine.register(template);
}

// Create MCP Server
const server = new Server(
  {
    name: "offline-flutter-pwa-builder",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: getTools() };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await handleToolCall(name, args ?? {}, {
      projectEngine,
      templateEngine,
      moduleSystem,
      validationFramework,
      fileSystem,
    });

    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: getResources() };
});

// Read resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return readResource(uri, { projectEngine, moduleSystem });
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Offline Flutter PWA Builder MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
