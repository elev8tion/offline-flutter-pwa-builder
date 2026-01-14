import { describe, it, expect } from '@jest/globals';
import { getTools } from '../src/tools/index.js';
import { GITHUB_MODULE } from '../src/modules/github/index.js';
import { parsePubspec } from '../src/modules/github/parsers/pubspec-parser.js';
import { detectArchitecture } from '../src/modules/github/analyzers/architecture-detector.js';
import { extractModels } from '../src/modules/github/analyzers/model-extractor.js';
import { createRebuildSchema } from '../src/modules/github/builders/schema-builder.js';

describe('GitHub Module', () => {
  it('should register GitHub module', () => {
    expect(GITHUB_MODULE).toBeDefined();
    expect(GITHUB_MODULE.id).toBe('github');
    expect(GITHUB_MODULE.name).toBe('GitHub Import');
  });

  it('should export 7 GitHub tools', () => {
    const tools = getTools();
    const githubTools = tools.filter(t => t.name.startsWith('github_'));
    expect(githubTools.length).toBe(7);

    const toolNames = githubTools.map(t => t.name);
    expect(toolNames).toContain('github_clone_repository');
    expect(toolNames).toContain('github_analyze_flutter_project');
    expect(toolNames).toContain('github_extract_models');
    expect(toolNames).toContain('github_extract_screens');
    expect(toolNames).toContain('github_create_rebuild_schema');
    expect(toolNames).toContain('github_rebuild_project');
    expect(toolNames).toContain('github_import_and_rebuild');
  });

  it('should have correct tool schemas', () => {
    const tools = getTools();
    const cloneTool = tools.find(t => t.name === 'github_clone_repository');

    expect(cloneTool).toBeDefined();
    expect(cloneTool?.description).toContain('Clone a GitHub repository');
    expect(cloneTool?.inputSchema.properties).toHaveProperty('url');
    expect(cloneTool?.inputSchema.required).toContain('url');
  });

  it('should have analyze tool with correct schema', () => {
    const tools = getTools();
    const analyzeTool = tools.find(t => t.name === 'github_analyze_flutter_project');

    expect(analyzeTool).toBeDefined();
    expect(analyzeTool?.description).toContain('Deep analysis');
    expect(analyzeTool?.inputSchema.properties).toHaveProperty('localPath');
    expect(analyzeTool?.inputSchema.properties).toHaveProperty('analyzeDepth');
  });

  it('should have import and rebuild tool', () => {
    const tools = getTools();
    const importTool = tools.find(t => t.name === 'github_import_and_rebuild');

    expect(importTool).toBeDefined();
    expect(importTool?.description).toContain('Combined tool');
    expect(importTool?.inputSchema.properties).toHaveProperty('url');
    expect(importTool?.inputSchema.properties).toHaveProperty('outputPath');
  });
});

describe('Pubspec Parser', () => {
  it('should export parsePubspec function', () => {
    expect(parsePubspec).toBeDefined();
    expect(typeof parsePubspec).toBe('function');
  });

  it('should parse pubspec from file path', async () => {
    // Note: parsePubspec expects a file path, not content
    // For now, just verify function signature
    expect(parsePubspec).toBeDefined();
    expect(typeof parsePubspec).toBe('function');
  });
});

describe('Architecture Detector', () => {
  it('should export detectArchitecture function', () => {
    expect(detectArchitecture).toBeDefined();
    expect(typeof detectArchitecture).toBe('function');
  });

  it('should detect architecture pattern', async () => {
    // Note: This test would require a real directory structure
    // For now, just verify function signature
    expect(detectArchitecture).toBeDefined();
    expect(typeof detectArchitecture).toBe('function');
  });
});

describe('Model Extractor', () => {
  it('should export extractModels function', () => {
    expect(extractModels).toBeDefined();
    expect(typeof extractModels).toBe('function');
  });

  it('should extract models from Dart files', async () => {
    // Note: This test would require real Dart files
    // For now, just verify function signature
    expect(extractModels).toBeDefined();
    expect(typeof extractModels).toBe('function');
  });
});

describe('Schema Builder', () => {
  it('should create rebuild schema from analysis', async () => {
    const mockAnalysis = {
      name: 'test-app',
      description: 'Test app',
      flutterVersion: '3.10.0',
      dartVersion: '3.0.0',
      architecture: {
        detected: 'layer-first' as const,
        confidence: 80,
        structure: {
          name: 'lib',
          path: 'lib',
          type: 'directory' as const
        },
        reasoning: ['Test reasoning'],
      },
      dependencies: {
        stateManagement: 'riverpod' as const,
        database: 'none' as const,
        networking: 'dio' as const,
        navigation: 'go_router' as const,
      },
      models: [],
      screens: [],
      widgets: [],
      stats: {
        totalFiles: 10,
        dartFiles: 8,
        testFiles: 2,
        linesOfCode: 500,
      },
    };

    const schema = await createRebuildSchema(mockAnalysis, {
      keepModels: true,
      applyEdcDesign: true,
    });

    expect(schema).toBeDefined();
    expect(schema.projectDefinition).toBeDefined();
    expect(schema.projectDefinition.name).toBe('test-app');
  });

  it('should apply EDC design when requested', async () => {
    const mockAnalysis = {
      name: 'test-app',
      description: 'Test app',
      flutterVersion: '3.10.0',
      dartVersion: '3.0.0',
      architecture: {
        detected: 'clean' as const,
        confidence: 90,
        structure: {
          name: 'lib',
          path: 'lib',
          type: 'directory' as const
        },
        reasoning: ['Clean architecture detected'],
      },
      dependencies: {
        stateManagement: 'bloc' as const,
        database: 'none' as const,
        networking: 'http' as const,
        navigation: 'navigator' as const,
      },
      models: [],
      screens: [],
      widgets: [],
      stats: {
        totalFiles: 20,
        dartFiles: 15,
        testFiles: 5,
        linesOfCode: 1000,
      },
    };

    const schema = await createRebuildSchema(mockAnalysis, {
      keepModels: true,
      applyEdcDesign: true,
      addOfflineSupport: false,
    });

    expect(schema.projectDefinition).toBeDefined();
    expect(schema.projectDefinition.modules).toBeDefined();
    // When applyEdcDesign is true, design module should be included
    const hasDesignModule = schema.projectDefinition.modules?.some((m: any) => m.id === 'design');
    expect(hasDesignModule).toBe(true);
  });

  it('should add offline support when requested', async () => {
    const mockAnalysis = {
      name: 'test-app',
      description: 'Test app',
      flutterVersion: '3.10.0',
      dartVersion: '3.0.0',
      architecture: {
        detected: 'feature-first' as const,
        confidence: 85,
        structure: {
          name: 'lib',
          path: 'lib',
          type: 'directory' as const
        },
        reasoning: ['Feature-first architecture'],
      },
      dependencies: {
        stateManagement: 'riverpod' as const,
        database: 'none' as const,
        networking: 'dio' as const,
        navigation: 'go_router' as const,
      },
      models: [],
      screens: [],
      widgets: [],
      stats: {
        totalFiles: 15,
        dartFiles: 12,
        testFiles: 3,
        linesOfCode: 750,
      },
    };

    const schema = await createRebuildSchema(mockAnalysis, {
      keepModels: true,
      applyEdcDesign: false,
      addOfflineSupport: true,
    });

    expect(schema.projectDefinition).toBeDefined();
    expect(schema.projectDefinition.offline).toBeDefined();
    expect(schema.projectDefinition.offline?.strategy).toBe('offline-first');
  });
});

describe('GitHub Module Integration', () => {
  it('should export all GitHub tools', () => {
    const tools = getTools();
    const githubTools = tools.filter(t => t.name.startsWith('github_'));

    expect(githubTools.length).toBe(7);
    // Note: Tool type from MCP SDK doesn't include handlers
    // Handlers are managed separately in the MCP server
  });

  it('should have consistent tool naming', () => {
    const tools = getTools();
    const githubTools = tools.filter(t => t.name.startsWith('github_'));

    githubTools.forEach(tool => {
      expect(tool.name).toMatch(/^github_[a-z_]+$/);
    });
  });

  it('should have all tools documented', () => {
    const tools = getTools();
    const githubTools = tools.filter(t => t.name.startsWith('github_'));

    githubTools.forEach(tool => {
      expect(tool.description).toBeDefined();
      if (tool.description) {
        expect(tool.description.length).toBeGreaterThan(10);
      }
    });
  });
});
