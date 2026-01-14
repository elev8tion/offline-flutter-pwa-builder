import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ScreenDefinition } from '../config.js';

// Regex patterns
const CLASS_PATTERN = /class\s+(\w+)\s+extends\s+(StatefulWidget|StatelessWidget|HookWidget|ConsumerWidget|ConsumerStatefulWidget)/g;

const SCAFFOLD_PATTERN = /Scaffold\s*\(/;
const APPBAR_PATTERN = /appBar\s*:\s*AppBar/;
const BOTTOM_NAV_PATTERN = /bottomNavigationBar\s*:/;
const DRAWER_PATTERN = /drawer\s*:\s*Drawer/;
const FAB_PATTERN = /floatingActionButton\s*:/;

// Provider patterns
const RIVERPOD_WATCH = /ref\.watch\((\w+)/g;
const RIVERPOD_READ = /ref\.read\((\w+)/g;
const BLOC_PROVIDER = /BlocProvider\.of<(\w+)>/g;
const CONTEXT_READ = /context\.read<(\w+)>/g;
const CONTEXT_WATCH = /context\.watch<(\w+)>/g;

// Layout patterns
const COLUMN_PATTERN = /Column\s*\(/;
const ROW_PATTERN = /Row\s*\(/;
const STACK_PATTERN = /Stack\s*\(/;
const LISTVIEW_PATTERN = /ListView/;
const GRIDVIEW_PATTERN = /GridView/;

export interface ExtractScreenOptions {
  screenPatterns?: string[];
}

export async function extractScreens(
  projectPath: string,
  options: ExtractScreenOptions = {}
): Promise<ScreenDefinition[]> {
  const patterns = options.screenPatterns || [
    '**/screens/**/*.dart',
    '**/pages/**/*.dart',
    '**/views/**/*.dart',
    '**/presentation/**/*.dart',
    '**/*_screen.dart',
    '**/*_page.dart',
  ];

  const dartFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/.*', '**/build/**', '**/*.g.dart', '**/*.freezed.dart'],
    });
    dartFiles.push(...matches);
  }

  const uniqueFiles = [...new Set(dartFiles)];
  const screens: ScreenDefinition[] = [];

  for (const file of uniqueFiles) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const fileScreens = parseScreensFromContent(content, file);
    screens.push(...fileScreens);
  }

  return screens;
}

function parseScreensFromContent(content: string, filePath: string): ScreenDefinition[] {
  const screens: ScreenDefinition[] = [];
  CLASS_PATTERN.lastIndex = 0;

  let match;
  while ((match = CLASS_PATTERN.exec(content)) !== null) {
    const [, className, extendsType] = match;

    // Extract class body
    const classStart = match.index;
    const classBody = extractClassBody(content, classStart);

    // Only include if has Scaffold (actual screen, not just widget)
    if (!SCAFFOLD_PATTERN.test(classBody)) continue;

    const screenType = getScreenType(extendsType);
    const scaffold = analyzeScaffold(classBody);
    const providers = extractProviders(classBody);
    const widgets = extractWidgetReferences(classBody);
    const layout = detectLayout(classBody);
    const route = extractRoute(content, className);

    screens.push({
      name: className,
      filePath,
      type: screenType,
      route,
      scaffold,
      providers,
      widgets,
      layout,
    });
  }

  return screens;
}

function getScreenType(extendsType: string): ScreenDefinition['type'] {
  if (extendsType.includes('Stateful') || extendsType.includes('ConsumerStateful')) {
    return 'stateful';
  }
  if (extendsType.includes('Hook')) {
    return 'hook';
  }
  return 'stateless';
}

function analyzeScaffold(classBody: string): ScreenDefinition['scaffold'] {
  return {
    hasAppBar: APPBAR_PATTERN.test(classBody),
    hasBottomNav: BOTTOM_NAV_PATTERN.test(classBody),
    hasDrawer: DRAWER_PATTERN.test(classBody),
    hasFab: FAB_PATTERN.test(classBody),
  };
}

function extractProviders(classBody: string): string[] {
  const providers: Set<string> = new Set();

  // Riverpod patterns
  RIVERPOD_WATCH.lastIndex = 0;
  RIVERPOD_READ.lastIndex = 0;

  let match;
  while ((match = RIVERPOD_WATCH.exec(classBody)) !== null) {
    providers.add(match[1]);
  }
  while ((match = RIVERPOD_READ.exec(classBody)) !== null) {
    providers.add(match[1]);
  }

  // BLoC patterns
  BLOC_PROVIDER.lastIndex = 0;
  CONTEXT_READ.lastIndex = 0;
  CONTEXT_WATCH.lastIndex = 0;

  while ((match = BLOC_PROVIDER.exec(classBody)) !== null) {
    providers.add(match[1]);
  }
  while ((match = CONTEXT_READ.exec(classBody)) !== null) {
    providers.add(match[1]);
  }
  while ((match = CONTEXT_WATCH.exec(classBody)) !== null) {
    providers.add(match[1]);
  }

  return [...providers];
}

function extractWidgetReferences(classBody: string): string[] {
  // Extract custom widget references (PascalCase identifiers that look like widgets)
  const widgetPattern = /\b([A-Z][a-zA-Z0-9]+(?:Widget|Button|Card|Tile|Item|View|List|Form))\s*\(/g;
  const widgets: Set<string> = new Set();

  let match;
  while ((match = widgetPattern.exec(classBody)) !== null) {
    widgets.add(match[1]);
  }

  return [...widgets];
}

function detectLayout(classBody: string): ScreenDefinition['layout'] {
  if (GRIDVIEW_PATTERN.test(classBody)) return 'grid';
  if (LISTVIEW_PATTERN.test(classBody)) return 'list';
  if (STACK_PATTERN.test(classBody)) return 'stack';
  if (ROW_PATTERN.test(classBody)) return 'row';
  if (COLUMN_PATTERN.test(classBody)) return 'column';
  return 'custom';
}

function extractRoute(content: string, className: string): string | undefined {
  // Look for route annotations or definitions
  const routePatterns = [
    new RegExp(`@(?:GoRoute|Route)\\s*\\([^)]*path\\s*:\\s*['"]([^'"]+)['"]`, 'g'),
    new RegExp(`${className}[^{]*=\\s*['"]([^'"]+)['"]`, 'g'),
    new RegExp(`['"]([/\\w-]+)['"]\\s*:\\s*${className}`, 'g'),
  ];

  for (const pattern of routePatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) return match[1];
  }

  // Generate from class name
  return '/' + className.replace(/Screen$|Page$/i, '').replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
}

function extractClassBody(content: string, startIndex: number): string {
  let braceCount = 0;
  let started = false;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      started = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  return content.slice(startIndex, endIndex);
}
