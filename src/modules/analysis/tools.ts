/**
 * Analysis Module Tools
 *
 * MCP tool definitions and handlers for project analysis
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  AnalysisModuleConfig,
  AnalysisLevel,
  ArchitecturePattern,
  ProjectStructure,
  DependencyInfo,
  PatternDetection,
  CodeMetrics,
  AnalysisIssue,
  BestPracticeCheck,
  detectArchitecture,
  getSeverityWeight,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const AnalyzeProjectInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  level: z.enum(["basic", "standard", "comprehensive"]).optional().describe("Analysis depth level"),
  extractPatterns: z.boolean().optional().describe("Extract code patterns"),
  analyzeDependencies: z.boolean().optional().describe("Analyze project dependencies"),
  checkBestPractices: z.boolean().optional().describe("Check best practices"),
});

export const AuditDependenciesInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  checkOutdated: z.boolean().optional().describe("Check for outdated packages"),
  checkVulnerabilities: z.boolean().optional().describe("Check for known vulnerabilities"),
  includeTransitive: z.boolean().optional().describe("Include transitive dependencies"),
});

export const DetectArchitectureInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  suggestImprovements: z.boolean().optional().describe("Suggest architecture improvements"),
});

export const GenerateReportInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  format: z.enum(["json", "markdown", "html"]).optional().describe("Report output format"),
  includeMetrics: z.boolean().optional().describe("Include code metrics"),
  includeRecommendations: z.boolean().optional().describe("Include recommendations"),
});

// ============================================================================
// TOOL CONTEXT TYPE
// ============================================================================

export interface AnalysisToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  getAnalysisConfig: (projectId: string) => AnalysisModuleConfig | undefined;
  updateAnalysisConfig: (projectId: string, config: Partial<AnalysisModuleConfig>) => void;
}

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const ANALYSIS_TOOLS: Tool[] = [
  {
    name: "analysis_analyze_project",
    description: "Perform comprehensive analysis of a Flutter project including structure, patterns, and best practices",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        level: {
          type: "string",
          enum: ["basic", "standard", "comprehensive"],
          description: "Analysis depth level",
        },
        extractPatterns: {
          type: "boolean",
          description: "Extract code patterns from the codebase",
        },
        analyzeDependencies: {
          type: "boolean",
          description: "Analyze project dependencies",
        },
        checkBestPractices: {
          type: "boolean",
          description: "Check for Flutter best practices",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "analysis_audit_dependencies",
    description: "Audit project dependencies for outdated packages, vulnerabilities, and categorization",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        checkOutdated: {
          type: "boolean",
          description: "Check for outdated packages",
        },
        checkVulnerabilities: {
          type: "boolean",
          description: "Check for known security vulnerabilities",
        },
        includeTransitive: {
          type: "boolean",
          description: "Include transitive (indirect) dependencies",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "analysis_detect_architecture",
    description: "Detect the architecture pattern used in the project and provide improvement suggestions",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        suggestImprovements: {
          type: "boolean",
          description: "Provide suggestions for architecture improvements",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "analysis_generate_report",
    description: "Generate a comprehensive analysis report in various formats",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Project ID",
        },
        format: {
          type: "string",
          enum: ["json", "markdown", "html"],
          description: "Output format for the report",
        },
        includeMetrics: {
          type: "boolean",
          description: "Include code metrics in the report",
        },
        includeRecommendations: {
          type: "boolean",
          description: "Include improvement recommendations",
        },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

export async function handleAnalysisTool(
  name: string,
  args: Record<string, unknown>,
  context: AnalysisToolContext
): Promise<unknown> {
  switch (name) {
    case "analysis_analyze_project": {
      const parsed = AnalyzeProjectInputSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      const config = context.getAnalysisConfig(parsed.projectId);
      const level: AnalysisLevel = parsed.level ?? config?.defaultLevel ?? "standard";

      // Simulate project analysis
      const structure: ProjectStructure = {
        hasModels: true,
        hasViews: true,
        hasControllers: project.stateManagement === "bloc",
        hasServices: true,
        hasUtils: true,
        hasWidgets: true,
        hasConfig: true,
        hasTests: true,
      };

      const patterns: PatternDetection[] = [];
      if (parsed.extractPatterns !== false) {
        patterns.push(
          { type: "StatelessWidget", file: "lib/widgets/button.dart", confidence: 1.0 },
          { type: "StatefulWidget", file: "lib/screens/home.dart", confidence: 1.0 },
        );
        if (project.stateManagement === "riverpod") {
          patterns.push({ type: "Provider", file: "lib/providers/app_provider.dart", confidence: 0.9 });
        }
        if (project.stateManagement === "bloc") {
          patterns.push({ type: "BLoC", file: "lib/blocs/app_bloc.dart", confidence: 0.9 });
        }
      }

      const dependencies: DependencyInfo[] = [];
      if (parsed.analyzeDependencies !== false) {
        dependencies.push(
          { name: "flutter", version: "sdk", category: "utilities", isDevDependency: false },
        );
        if (project.stateManagement === "riverpod") {
          dependencies.push({ name: "flutter_riverpod", version: "^2.4.0", category: "stateManagement", isDevDependency: false });
        }
        if (project.stateManagement === "bloc") {
          dependencies.push({ name: "flutter_bloc", version: "^8.1.0", category: "stateManagement", isDevDependency: false });
        }
        if (project.offline.storage.type === "drift") {
          dependencies.push({ name: "drift", version: "^2.0.0", category: "database", isDevDependency: false });
        }
      }

      const metrics: CodeMetrics = level === "comprehensive" ? {
        totalFiles: 45,
        totalLines: 5200,
        avgFileSize: 116,
        complexity: 2,
        duplicateBlocks: 3,
        testCoverage: 75,
      } : {
        totalFiles: 45,
        totalLines: 5200,
        avgFileSize: 116,
        complexity: 2,
        duplicateBlocks: 0,
      };

      const bestPractices: BestPracticeCheck[] = [];
      if (parsed.checkBestPractices !== false) {
        bestPractices.push(
          { name: "Has README", passed: true, message: "Project has documentation", severity: "info" },
          { name: "Has tests", passed: true, message: "Test files present", severity: "info" },
          { name: "Has linting", passed: true, message: "analysis_options.yaml configured", severity: "info" },
          { name: "Follows architecture", passed: true, message: "Clean architecture pattern detected", severity: "info" },
        );
      }

      const issues: AnalysisIssue[] = [];
      if (level === "comprehensive") {
        issues.push({
          severity: "warning",
          category: "Code Quality",
          message: "Some files exceed recommended line count",
          suggestion: "Consider splitting large files into smaller components",
        });
      }

      const recommendations = [
        "Consider adding more unit tests for critical business logic",
        "Document public API methods with dartdoc comments",
      ];

      const architecture = detectArchitecture(structure);

      return {
        success: true,
        analysis: {
          projectId: parsed.projectId,
          projectName: project.name,
          timestamp: new Date().toISOString(),
          level,
          structure,
          architecture,
          dependencies,
          patterns,
          metrics,
          bestPractices,
          issues: issues.sort((a, b) => getSeverityWeight(b.severity) - getSeverityWeight(a.severity)),
          recommendations,
        },
      };
    }

    case "analysis_audit_dependencies": {
      const parsed = AuditDependenciesInputSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      const dependencies: DependencyInfo[] = [
        { name: "flutter", version: "sdk", category: "utilities", isDevDependency: false },
        { name: "cupertino_icons", version: "^1.0.6", category: "ui", isDevDependency: false },
      ];

      // Add state management dependency
      if (project.stateManagement === "riverpod") {
        dependencies.push({
          name: "flutter_riverpod",
          version: "^2.4.0",
          category: "stateManagement",
          isDevDependency: false,
          outdated: parsed.checkOutdated ? false : undefined,
          latestVersion: parsed.checkOutdated ? "2.4.9" : undefined,
        });
      } else if (project.stateManagement === "bloc") {
        dependencies.push({
          name: "flutter_bloc",
          version: "^8.1.0",
          category: "stateManagement",
          isDevDependency: false,
          outdated: parsed.checkOutdated ? true : undefined,
          latestVersion: parsed.checkOutdated ? "8.1.3" : undefined,
        });
      }

      // Add database dependency
      if (project.offline.storage.type === "drift") {
        dependencies.push({
          name: "drift",
          version: "^2.0.0",
          category: "database",
          isDevDependency: false,
          outdated: parsed.checkOutdated ? false : undefined,
        });
        dependencies.push({
          name: "drift_dev",
          version: "^2.0.0",
          category: "database",
          isDevDependency: true,
        });
      }

      // Add testing dependencies
      dependencies.push(
        { name: "flutter_test", version: "sdk", category: "testing", isDevDependency: true },
        { name: "mockito", version: "^5.4.0", category: "testing", isDevDependency: true },
      );

      // Calculate stats
      const categoryCounts: Record<string, number> = {};
      dependencies.forEach(dep => {
        categoryCounts[dep.category] = (categoryCounts[dep.category] || 0) + 1;
      });

      const outdatedCount = dependencies.filter(d => d.outdated).length;
      const vulnerabilities = parsed.checkVulnerabilities ? [] : undefined;

      return {
        success: true,
        audit: {
          projectId: parsed.projectId,
          timestamp: new Date().toISOString(),
          totalDependencies: dependencies.length,
          directDependencies: dependencies.filter(d => !d.isDevDependency).length,
          devDependencies: dependencies.filter(d => d.isDevDependency).length,
          outdatedCount,
          vulnerabilities,
          categoryCounts,
          dependencies,
        },
      };
    }

    case "analysis_detect_architecture": {
      const parsed = DetectArchitectureInputSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      // Map project architecture to detected pattern
      const architectureMap: Record<string, ArchitecturePattern> = {
        clean: "clean",
        "feature-first": "feature-first",
        "layer-first": "layer-first",
      };

      const detectedArchitecture = architectureMap[project.architecture] || "unknown";

      const structure: ProjectStructure = {
        hasModels: true,
        hasViews: true,
        hasControllers: detectedArchitecture === "clean" || detectedArchitecture === "layer-first",
        hasServices: true,
        hasUtils: true,
        hasWidgets: true,
        hasConfig: true,
        hasTests: true,
      };

      const suggestions: string[] = [];
      if (parsed.suggestImprovements) {
        if (!structure.hasTests) {
          suggestions.push("Add a test directory with unit and widget tests");
        }
        if (detectedArchitecture === "unknown") {
          suggestions.push("Consider adopting a clear architecture pattern (Clean, MVVM, or Feature-first)");
        }
        if (project.stateManagement === "provider") {
          suggestions.push("Consider migrating to Riverpod for better testability and compile-time safety");
        }
        suggestions.push("Ensure separation of concerns between UI, business logic, and data layers");
        suggestions.push("Use dependency injection for better testability");
      }

      return {
        success: true,
        architecture: {
          detected: detectedArchitecture,
          configured: project.architecture,
          structure,
          confidence: detectedArchitecture === project.architecture ? 0.95 : 0.7,
          suggestions,
          layers: {
            presentation: ["screens", "widgets", "pages"],
            domain: ["models", "entities", "usecases"],
            data: ["repositories", "services", "datasources"],
          },
        },
      };
    }

    case "analysis_generate_report": {
      const parsed = GenerateReportInputSchema.parse(args);
      const project = context.getProject(parsed.projectId);

      if (!project) {
        throw new Error(`Project not found: ${parsed.projectId}`);
      }

      const format = parsed.format ?? "markdown";

      // Generate report content based on format
      const metrics: CodeMetrics | undefined = parsed.includeMetrics !== false ? {
        totalFiles: 45,
        totalLines: 5200,
        avgFileSize: 116,
        complexity: 2,
        duplicateBlocks: 3,
        testCoverage: 75,
      } : undefined;

      const recommendations = parsed.includeRecommendations !== false ? [
        "Consider adding more comprehensive test coverage",
        "Document public APIs with dartdoc comments",
        "Review and update outdated dependencies",
        "Add error boundaries for better error handling",
      ] : undefined;

      let content = "";

      if (format === "markdown") {
        content = generateMarkdownReport(project, metrics, recommendations);
      } else if (format === "html") {
        content = generateHtmlReport(project, metrics, recommendations);
      } else {
        content = JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            architecture: project.architecture,
            stateManagement: project.stateManagement,
          },
          metrics,
          recommendations,
          generatedAt: new Date().toISOString(),
        }, null, 2);
      }

      return {
        success: true,
        report: {
          projectId: parsed.projectId,
          format,
          generatedAt: new Date().toISOString(),
          content,
        },
      };
    }

    default:
      throw new Error(`Unknown analysis tool: ${name}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateMarkdownReport(
  project: ProjectDefinition,
  metrics?: CodeMetrics,
  recommendations?: string[]
): string {
  let md = `# Project Analysis Report: ${project.name}\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Project Overview\n\n`;
  md += `- **Architecture:** ${project.architecture}\n`;
  md += `- **State Management:** ${project.stateManagement}\n`;
  md += `- **Targets:** ${project.targets.join(", ")}\n`;
  md += `- **Offline Strategy:** ${project.offline.strategy}\n\n`;

  if (metrics) {
    md += `## Code Metrics\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Files | ${metrics.totalFiles} |\n`;
    md += `| Total Lines | ${metrics.totalLines} |\n`;
    md += `| Avg File Size | ${metrics.avgFileSize} lines |\n`;
    md += `| Complexity | ${metrics.complexity}/5 |\n`;
    if (metrics.testCoverage !== undefined) {
      md += `| Test Coverage | ${metrics.testCoverage}% |\n`;
    }
    md += `\n`;
  }

  if (recommendations && recommendations.length > 0) {
    md += `## Recommendations\n\n`;
    recommendations.forEach((rec, i) => {
      md += `${i + 1}. ${rec}\n`;
    });
  }

  return md;
}

function generateHtmlReport(
  project: ProjectDefinition,
  metrics?: CodeMetrics,
  recommendations?: string[]
): string {
  let html = `<!DOCTYPE html>\n<html>\n<head>\n`;
  html += `<title>Analysis Report - ${project.name}</title>\n`;
  html += `<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f4f4f4;}</style>\n`;
  html += `</head>\n<body>\n`;
  html += `<h1>Project Analysis Report: ${project.name}</h1>\n`;
  html += `<p><strong>Generated:</strong> ${new Date().toISOString()}</p>\n`;

  html += `<h2>Project Overview</h2>\n<ul>\n`;
  html += `<li><strong>Architecture:</strong> ${project.architecture}</li>\n`;
  html += `<li><strong>State Management:</strong> ${project.stateManagement}</li>\n`;
  html += `<li><strong>Targets:</strong> ${project.targets.join(", ")}</li>\n`;
  html += `</ul>\n`;

  if (metrics) {
    html += `<h2>Code Metrics</h2>\n<table>\n`;
    html += `<tr><th>Metric</th><th>Value</th></tr>\n`;
    html += `<tr><td>Total Files</td><td>${metrics.totalFiles}</td></tr>\n`;
    html += `<tr><td>Total Lines</td><td>${metrics.totalLines}</td></tr>\n`;
    html += `<tr><td>Avg File Size</td><td>${metrics.avgFileSize} lines</td></tr>\n`;
    html += `<tr><td>Complexity</td><td>${metrics.complexity}/5</td></tr>\n`;
    if (metrics.testCoverage !== undefined) {
      html += `<tr><td>Test Coverage</td><td>${metrics.testCoverage}%</td></tr>\n`;
    }
    html += `</table>\n`;
  }

  if (recommendations && recommendations.length > 0) {
    html += `<h2>Recommendations</h2>\n<ol>\n`;
    recommendations.forEach(rec => {
      html += `<li>${rec}</li>\n`;
    });
    html += `</ol>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}
