import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { WidgetDefinition, FieldDefinition } from '../config.js';

const CLASS_PATTERN = /class\s+(\w+)\s+extends\s+(StatefulWidget|StatelessWidget|HookWidget|ConsumerWidget)/g;
const SCAFFOLD_PATTERN = /Scaffold\s*\(/;

export interface ExtractWidgetOptions {
  widgetPatterns?: string[];
}

export async function extractWidgets(
  projectPath: string,
  options: ExtractWidgetOptions = {}
): Promise<WidgetDefinition[]> {
  const patterns = options.widgetPatterns || [
    '**/widgets/**/*.dart',
    '**/components/**/*.dart',
    '**/shared/**/*.dart',
    '**/common/**/*.dart',
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
  const widgets: WidgetDefinition[] = [];

  for (const file of uniqueFiles) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const fileWidgets = parseWidgetsFromContent(content, file);
    widgets.push(...fileWidgets);
  }

  return widgets;
}

function parseWidgetsFromContent(content: string, filePath: string): WidgetDefinition[] {
  const widgets: WidgetDefinition[] = [];
  CLASS_PATTERN.lastIndex = 0;

  let match;
  while ((match = CLASS_PATTERN.exec(content)) !== null) {
    const [, className, extendsType] = match;

    const classStart = match.index;
    const classBody = extractClassBody(content, classStart);

    // Skip screens (have Scaffold)
    if (SCAFFOLD_PATTERN.test(classBody)) continue;

    const widgetType = getWidgetType(extendsType);
    const props = extractProps(classBody, className);

    widgets.push({
      name: className,
      filePath,
      type: widgetType,
      props,
      isReusable: props.length > 0,
    });
  }

  return widgets;
}

function getWidgetType(extendsType: string): WidgetDefinition['type'] {
  if (extendsType.includes('Stateful')) return 'stateful';
  if (extendsType.includes('Hook')) return 'hook';
  return 'stateless';
}

function extractProps(classBody: string, className: string): FieldDefinition[] {
  const props: FieldDefinition[] = [];

  // Look for constructor with named parameters
  const constructorMatch = classBody.match(new RegExp(`(?:const\\s+)?${className}\\s*\\(\\s*\\{([^}]*)\\}`));
  if (!constructorMatch) return props;

  const params = constructorMatch[1];

  // Parse each parameter
  const paramLines = params.split(',').map(s => s.trim()).filter(Boolean);

  for (const line of paramLines) {
    // Match: required this.name or this.name or Type name or required Type name
    const typeMatch = line.match(/(?:required\s+)?(?:this\.)?(\w+)\s*(?:=|,|$)/);
    if (typeMatch) {
      const name = typeMatch[1];
      if (name === 'key' || name === 'super') continue;

      // Try to find the field declaration for type
      const fieldMatch = classBody.match(new RegExp(`final\\s+([\\w<>,?\\s]+)\\s+${name}\\s*;`));
      const type = fieldMatch ? fieldMatch[1].trim() : 'dynamic';

      props.push({
        name,
        type: type.replace('?', ''),
        nullable: type.endsWith('?') || line.includes('?') || !line.includes('required'),
        annotations: [],
      });
    }
  }

  return props;
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
