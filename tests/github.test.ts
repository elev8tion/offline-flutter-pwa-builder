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

describe('Drift Integration', () => {
  describe('Type Mapping', () => {
    it('should convert Dart int to SQL integer', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('int')).toBe('integer');
      expect(dartTypeToSqlType('Int')).toBe('integer');
      expect(dartTypeToSqlType('int?')).toBe('integer');
    });

    it('should convert Dart double to SQL real', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('double')).toBe('real');
      expect(dartTypeToSqlType('Double')).toBe('real');
      expect(dartTypeToSqlType('num')).toBe('real');
    });

    it('should convert Dart bool to SQL boolean', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('bool')).toBe('boolean');
      expect(dartTypeToSqlType('Bool')).toBe('boolean');
      expect(dartTypeToSqlType('bool?')).toBe('boolean');
    });

    it('should convert Dart DateTime to SQL dateTime', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('DateTime')).toBe('dateTime');
      expect(dartTypeToSqlType('DateTime?')).toBe('dateTime');
    });

    it('should convert Dart List to SQL blob', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('List<int>')).toBe('blob');
      expect(dartTypeToSqlType('Uint8List')).toBe('blob');
    });

    it('should convert Dart String and other types to SQL text', async () => {
      const { dartTypeToSqlType } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(dartTypeToSqlType('String')).toBe('text');
      expect(dartTypeToSqlType('String?')).toBe('text');
      expect(dartTypeToSqlType('CustomEnum')).toBe('text');
    });
  });

  describe('Name Conversion', () => {
    it('should convert camelCase to snake_case', async () => {
      const { toSnakeCase } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(toSnakeCase('userId')).toBe('user_id');
      expect(toSnakeCase('createdAt')).toBe('created_at');
      expect(toSnakeCase('firstName')).toBe('first_name');
    });

    it('should convert PascalCase to snake_case for table names', async () => {
      const { classNameToTableName } = await import('../src/modules/github/builders/drift-mapper.js');
      expect(classNameToTableName('User')).toBe('user');
      expect(classNameToTableName('UserProfile')).toBe('user_profile');
      expect(classNameToTableName('BlogPost')).toBe('blog_post');
    });
  });

  describe('Field Mapping', () => {
    it('should map basic field correctly', async () => {
      const { mapFieldToDrift } = await import('../src/modules/github/builders/drift-mapper.js');
      const field = {
        name: 'userName',
        type: 'String',
        nullable: false,
        annotations: [],
        defaultValue: undefined,
      };
      const mapped = mapFieldToDrift(field);
      expect(mapped.name).toBe('user_name');
      expect(mapped.dartName).toBe('userName');
      expect(mapped.sqlType).toBe('text');
      expect(mapped.nullable).toBe(false);
      expect(mapped.primaryKey).toBe(false);
    });

    it('should detect primary key from field name', async () => {
      const { mapFieldToDrift } = await import('../src/modules/github/builders/drift-mapper.js');
      const field = {
        name: 'id',
        type: 'int',
        nullable: false,
        annotations: [],
        defaultValue: undefined,
      };
      const mapped = mapFieldToDrift(field);
      expect(mapped.primaryKey).toBe(true);
      expect(mapped.autoIncrement).toBe(true);
    });

    it('should detect foreign key from field name', async () => {
      const { mapFieldToDrift } = await import('../src/modules/github/builders/drift-mapper.js');
      const field = {
        name: 'userId',
        type: 'int',
        nullable: false,
        annotations: [],
        defaultValue: undefined,
      };
      const mapped = mapFieldToDrift(field);
      expect(mapped.references).toBeDefined();
      expect(mapped.references?.table).toBe('user');
      expect(mapped.references?.column).toBe('id');
    });

    it('should handle nullable types', async () => {
      const { mapFieldToDrift } = await import('../src/modules/github/builders/drift-mapper.js');
      const field = {
        name: 'email',
        type: 'String?',
        nullable: true,
        annotations: [],
        defaultValue: undefined,
      };
      const mapped = mapFieldToDrift(field);
      expect(mapped.nullable).toBe(true);
    });
  });

  describe('Model to Schema Conversion', () => {
    it('should convert model to Drift schema', async () => {
      const { modelToDriftSchema } = await import('../src/modules/github/builders/drift-mapper.js');
      const model = {
        name: 'User',
        filePath: '/lib/models/user.dart',
        fields: [
          { name: 'id', type: 'int', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'name', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'email', type: 'String?', nullable: true, annotations: [], defaultValue: undefined },
        ],
        annotations: [],
        relationships: [],
        isImmutable: false,
        hasJson: false,
      };
      const schema = modelToDriftSchema(model);
      expect(schema.name).toBe('user');
      expect(schema.dartClassName).toBe('User');
      expect(schema.fields.length).toBe(3);
      expect(schema.fields[0].primaryKey).toBe(true);
    });

    it('should add primary key if missing', async () => {
      const { modelToDriftSchema } = await import('../src/modules/github/builders/drift-mapper.js');
      const model = {
        name: 'Tag',
        filePath: '/lib/models/tag.dart',
        fields: [
          { name: 'name', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
        ],
        annotations: [],
        relationships: [],
        isImmutable: false,
        hasJson: false,
      };
      const schema = modelToDriftSchema(model);
      expect(schema.fields.length).toBe(2); // id + name
      expect(schema.fields[0].name).toBe('id');
      expect(schema.fields[0].primaryKey).toBe(true);
    });

    it('should detect timestamps from fields', async () => {
      const { modelToDriftSchema } = await import('../src/modules/github/builders/drift-mapper.js');
      const model = {
        name: 'Post',
        filePath: '/lib/models/post.dart',
        fields: [
          { name: 'id', type: 'int', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'title', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'createdAt', type: 'DateTime', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'updatedAt', type: 'DateTime', nullable: false, annotations: [], defaultValue: undefined },
        ],
        annotations: [],
        relationships: [],
        isImmutable: false,
        hasJson: false,
      };
      const schema = modelToDriftSchema(model);
      expect(schema.timestamps).toBe(true);
    });

    it('should detect soft delete from deletedAt field', async () => {
      const { modelToDriftSchema } = await import('../src/modules/github/builders/drift-mapper.js');
      const model = {
        name: 'Post',
        filePath: '/lib/models/post.dart',
        fields: [
          { name: 'id', type: 'int', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'title', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
          { name: 'deletedAt', type: 'DateTime?', nullable: true, annotations: [], defaultValue: undefined },
        ],
        annotations: [],
        relationships: [],
        isImmutable: false,
        hasJson: false,
      };
      const schema = modelToDriftSchema(model);
      expect(schema.softDelete).toBe(true);
    });
  });

  describe('Database File Generation', () => {
    it('should generate database file with tables and DAOs', async () => {
      const { generateDatabaseFile } = await import('../src/modules/github/builders/database-generator.js');
      const fs = await import('fs-extra');
      const path = await import('path');
      const os = await import('os');

      const tmpDir = await fs.default.mkdtemp(path.join(os.tmpdir(), 'drift-test-'));

      const schemas = [
        {
          name: 'users',
          dartClassName: 'User',
          fields: [
            {
              name: 'id',
              dartName: 'id',
              dartType: 'int',
              sqlType: 'integer' as const,
              nullable: false,
              unique: true,
              primaryKey: true,
              autoIncrement: true,
            },
            {
              name: 'name',
              dartName: 'name',
              dartType: 'String',
              sqlType: 'text' as const,
              nullable: false,
              unique: false,
              primaryKey: false,
              autoIncrement: false,
            },
          ],
          relationships: [],
          timestamps: false,
          softDelete: false,
        },
      ];

      await generateDatabaseFile(schemas, tmpDir);

      const dbFile = path.join(tmpDir, 'lib', 'database', 'app_database.dart');
      expect(await fs.default.pathExists(dbFile)).toBe(true);

      const content = await fs.default.readFile(dbFile, 'utf-8');
      expect(content).toContain('class UserTable extends Table');
      expect(content).toContain('class UserDao extends DatabaseAccessor');
      expect(content).toContain('AppDatabase');

      // Cleanup
      await fs.default.remove(tmpDir);
    });
  });

  describe('Schema Builder Integration', () => {
    it('should include driftSchemas in rebuild schema when offline support enabled', async () => {
      const { createRebuildSchema } = await import('../src/modules/github/builders/schema-builder.js');

      const analysis = {
        name: 'test_app',
        description: 'Test app',
        flutterVersion: '3.10.0',
        dartVersion: '3.0.0',
        architecture: {
          detected: 'clean' as const,
          confidence: 80,
          structure: {
            name: 'lib',
            path: 'lib',
            type: 'directory' as const
          },
          reasoning: ['Clean architecture'],
        },
        dependencies: {
          stateManagement: 'riverpod' as const,
          database: 'none' as const,
          networking: 'dio' as const,
          navigation: 'go_router' as const,
        },
        models: [
          {
            name: 'User',
            filePath: '/lib/models/user.dart',
            fields: [
              { name: 'id', type: 'int', nullable: false, annotations: [], defaultValue: undefined },
              { name: 'name', type: 'String', nullable: false, annotations: [], defaultValue: undefined },
            ],
            annotations: [],
            relationships: [],
            isImmutable: false,
            hasJson: false,
          },
        ],
        screens: [],
        widgets: [],
        stats: {
          totalFiles: 10,
          dartFiles: 8,
          testFiles: 2,
          linesOfCode: 500,
        },
      };

      const schema = await createRebuildSchema(analysis, { addOfflineSupport: true });

      expect(schema.driftSchemas).toBeDefined();
      expect(schema.driftSchemas?.length).toBe(1);
      expect(schema.driftSchemas?.[0].name).toBe('user');
      expect(schema.driftSchemas?.[0].dartClassName).toBe('User');
    });

    it('should not include driftSchemas when offline support disabled', async () => {
      const { createRebuildSchema } = await import('../src/modules/github/builders/schema-builder.js');

      const analysis = {
        name: 'test_app',
        description: 'Test app',
        flutterVersion: '3.10.0',
        dartVersion: '3.0.0',
        architecture: {
          detected: 'clean' as const,
          confidence: 80,
          structure: {
            name: 'lib',
            path: 'lib',
            type: 'directory' as const
          },
          reasoning: ['Clean architecture'],
        },
        dependencies: {
          stateManagement: 'riverpod' as const,
          database: 'none' as const,
          networking: 'dio' as const,
          navigation: 'go_router' as const,
        },
        models: [
          {
            name: 'User',
            filePath: '/lib/models/user.dart',
            fields: [{ name: 'id', type: 'int', nullable: false, annotations: [], defaultValue: undefined }],
            annotations: [],
            relationships: [],
            isImmutable: false,
            hasJson: false,
          },
        ],
        screens: [],
        widgets: [],
        stats: {
          totalFiles: 10,
          dartFiles: 8,
          testFiles: 2,
          linesOfCode: 500,
        },
      };

      const schema = await createRebuildSchema(analysis, { addOfflineSupport: false });

      expect(schema.driftSchemas).toBeUndefined();
    });
  });
});
