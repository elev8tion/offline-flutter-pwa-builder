/**
 * MCP Tools
 *
 * Canonical tool definitions and handlers live in the registry.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolContext } from "../core/types.js";
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from "./registry.js";

export function getTools(): Tool[] {
  return TOOL_DEFINITIONS;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const handler = TOOL_HANDLERS.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return handler(args, context);
}
