/**
 * Dependency Graph System
 * Tracks dependencies between generated files and resolves imports
 */

export interface GeneratedFile {
  path: string;           // e.g., 'lib/widgets/glass_container.dart'
  content: string;        // The generated code
  dependencies: string[]; // Paths to required files
  exports: string[];      // Classes/functions this file exports
}

export interface DependencyNode {
  file: GeneratedFile;
  dependsOn: Set<string>;  // File paths this node depends on
  dependedBy: Set<string>; // File paths that depend on this node
}

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();

  /**
   * Add a generated file to the graph
   */
  addFile(file: GeneratedFile): void {
    const node: DependencyNode = {
      file,
      dependsOn: new Set(file.dependencies),
      dependedBy: new Set(),
    };

    this.nodes.set(file.path, node);

    // Update reverse dependencies
    for (const dep of file.dependencies) {
      const depNode = this.nodes.get(dep);
      if (depNode) {
        depNode.dependedBy.add(file.path);
      }
    }
  }

  /**
   * Get topologically sorted file order for building
   */
  getGenerationOrder(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (path: string) => {
      if (visited.has(path)) return;
      visited.add(path);

      const node = this.nodes.get(path);
      if (node) {
        for (const dep of node.dependsOn) {
          visit(dep);
        }
        result.push(path);
      }
    };

    for (const path of this.nodes.keys()) {
      visit(path);
    }

    return result;
  }

  /**
   * Find missing dependencies (referenced but not generated)
   */
  findMissingDependencies(): Array<{ file: string; missing: string }> {
    const missing: Array<{ file: string; missing: string }> = [];

    for (const [path, node] of this.nodes) {
      for (const dep of node.dependsOn) {
        if (!this.nodes.has(dep)) {
          missing.push({ file: path, missing: dep });
        }
      }
    }

    return missing;
  }

  /**
   * Generate import statements for a file
   */
  generateImports(filePath: string): string {
    const node = this.nodes.get(filePath);
    if (!node) return '';

    const imports: string[] = [];

    for (const depPath of node.dependsOn) {
      const depNode = this.nodes.get(depPath);
      if (depNode) {
        // Calculate relative path
        const relativePath = this.getRelativePath(filePath, depPath);
        imports.push(`import '${relativePath}';`);
      }
    }

    return imports.join('\n');
  }

  /**
   * Calculate relative import path between two files
   */
  private getRelativePath(from: string, to: string): string {
    const fromParts = from.split('/');
    const toParts = to.split('/');

    // Remove filename from 'from'
    fromParts.pop();

    // Find common prefix
    let commonLength = 0;
    while (commonLength < fromParts.length &&
           commonLength < toParts.length - 1 &&
           fromParts[commonLength] === toParts[commonLength]) {
      commonLength++;
    }

    // Build relative path
    const upCount = fromParts.length - commonLength;
    const ups = Array(upCount).fill('..');
    const downs = toParts.slice(commonLength);

    return [...ups, ...downs].join('/');
  }

  /**
   * Inject imports into generated file content
   */
  assembleFile(filePath: string): string {
    const node = this.nodes.get(filePath);
    if (!node) throw new Error(`File not found: ${filePath}`);

    const imports = this.generateImports(filePath);
    if (!imports) return node.file.content;

    // Insert imports after file header (first comment block + blank line)
    const headerMatch = node.file.content.match(/^(\/\/.*\n)*\n?/);
    const headerEnd = headerMatch ? headerMatch[0].length : 0;

    return (
      node.file.content.slice(0, headerEnd) +
      imports + '\n\n' +
      node.file.content.slice(headerEnd)
    );
  }

  /**
   * Get all files in the graph
   */
  getAllFiles(): GeneratedFile[] {
    return Array.from(this.nodes.values()).map(n => n.file);
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
  }
}

/**
 * Predefined dependency mappings for common Flutter widgets
 */
export const FLUTTER_DEPENDENCIES: Record<string, string[]> = {
  'lib/widgets/glass_container.dart': [
    'lib/widgets/noise_overlay.dart',
    'lib/theme/app_shadows.dart',
    'lib/theme/app_theme_extensions.dart',
  ],
  'lib/widgets/glass_button.dart': [
    'lib/widgets/glass_container.dart',
    'lib/theme/app_theme_extensions.dart',
  ],
  'lib/widgets/glass_bottomsheet.dart': [
    'lib/theme/app_theme_extensions.dart',
  ],
  'lib/theme/app_theme.dart': [
    'lib/theme/app_theme_extensions.dart',
    'lib/theme/app_text_shadows.dart',
  ],
};

export function createDependencyGraph(): DependencyGraph {
  return new DependencyGraph();
}
