/**
 * Template Engine
 *
 * Handlebars-based template rendering with support for:
 * - Custom helpers (camelCase, pascalCase, snakeCase, etc.)
 * - Partials for reusable snippets
 * - Conditional rendering
 * - Transforms
 */

import Handlebars from "handlebars";
import type {
  Template,
  TemplateContext,
  RenderedFile,
  TemplateEngine as ITemplateEngine,
} from "../types.js";

// ============================================================================
// HANDLEBARS HELPERS
// ============================================================================

function registerBuiltinHelpers(handlebars: typeof Handlebars): void {
  // String case transformations
  handlebars.registerHelper("camelCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (c) => c.toLowerCase());
  });

  handlebars.registerHelper("pascalCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (c) => c.toUpperCase());
  });

  handlebars.registerHelper("snakeCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/([A-Z])/g, "_$1")
      .replace(/[-\s]+/g, "_")
      .toLowerCase()
      .replace(/^_/, "");
  });

  handlebars.registerHelper("kebabCase", (str: string) => {
    if (!str) return "";
    return str
      .replace(/([A-Z])/g, "-$1")
      .replace(/[_\s]+/g, "-")
      .toLowerCase()
      .replace(/^-/, "");
  });

  handlebars.registerHelper("upperCase", (str: string) => {
    return str?.toUpperCase() ?? "";
  });

  handlebars.registerHelper("lowerCase", (str: string) => {
    return str?.toLowerCase() ?? "";
  });

  // Pluralization (simple)
  handlebars.registerHelper("pluralize", (str: string) => {
    if (!str) return "";
    if (str.endsWith("s") || str.endsWith("x") || str.endsWith("z")) {
      return str + "es";
    }
    if (str.endsWith("y") && !/[aeiou]y$/i.test(str)) {
      return str.slice(0, -1) + "ies";
    }
    return str + "s";
  });

  handlebars.registerHelper("singularize", (str: string) => {
    if (!str) return "";
    if (str.endsWith("ies")) return str.slice(0, -3) + "y";
    if (str.endsWith("es")) return str.slice(0, -2);
    if (str.endsWith("s")) return str.slice(0, -1);
    return str;
  });

  // Conditional helpers
  handlebars.registerHelper("eq", (a, b) => a === b);
  handlebars.registerHelper("neq", (a, b) => a !== b);
  handlebars.registerHelper("gt", (a, b) => a > b);
  handlebars.registerHelper("gte", (a, b) => a >= b);
  handlebars.registerHelper("lt", (a, b) => a < b);
  handlebars.registerHelper("lte", (a, b) => a <= b);
  handlebars.registerHelper("and", (...args) => {
    args.pop(); // Remove options object
    return args.every(Boolean);
  });
  handlebars.registerHelper("or", (...args) => {
    args.pop(); // Remove options object
    return args.some(Boolean);
  });
  handlebars.registerHelper("not", (value) => !value);

  // Array helpers
  handlebars.registerHelper("join", (arr: unknown[], separator: string) => {
    if (!Array.isArray(arr)) return "";
    return arr.join(separator);
  });

  handlebars.registerHelper("includes", (arr: unknown[], value: unknown) => {
    if (!Array.isArray(arr)) return false;
    return arr.includes(value);
  });

  handlebars.registerHelper("first", (arr: unknown[]) => {
    if (!Array.isArray(arr)) return undefined;
    return arr[0];
  });

  handlebars.registerHelper("last", (arr: unknown[]) => {
    if (!Array.isArray(arr)) return undefined;
    return arr[arr.length - 1];
  });

  handlebars.registerHelper("length", (arr: unknown[] | string) => {
    return arr?.length ?? 0;
  });

  // Object helpers
  handlebars.registerHelper("json", (obj: unknown, indent?: number) => {
    return JSON.stringify(obj, null, typeof indent === "number" ? indent : 2);
  });

  handlebars.registerHelper("keys", (obj: Record<string, unknown>) => {
    return Object.keys(obj ?? {});
  });

  handlebars.registerHelper("values", (obj: Record<string, unknown>) => {
    return Object.values(obj ?? {});
  });

  // Date helpers
  handlebars.registerHelper("now", () => new Date().toISOString());
  handlebars.registerHelper("date", (format: string) => {
    const now = new Date();
    return format
      .replace("YYYY", now.getFullYear().toString())
      .replace("MM", (now.getMonth() + 1).toString().padStart(2, "0"))
      .replace("DD", now.getDate().toString().padStart(2, "0"));
  });

  // Dart-specific helpers
  handlebars.registerHelper("dartType", (type: string) => {
    const typeMap: Record<string, string> = {
      string: "String",
      number: "num",
      integer: "int",
      float: "double",
      boolean: "bool",
      date: "DateTime",
      json: "Map<String, dynamic>",
      text: "String",
      array: "List",
      object: "Map<String, dynamic>",
    };
    return typeMap[type?.toLowerCase()] ?? type ?? "dynamic";
  });

  handlebars.registerHelper("dartDefaultValue", (type: string) => {
    const defaults: Record<string, string> = {
      String: "''",
      int: "0",
      double: "0.0",
      num: "0",
      bool: "false",
      DateTime: "DateTime.now()",
      List: "[]",
      Map: "{}",
    };
    return defaults[type] ?? "null";
  });

  // Block helpers
  handlebars.registerHelper("ifCond", function (
    this: unknown,
    v1: unknown,
    operator: string,
    v2: unknown,
    options: Handlebars.HelperOptions
  ) {
    let result = false;
    switch (operator) {
      case "==":
        result = v1 == v2;
        break;
      case "===":
        result = v1 === v2;
        break;
      case "!=":
        result = v1 != v2;
        break;
      case "!==":
        result = v1 !== v2;
        break;
      case "<":
        result = (v1 as number) < (v2 as number);
        break;
      case "<=":
        result = (v1 as number) <= (v2 as number);
        break;
      case ">":
        result = (v1 as number) > (v2 as number);
        break;
      case ">=":
        result = (v1 as number) >= (v2 as number);
        break;
      case "&&":
        result = Boolean(v1) && Boolean(v2);
        break;
      case "||":
        result = Boolean(v1) || Boolean(v2);
        break;
    }
    return result ? options.fn(this) : options.inverse(this);
  });

  // Comment helpers for Dart
  handlebars.registerHelper("dartComment", (text: string) => {
    if (!text) return "";
    return text
      .split("\n")
      .map((line) => `/// ${line}`)
      .join("\n");
  });

  handlebars.registerHelper("dartBlockComment", (text: string) => {
    if (!text) return "";
    return `/* ${text} */`;
  });
}

// ============================================================================
// TEMPLATE ENGINE IMPLEMENTATION
// ============================================================================

export class TemplateEngine implements ITemplateEngine {
  private templates: Map<string, Template> = new Map();
  private compiledTemplates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    registerBuiltinHelpers(this.handlebars);
  }

  register(template: Template): void {
    this.templates.set(template.id, template);
    // Pre-compile the template
    this.compiledTemplates.set(template.id, this.handlebars.compile(template.source));
  }

  unregister(templateId: string): void {
    this.templates.delete(templateId);
    this.compiledTemplates.delete(templateId);
  }

  get(templateId: string): Template | undefined {
    return this.templates.get(templateId);
  }

  list(): Template[] {
    return Array.from(this.templates.values());
  }

  async render(templateId: string, context: TemplateContext): Promise<RenderedFile> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check conditions
    if (template.conditions && !this.evaluateConditions(template.conditions, context)) {
      throw new Error(`Template conditions not met: ${templateId}`);
    }

    // Build template data
    const data = this.buildTemplateData(template, context);

    // Render content
    const compiled = this.compiledTemplates.get(templateId);
    if (!compiled) {
      throw new Error(`Template not compiled: ${templateId}`);
    }

    const content = compiled(data);

    // Build output path
    const outputPath = this.buildOutputPath(template, data);

    return {
      path: outputPath,
      content,
      template,
    };
  }

  async renderMultiple(templateIds: string[], context: TemplateContext): Promise<RenderedFile[]> {
    const results: RenderedFile[] = [];

    for (const templateId of templateIds) {
      try {
        const rendered = await this.render(templateId, context);
        results.push(rendered);
      } catch (error) {
        // Skip templates whose conditions aren't met
        if (error instanceof Error && error.message.includes("conditions not met")) {
          continue;
        }
        throw error;
      }
    }

    return results;
  }

  renderString(source: string, data: Record<string, unknown>): string {
    const compiled = this.handlebars.compile(source);
    return compiled(data);
  }

  preview(templateId: string, context: TemplateContext): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const data = this.buildTemplateData(template, context);
    const compiled = this.compiledTemplates.get(templateId);

    if (!compiled) {
      throw new Error(`Template not compiled: ${templateId}`);
    }

    return compiled(data);
  }

  registerHelper(name: string, fn: (...args: unknown[]) => unknown): void {
    this.handlebars.registerHelper(name, fn);
  }

  registerPartial(name: string, source: string): void {
    this.handlebars.registerPartial(name, source);
  }

  private evaluateConditions(
    conditions: Template["conditions"],
    context: TemplateContext
  ): boolean {
    if (!conditions) return true;

    for (const condition of conditions) {
      const value = this.getNestedValue(context, condition.field);

      switch (condition.operator) {
        case "eq":
          if (value !== condition.value) return false;
          break;
        case "neq":
          if (value === condition.value) return false;
          break;
        case "in":
          if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false;
          break;
        case "notIn":
          if (Array.isArray(condition.value) && condition.value.includes(value)) return false;
          break;
        case "exists":
          if (value === undefined || value === null) return false;
          break;
        case "notExists":
          if (value !== undefined && value !== null) return false;
          break;
      }
    }

    return true;
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private buildTemplateData(template: Template, context: TemplateContext): Record<string, unknown> {
    const data: Record<string, unknown> = {
      project: context.project,
      module: context.module,
      ...context.data,
    };

    // Apply transforms
    if (template.transforms) {
      for (const transform of template.transforms) {
        const value = this.getNestedValue(data, transform.field);
        if (typeof value === "string") {
          const transformed = this.applyTransform(value, transform.type);
          this.setNestedValue(data, transform.field + "_" + transform.type, transformed);
        }
      }
    }

    return data;
  }

  private applyTransform(value: string, type: string): string {
    switch (type) {
      case "camelCase":
        return value
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
          .replace(/^./, (c) => c.toLowerCase());
      case "pascalCase":
        return value
          .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
          .replace(/^./, (c) => c.toUpperCase());
      case "snakeCase":
        return value
          .replace(/([A-Z])/g, "_$1")
          .replace(/[-\s]+/g, "_")
          .toLowerCase()
          .replace(/^_/, "");
      case "kebabCase":
        return value
          .replace(/([A-Z])/g, "-$1")
          .replace(/[_\s]+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");
      case "pluralize":
        if (value.endsWith("s") || value.endsWith("x") || value.endsWith("z")) return value + "es";
        if (value.endsWith("y") && !/[aeiou]y$/i.test(value)) return value.slice(0, -1) + "ies";
        return value + "s";
      case "singularize":
        if (value.endsWith("ies")) return value.slice(0, -3) + "y";
        if (value.endsWith("es")) return value.slice(0, -2);
        if (value.endsWith("s")) return value.slice(0, -1);
        return value;
      default:
        return value;
    }
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split(".");
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private buildOutputPath(template: Template, data: Record<string, unknown>): string {
    const pathTemplate = this.handlebars.compile(template.output.path);
    const filenameTemplate = this.handlebars.compile(template.output.filename);

    const path = pathTemplate(data);
    const filename = filenameTemplate(data);
    const extension = template.output.extension;

    return `${path}/${filename}${extension}`;
  }
}
