/**
 * Core Module Tests
 */

import { MemoryFileSystem } from "../src/core/filesystem/index.js";
import { TemplateEngine } from "../src/core/template-engine/index.js";
import { ModuleSystem } from "../src/core/module-system/index.js";
import { ValidationFramework } from "../src/core/validation-framework/index.js";
import { ProjectEngine } from "../src/core/project-engine/index.js";

describe("MemoryFileSystem", () => {
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem();
  });

  test("should write and read a file", async () => {
    await fs.write("/test.txt", "Hello, World!");
    const content = await fs.read("/test.txt");
    expect(content).toBe("Hello, World!");
  });

  test("should check if file exists", async () => {
    expect(await fs.exists("/nonexistent.txt")).toBe(false);
    await fs.write("/exists.txt", "content");
    expect(await fs.exists("/exists.txt")).toBe(true);
  });

  test("should create directories", async () => {
    await fs.mkdir("/a/b/c");
    expect(await fs.exists("/a")).toBe(true);
    expect(await fs.exists("/a/b")).toBe(true);
    expect(await fs.exists("/a/b/c")).toBe(true);
  });

  test("should list directory contents", async () => {
    await fs.write("/dir/file1.txt", "1");
    await fs.write("/dir/file2.txt", "2");
    const files = await fs.list("/dir");
    expect(files).toHaveLength(2);
    expect(files).toContain("/dir/file1.txt");
    expect(files).toContain("/dir/file2.txt");
  });

  test("should delete files", async () => {
    await fs.write("/to-delete.txt", "bye");
    expect(await fs.exists("/to-delete.txt")).toBe(true);
    await fs.delete("/to-delete.txt");
    expect(await fs.exists("/to-delete.txt")).toBe(false);
  });
});

describe("TemplateEngine", () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  test("should render string template", () => {
    const result = engine.renderString("Hello, {{name}}!", { name: "World" });
    expect(result).toBe("Hello, World!");
  });

  test("should support camelCase helper", () => {
    const result = engine.renderString("{{camelCase name}}", { name: "hello_world" });
    expect(result).toBe("helloWorld");
  });

  test("should support pascalCase helper", () => {
    const result = engine.renderString("{{pascalCase name}}", { name: "hello_world" });
    expect(result).toBe("HelloWorld");
  });

  test("should support snakeCase helper", () => {
    const result = engine.renderString("{{snakeCase name}}", { name: "helloWorld" });
    expect(result).toBe("hello_world");
  });

  test("should support dartType helper", () => {
    expect(engine.renderString("{{dartType type}}", { type: "string" })).toBe("String");
    expect(engine.renderString("{{dartType type}}", { type: "number" })).toBe("num");
    expect(engine.renderString("{{dartType type}}", { type: "boolean" })).toBe("bool");
  });

  test("should register and render templates", async () => {
    engine.register({
      id: "test-template",
      name: "Test Template",
      description: "A test template",
      type: "file",
      source: "class {{pascalCase project.name}} {}",
      output: {
        path: "lib",
        filename: "{{snakeCase project.name}}",
        extension: ".dart",
      },
    });

    const project = {
      id: "test-id",
      name: "my_app",
      displayName: "My App",
      version: "1.0.0",
      pwa: {
        name: "My App",
        shortName: "MyApp",
        description: "",
        themeColor: "#2196F3",
        backgroundColor: "#FFFFFF",
        display: "standalone" as const,
        orientation: "any" as const,
        icons: [],
        startUrl: "/",
        scope: "/",
      },
      offline: {
        strategy: "offline-first" as const,
        storage: { type: "drift" as const, encryption: false },
        caching: { assets: true, api: true, ttl: 3600 },
      },
      architecture: "feature-first" as const,
      stateManagement: "riverpod" as const,
      modules: [],
      targets: ["web" as const],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const rendered = await engine.render("test-template", { project });
    expect(rendered.content).toBe("class MyApp {}");
    expect(rendered.path).toBe("lib/my_app.dart");
  });
});

describe("ModuleSystem", () => {
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    moduleSystem = new ModuleSystem();
  });

  test("should register modules", () => {
    const module = {
      id: "test-module",
      name: "Test Module",
      version: "1.0.0",
      description: "A test module",
      compatibleTargets: ["web" as const],
      dependencies: [],
      conflicts: [],
      configSchema: {},
      defaultConfig: {},
      templates: [],
      assets: [],
      hooks: {},
    };

    moduleSystem.register(module);
    expect(moduleSystem.get("test-module")).toEqual(module);
    expect(moduleSystem.list()).toHaveLength(1);
  });

  test("should install modules to projects", async () => {
    const module = {
      id: "test-module",
      name: "Test Module",
      version: "1.0.0",
      description: "A test module",
      compatibleTargets: ["web" as const],
      dependencies: [],
      conflicts: [],
      configSchema: {},
      defaultConfig: {},
      templates: [],
      assets: [],
      hooks: {},
    };

    moduleSystem.register(module);
    await moduleSystem.install("project-1", "test-module");

    const installed = moduleSystem.getInstalled("project-1");
    expect(installed).toHaveLength(1);
    expect(installed[0].id).toBe("test-module");
  });

  test("should detect conflicts", () => {
    const module1 = {
      id: "module-a",
      name: "Module A",
      version: "1.0.0",
      description: "",
      compatibleTargets: ["web" as const],
      dependencies: [],
      conflicts: ["module-b"],
      configSchema: {},
      defaultConfig: {},
      templates: [],
      assets: [],
      hooks: {},
    };

    const module2 = {
      id: "module-b",
      name: "Module B",
      version: "1.0.0",
      description: "",
      compatibleTargets: ["web" as const],
      dependencies: [],
      conflicts: [],
      configSchema: {},
      defaultConfig: {},
      templates: [],
      assets: [],
      hooks: {},
    };

    moduleSystem.register(module1);
    expect(() => moduleSystem.register(module2)).toThrow(/conflicts/);
  });
});

describe("ValidationFramework", () => {
  let validation: ValidationFramework;

  beforeEach(() => {
    validation = new ValidationFramework();
  });

  test("should validate project names", async () => {
    const validProject = {
      id: "test",
      name: "my_app",
      displayName: "My App",
      version: "1.0.0",
      pwa: {
        name: "My App",
        shortName: "MyApp",
        description: "",
        themeColor: "#2196F3",
        backgroundColor: "#FFFFFF",
        display: "standalone" as const,
        orientation: "any" as const,
        icons: [],
        startUrl: "/",
        scope: "/",
      },
      offline: {
        strategy: "offline-first" as const,
        storage: { type: "drift" as const, encryption: false },
        caching: { assets: true, api: true, ttl: 3600 },
      },
      architecture: "feature-first" as const,
      stateManagement: "riverpod" as const,
      modules: [],
      targets: ["web" as const],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await validation.validateProject(validProject);
    expect(result.valid).toBe(true);
  });

  test("should reject invalid project names", async () => {
    const invalidProject = {
      id: "test",
      name: "Invalid Name", // Contains uppercase and spaces
      displayName: "Invalid",
      version: "1.0.0",
      pwa: {
        name: "Invalid",
        shortName: "Invalid",
        description: "",
        themeColor: "#2196F3",
        backgroundColor: "#FFFFFF",
        display: "standalone" as const,
        orientation: "any" as const,
        icons: [],
        startUrl: "/",
        scope: "/",
      },
      offline: {
        strategy: "offline-first" as const,
        storage: { type: "drift" as const, encryption: false },
        caching: { assets: true, api: true, ttl: 3600 },
      },
      architecture: "feature-first" as const,
      stateManagement: "riverpod" as const,
      modules: [],
      targets: ["web" as const],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await validation.validateProject(invalidProject);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.validator === "project-name")).toBe(true);
  });
});

describe("ProjectEngine", () => {
  let projectEngine: ProjectEngine;
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem();
    const templateEngine = new TemplateEngine();
    const moduleSystem = new ModuleSystem();
    const validation = new ValidationFramework();
    projectEngine = new ProjectEngine(fs, templateEngine, moduleSystem, validation);
  });

  test("should create a project", async () => {
    const project = await projectEngine.create({
      name: "my_pwa",
      displayName: "My PWA",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("my_pwa");
    expect(project.displayName).toBe("My PWA");
    expect(project.architecture).toBe("feature-first");
    expect(project.stateManagement).toBe("riverpod");
    expect(project.targets).toContain("web");
  });

  test("should list projects", async () => {
    await projectEngine.create({ name: "app_one" });
    await projectEngine.create({ name: "app_two" });

    const projects = projectEngine.list();
    expect(projects).toHaveLength(2);
  });

  test("should generate project files", async () => {
    const project = await projectEngine.create({ name: "my_app" });
    const files = await projectEngine.generate(project.id);

    expect(files.length).toBeGreaterThan(0);

    const paths = files.map(f => f.path);
    expect(paths).toContain("pubspec.yaml");
    expect(paths).toContain("lib/main.dart");
    expect(paths).toContain("lib/app.dart");
  });

  test("should validate projects", async () => {
    const project = await projectEngine.create({ name: "valid_app" });
    const result = await projectEngine.validate(project.id);
    expect(result.valid).toBe(true);
  });
});
