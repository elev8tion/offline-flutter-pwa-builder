# Smart Project Start - Wrapper Tool Specification

## Overview

`smart_project_start` is a proposed wrapper tool that auto-detects the input type and routes to the appropriate pipeline automatically. This eliminates human error in choosing the wrong workflow.

## Problem Statement

Currently, there are two distinct workflows:
1. **GitHub transformation** - requires `github_import_and_rebuild`
2. **New project creation** - requires `project_create` + individual tools

Users (or AI agents) can accidentally use the wrong workflow, resulting in:
- Copied files instead of transformed code
- Parallel conflicting systems
- Broken hybrid projects

## Solution

A single entry-point tool that:
1. Analyzes the input
2. Auto-detects the type
3. Routes to the correct pipeline
4. Ensures the full pipeline completes

## Tool Definition

```typescript
interface SmartProjectStartParams {
  // The input - either a GitHub URL or project configuration
  input: string | ProjectConfig;

  // Output directory for the generated project
  outputPath: string;

  // Optional overrides
  options?: {
    // For GitHub transforms
    branch?: string;
    analyzeDepth?: 'shallow' | 'medium' | 'deep';
    keepModels?: boolean;
    keepScreenStructure?: boolean;
    applyEdcDesign?: boolean;
    addOfflineSupport?: boolean;

    // For new projects
    name?: string;
    architecture?: 'clean' | 'feature-first' | 'layer-first';
    stateManagement?: 'riverpod' | 'bloc';
    offlineStrategy?: 'offline-first' | 'online-first' | 'cache-first';
  };
}

interface ProjectConfig {
  name: string;
  description?: string;
  features?: string[];
  // ... other new project options
}
```

## Detection Logic

```typescript
function detectInputType(input: string | ProjectConfig): 'github' | 'new' {
  if (typeof input === 'string') {
    // Check for GitHub URL patterns
    const githubPatterns = [
      /^https?:\/\/github\.com\//,
      /^git@github\.com:/,
      /^https?:\/\/.*\.git$/,
      /github\.com/i
    ];

    if (githubPatterns.some(pattern => pattern.test(input))) {
      return 'github';
    }
  }

  // If it's an object or doesn't match GitHub patterns
  return 'new';
}
```

## Routing Logic

```typescript
async function smartProjectStart(params: SmartProjectStartParams): Promise<Result> {
  const inputType = detectInputType(params.input);

  if (inputType === 'github') {
    // Route to GitHub transformation pipeline
    return await githubImportAndRebuild({
      url: params.input as string,
      outputPath: params.outputPath,
      branch: params.options?.branch || 'main',
      options: {
        analyzeDepth: params.options?.analyzeDepth || 'deep',
        keepModels: params.options?.keepModels ?? true,
        keepScreenStructure: params.options?.keepScreenStructure ?? true,
        applyEdcDesign: params.options?.applyEdcDesign ?? true,
        addOfflineSupport: params.options?.addOfflineSupport ?? true,
      }
    });
  } else {
    // Route to new project creation pipeline
    return await projectCreate({
      name: params.options?.name || (params.input as ProjectConfig).name,
      outputPath: params.outputPath,
      architecture: params.options?.architecture || 'feature-first',
      stateManagement: params.options?.stateManagement || 'riverpod',
      offlineStrategy: params.options?.offlineStrategy || 'offline-first',
    });
  }
}
```

## MCP Tool Registration

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'smart_project_start') {
    const params = SmartProjectStartSchema.parse(request.params.arguments);

    const inputType = detectInputType(params.input);
    console.log(`[SmartProjectStart] Detected input type: ${inputType}`);

    if (inputType === 'github') {
      console.log(`[SmartProjectStart] Routing to github_import_and_rebuild`);
      // ... call github pipeline
    } else {
      console.log(`[SmartProjectStart] Routing to project_create`);
      // ... call new project pipeline
    }
  }
});
```

## Usage Examples

### Example 1: GitHub URL Input
```json
{
  "tool": "smart_project_start",
  "arguments": {
    "input": "https://github.com/user/flutter-app.git",
    "outputPath": "/Users/dev/my-new-pwa",
    "options": {
      "applyEdcDesign": true,
      "addOfflineSupport": true
    }
  }
}
```
**Routes to:** `github_import_and_rebuild`

### Example 2: New Project Config
```json
{
  "tool": "smart_project_start",
  "arguments": {
    "input": {
      "name": "my_new_app",
      "description": "A brand new offline-first PWA"
    },
    "outputPath": "/Users/dev/my-new-pwa",
    "options": {
      "architecture": "feature-first",
      "stateManagement": "riverpod"
    }
  }
}
```
**Routes to:** `project_create`

### Example 3: Simple String (New Project)
```json
{
  "tool": "smart_project_start",
  "arguments": {
    "input": "my_awesome_app",
    "outputPath": "/Users/dev/my-awesome-app"
  }
}
```
**Routes to:** `project_create` (string doesn't match GitHub patterns)

## Benefits

1. **Single entry point** - Users don't need to know which tool to use
2. **Auto-detection** - Eliminates routing errors
3. **Consistent results** - Always runs the correct full pipeline
4. **Simpler API** - One tool to remember instead of multiple

## Implementation Notes

- Add to `src/tools/smart-project-start.ts`
- Register in `src/index.ts` with the MCP server
- Add Zod schema for input validation
- Add logging to show which pipeline was selected
- Return combined result from whichever pipeline ran

## Future Enhancements

- Support for other Git providers (GitLab, Bitbucket)
- Support for local directory paths as input
- Interactive mode that asks clarifying questions
- Dry-run mode that shows what would happen without executing
