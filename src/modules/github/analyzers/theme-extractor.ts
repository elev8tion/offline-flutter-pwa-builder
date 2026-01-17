import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

export interface ThemeInfo {
  useMaterial: boolean;
  useCupertino: boolean;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  colors: Record<string, string>;
  hasCustomTheme: boolean;
  themeFilePath?: string;
}

export async function extractTheme(projectPath: string): Promise<ThemeInfo> {
  const themeInfo: ThemeInfo = {
    useMaterial: false,
    useCupertino: false,
    colors: {},
    hasCustomTheme: false,
  };

  // Find theme files
  const patterns = [
    '**/theme/**/*.dart',
    '**/themes/**/*.dart',
    '**/core/theme*.dart',
    '**/app_theme.dart',
    '**/theme.dart',
  ];

  let themeFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/.*', '**/build/**'],
    });
    themeFiles.push(...matches);
  }

  // Also check main.dart for theme
  const mainPath = path.join(projectPath, 'lib', 'main.dart');
  if (await fs.pathExists(mainPath)) {
    const mainContent = await fs.readFile(mainPath, 'utf-8');
    analyzeThemeContent(mainContent, themeInfo);
  }

  // Analyze theme files
  for (const file of themeFiles) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    analyzeThemeContent(content, themeInfo);
    themeInfo.themeFilePath = file;
    themeInfo.hasCustomTheme = true;
  }

  return themeInfo;
}

function analyzeThemeContent(content: string, themeInfo: ThemeInfo): void {
  // Detect Material/Cupertino
  if (content.includes('MaterialApp') || content.includes('ThemeData')) {
    themeInfo.useMaterial = true;
  }
  if (content.includes('CupertinoApp') || content.includes('CupertinoThemeData')) {
    themeInfo.useCupertino = true;
  }

  // Extract colors
  const colorPatterns = [
    /primaryColor\s*:\s*(?:Color\s*\()?(?:0x)?([0-9A-Fa-f]{6,8})/g,
    /primarySwatch\s*:\s*Colors\.(\w+)/g,
    /Color\s*\((?:0x)?([0-9A-Fa-f]{6,8})\)/g,
  ];

  for (const pattern of colorPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        const colorValue = match[1].startsWith('0x') ? match[1] : `0xFF${match[1]}`;
        if (content.includes('primaryColor')) {
          themeInfo.primaryColor = colorValue;
        }
      }
    }
  }

  // Extract font family
  const fontMatch = content.match(/fontFamily\s*:\s*['"](\w+)['"]/);
  if (fontMatch) {
    themeInfo.fontFamily = fontMatch[1];
  }

  // Extract named colors
  const namedColorPattern = /static\s+(?:final\s+)?Color\s+(\w+)\s*=\s*(?:Color\s*\()?(?:0x)?([0-9A-Fa-f]{6,8})/g;
  let namedMatch;
  while ((namedMatch = namedColorPattern.exec(content)) !== null) {
    themeInfo.colors[namedMatch[1]] = namedMatch[2];
  }
}
