/**
 * Flutter Version Adapter
 * Transforms generated code to use correct APIs for target Flutter version
 */

interface APIMapping {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  minVersion: string;
  description: string;
}

// API mappings organized by minimum Flutter version required
const API_MAPPINGS: APIMapping[] = [
  // Flutter 3.10+ changes
  {
    pattern: /\bCardTheme\s*\(/g,
    replacement: 'CardThemeData(',
    minVersion: '3.10.0',
    description: 'CardTheme renamed to CardThemeData',
  },
  {
    pattern: /(\w+)\.red\s*\/\s*255(?:\.0)?/g,
    replacement: '$1.r',
    minVersion: '3.10.0',
    description: 'Color components now normalized 0-1',
  },
  {
    pattern: /(\w+)\.green\s*\/\s*255(?:\.0)?/g,
    replacement: '$1.g',
    minVersion: '3.10.0',
    description: 'Color components now normalized 0-1',
  },
  {
    pattern: /(\w+)\.blue\s*\/\s*255(?:\.0)?/g,
    replacement: '$1.b',
    minVersion: '3.10.0',
    description: 'Color components now normalized 0-1',
  },
  // Flutter 3.29+ changes
  {
    pattern: /\.withOpacity\s*\(\s*([\d.]+)\s*\)/g,
    replacement: '.withValues(alpha: $1)',
    minVersion: '3.29.0',
    description: 'withOpacity deprecated in favor of withValues',
  },
];

/**
 * Compare semantic versions
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 !== p2) return p1 - p2;
  }
  return 0;
}

/**
 * Adapt template/code for target Flutter version
 */
export function adaptForFlutterVersion(code: string, targetVersion: string): string {
  let adapted = code;

  for (const mapping of API_MAPPINGS) {
    if (compareVersions(targetVersion, mapping.minVersion) >= 0) {
      if (typeof mapping.replacement === 'string') {
        adapted = adapted.replace(mapping.pattern, mapping.replacement);
      } else {
        adapted = adapted.replace(mapping.pattern, mapping.replacement);
      }
    }
  }

  return adapted;
}

/**
 * Get list of API changes applied for a version
 */
export function getAPIChangesForVersion(targetVersion: string): string[] {
  return API_MAPPINGS
    .filter(m => compareVersions(targetVersion, m.minVersion) >= 0)
    .map(m => m.description);
}

export { API_MAPPINGS };
