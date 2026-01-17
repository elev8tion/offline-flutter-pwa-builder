/**
 * Dart Model/Entity Class Extractor
 *
 * Extracts model classes from Dart files using regex patterns.
 * Parses class definitions, fields, annotations, and relationships.
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { ModelDefinition, FieldDefinition } from '../config.js';

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Matches Dart class definitions with annotations, extends, with, and implements clauses
 */
const CLASS_PATTERN = /^(?:@\w+(?:\([^)]*\))?[\s\n]*)*(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+with\s+([\w,\s]+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/gm;

/**
 * Matches field declarations with annotations, modifiers, type, name, and default value
 */
const FIELD_PATTERN = /^\s*(?:@\w+(?:\([^)]*\))?[\s\n]*)*(?:final\s+|const\s+|late\s+|static\s+)*([\w<>,?\s]+)\s+(\w+)(?:\s*=\s*([^;]+))?;/gm;

/**
 * Matches Dart annotations with optional parameters
 */
const ANNOTATION_PATTERN = /@(\w+)(?:\(([^)]*)\))?/g;

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExtractOptions {
  includeAbstract?: boolean;
  modelPatterns?: string[];  // Glob patterns for finding model files
}

// ============================================================================
// MAIN EXTRACTOR
// ============================================================================

/**
 * Extract model definitions from a Flutter project
 *
 * Searches for Dart files matching model patterns and parses them to extract:
 * - Class definitions with annotations
 * - Field declarations with types and defaults
 * - Relationships (hasOne, hasMany, belongsTo)
 * - Immutability and JSON serialization indicators
 *
 * @param projectPath - Root path of the Flutter project
 * @param options - Extraction options
 * @returns Array of model definitions
 *typescript
 * const modelList = await extractModels('/path/to/flutter/project', {
 *   includeAbstract: false
 * });
 * ```
 */
export async function extractModels(
  projectPath: string,
  options: ExtractOptions = {}
): Promise<ModelDefinition[]> {
  const { includeAbstract = false, modelPatterns } = options;

  // Find Dart files using glob patterns
  const patterns = modelPatterns || [
    '**/models/**/*.dart',
    '**/entities/**/*.dart',
    '**/domain/**/*.dart',
    '**/*_model.dart',
    '**/*_entity.dart',
  ];

  const dartFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/.*', '**/build/**', '**/*.g.dart', '**/*.freezed.dart'],
    });
    dartFiles.push(...matches);
  }

  // Deduplicate files
  const uniqueFiles = [...new Set(dartFiles)];

  const models: ModelDefinition[] = [];

  for (const file of uniqueFiles) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const fileModels = parseModelsFromContent(content, file, includeAbstract);
    models.push(...fileModels);
  }

  return models;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse model definitions from Dart file content
 *
 * @param content - File content to parse
 * @param filePath - Relative path to the file
 * @param includeAbstract - Whether to include abstract classes
 * @returns Array of model definitions found in the file
 */
function parseModelsFromContent(
  content: string,
  filePath: string,
  includeAbstract: boolean
): ModelDefinition[] {
  const models: ModelDefinition[] = [];

  // Reset regex
  CLASS_PATTERN.lastIndex = 0;

  let match;
  while ((match = CLASS_PATTERN.exec(content)) !== null) {
    const [fullMatch, className, extendsClass] = match;

    // Skip abstract unless requested
    if (!includeAbstract && fullMatch.includes('abstract')) continue;

    // Skip widgets and other non-model classes
    if (isWidgetClass(className, extendsClass)) continue;

    // Extract class body
    const classStart = match.index;
    const classBody = extractClassBody(content, classStart);

    // Parse fields
    const fields = parseFields(classBody);

    // Parse annotations
    const annotations = parseAnnotations(fullMatch);

    // Detect relationships
    const relationships = detectRelationships(fields);

    models.push({
      name: className,
      filePath,
      fields,
      annotations,
      relationships,
      isImmutable: annotations.includes('freezed') || annotations.includes('immutable'),
      hasJson: annotations.includes('JsonSerializable') ||
               classBody.includes('fromJson') ||
               classBody.includes('toJson'),
    });
  }

  return models;
}

/**
 * Check if a class is a widget class (should be excluded from models)
 *
 * @param _className - Name of the class (unused, kept for signature consistency)
 * @param extendsClass - Name of the base class (if any)
 * @returns True if the class is a widget
 */
function isWidgetClass(_className: string, extendsClass?: string): boolean {
  if (!extendsClass) return false;
  const widgetBases = ['StatefulWidget', 'StatelessWidget', 'HookWidget', 'ConsumerWidget', 'Widget'];
  return widgetBases.some(base => extendsClass.includes(base));
}

/**
 * Extract the body of a class (everything between the opening and closing braces)
 *
 * Uses brace counting to handle nested braces correctly.
 *
 * @param content - Full file content
 * @param startIndex - Index where the class definition starts
 * @returns The class body as a string
 */
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

/**
 * Parse field definitions from class body
 *
 * Extracts field declarations with types, nullability, default values, and annotations.
 * Skips static fields.
 *
 * @param classBody - The class body content
 * @returns Array of field definitions
 */
function parseFields(classBody: string): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  FIELD_PATTERN.lastIndex = 0;

  let match;
  while ((match = FIELD_PATTERN.exec(classBody)) !== null) {
    const [fullMatch, type, name, defaultValue] = match;

    // Skip static fields
    if (fullMatch.includes('static')) continue;

    const cleanType = type.trim();
    const nullable = cleanType.endsWith('?');

    fields.push({
      name,
      type: cleanType.replace('?', ''),
      nullable,
      defaultValue: defaultValue?.trim(),
      annotations: parseAnnotations(fullMatch),
    });
  }

  return fields;
}

function parseAnnotations(text: string): string[] {
  const annotations: string[] = [];
  ANNOTATION_PATTERN.lastIndex = 0;

  let match;
  while ((match = ANNOTATION_PATTERN.exec(text)) !== null) {
    annotations.push(match[1]);
  }

  return annotations;
}

function detectRelationships(fields: FieldDefinition[]): ModelDefinition['relationships'] {
  const relationships: ModelDefinition['relationships'] = [];

  for (const field of fields) {
    const type = field.type;

    // Detect List<OtherModel> -> hasMany
    const listMatch = type.match(/List<(\w+)>/);
    if (listMatch && isModelType(listMatch[1])) {
      relationships.push({
        type: 'hasMany',
        target: listMatch[1],
        fieldName: field.name,
      });
      continue;
    }

    // Detect OtherModel -> hasOne
    if (isModelType(type)) {
      relationships.push({
        type: 'hasOne',
        target: type,
        fieldName: field.name,
      });
    }
  }

  return relationships;
}

function isModelType(typeName: string): boolean {
  // Exclude built-in types
  const builtIns = ['String', 'int', 'double', 'bool', 'DateTime', 'dynamic', 'Object', 'Map', 'Set'];
  return !builtIns.includes(typeName) && /^[A-Z]/.test(typeName);
}
