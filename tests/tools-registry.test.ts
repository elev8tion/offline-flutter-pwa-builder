import { describe, it, expect } from '@jest/globals';
import { getTools } from '../src/tools/index.js';
import { TOOL_HANDLERS } from '../src/tools/registry.js';

describe('Tool Registry', () => {
  it('should return unique tool names', () => {
    const tools = getTools();
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const tool of tools) {
      if (seen.has(tool.name)) {
        duplicates.add(tool.name);
      } else {
        seen.add(tool.name);
      }
    }

    const duplicateNames = Array.from(duplicates).sort();
    if (duplicateNames.length > 0) {
      console.error(`Duplicate tool names: ${duplicateNames.join(', ')}`);
    }

    expect(duplicateNames).toEqual([]);
  });

  it('should provide a handler for every tool', () => {
    const tools = getTools();
    const missingHandlers = tools.filter((tool) => !TOOL_HANDLERS.has(tool.name));

    if (missingHandlers.length > 0) {
      console.error(
        `Missing tool handlers: ${missingHandlers.map((tool) => tool.name).sort().join(', ')}`
      );
    }

    expect(missingHandlers).toEqual([]);
    const toolNames = new Set(tools.map((tool) => tool.name));
    const extraHandlers = Array.from(TOOL_HANDLERS.keys()).filter((name) => !toolNames.has(name));

    if (extraHandlers.length > 0) {
      console.error(`Extra tool handlers: ${extraHandlers.sort().join(', ')}`);
    }

    expect(extraHandlers).toEqual([]);
  });
});
