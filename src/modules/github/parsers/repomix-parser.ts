/**
 * Repomix Parser
 *
 * Parses repomix-style text files that contain flattened repository exports.
 * Format:
 *   Directory structure:
 *   └── project/
 *       ├── file1.dart
 *       └── folder/
 *           └── file2.dart
 *
 *   ================================================
 *   FILE: path/to/file.dart
 *   ================================================
 *   <file contents>
 *
 *   ================================================
 *   FILE: path/to/another.dart
 *   ================================================
 *   <file contents>
 */

export interface ParsedFile {
  path: string;
  content: string;
}

export interface RepomixParseResult {
  projectName: string;
  directoryStructure: string[];
  files: ParsedFile[];
  dartFiles: ParsedFile[];
  pubspecContent?: string;
}

const DIRECTORY_STRUCTURE_START = 'Directory structure:';

export function parseRepomixFile(content: string): RepomixParseResult {
  const lines = content.split('\n');
  const files: ParsedFile[] = [];
  const directoryStructure: string[] = [];

  // Extract directory structure (everything before first FILE: marker)
  let inDirectorySection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(DIRECTORY_STRUCTURE_START)) {
      inDirectorySection = true;
      continue;
    }

    if (inDirectorySection) {
      if (line.startsWith('='.repeat(48))) {
        break;
      }
      if (line.trim()) {
        directoryStructure.push(line);
      }
    }
  }

  // Extract project name from directory structure
  let projectName = 'unknown-project';
  if (directoryStructure.length > 0) {
    // First line usually contains root folder like "└── project-name/"
    const firstLine = directoryStructure[0];
    const match = firstLine.match(/[└├]── ([^/]+)\/?/);
    if (match) {
      projectName = match[1].replace(/-/g, '_').toLowerCase();
    }
  }

  // Parse files using regex to find FILE: markers
  // Format is:
  //   ================================================
  //   FILE: path/to/file
  //   ================================================
  //   <content>
  // So segments alternate: [empty, "FILE: xxx", content, "FILE: yyy", content, ...]
  const fileContent = content.slice(content.indexOf('='.repeat(48)));
  const segments = fileContent.split(/={48}\n/);

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i].trim();

    // Check if this segment is a FILE: marker
    if (segment.startsWith('FILE: ')) {
      // The file path is the rest of this segment
      const filePath = segment.slice(6).trim();

      // The content is the NEXT segment
      if (i + 1 < segments.length) {
        let fileContentStr = segments[i + 1];

        // Remove any leading/trailing whitespace but preserve internal formatting
        // Also handle case where content might end with the next FILE: marker
        const nextFileMarkerIndex = fileContentStr.indexOf('\nFILE: ');
        if (nextFileMarkerIndex !== -1) {
          fileContentStr = fileContentStr.slice(0, nextFileMarkerIndex);
        }

        files.push({
          path: filePath,
          content: fileContentStr.trim(),
        });

        // Skip the content segment since we already processed it
        i++;
      }
    }
  }

  // Filter Dart files
  const dartFiles = files.filter(f => f.path.endsWith('.dart'));

  // Find pubspec.yaml
  const pubspecFile = files.find(f => f.path.endsWith('pubspec.yaml'));

  return {
    projectName,
    directoryStructure,
    files,
    dartFiles,
    pubspecContent: pubspecFile?.content,
  };
}

/**
 * Get file content by path pattern
 */
export function getFilesByPattern(result: RepomixParseResult, pattern: RegExp): ParsedFile[] {
  return result.files.filter(f => pattern.test(f.path));
}

/**
 * Get Dart files in a specific folder
 */
export function getDartFilesInFolder(result: RepomixParseResult, folder: string): ParsedFile[] {
  return result.dartFiles.filter(f => f.path.includes(`/${folder}/`) || f.path.startsWith(`${folder}/`));
}

/**
 * Extract models from parsed repomix result
 */
export function getModelFiles(result: RepomixParseResult): ParsedFile[] {
  return result.dartFiles.filter(f =>
    (f.path.includes('/models/') ||
     f.path.includes('/entities/') ||
     f.path.includes('/domain/entities/') ||
     f.path.includes('/data/models/') ||
     f.path.endsWith('_model.dart') ||
     f.path.endsWith('_entity.dart')) &&
    !f.path.endsWith('.g.dart') &&
    !f.path.endsWith('.freezed.dart')
  );
}

/**
 * Extract screen files from parsed repomix result
 */
export function getScreenFiles(result: RepomixParseResult): ParsedFile[] {
  return result.dartFiles.filter(f =>
    f.path.includes('/screens/') ||
    f.path.includes('/pages/') ||
    f.path.includes('/views/') ||
    f.path.includes('/presentation/') ||
    f.path.endsWith('_screen.dart') ||
    f.path.endsWith('_page.dart')
  );
}

/**
 * Extract provider/state files from parsed repomix result
 */
export function getStateFiles(result: RepomixParseResult): ParsedFile[] {
  return result.dartFiles.filter(f =>
    f.path.includes('/providers/') ||
    f.path.includes('/blocs/') ||
    f.path.includes('/cubits/') ||
    f.path.includes('/riverpod/') ||
    f.path.includes('/state/') ||
    f.path.endsWith('_provider.dart') ||
    f.path.endsWith('_bloc.dart') ||
    f.path.endsWith('_cubit.dart')
  );
}

/**
 * Extract widget files from parsed repomix result
 */
export function getWidgetFiles(result: RepomixParseResult): ParsedFile[] {
  return result.dartFiles.filter(f =>
    f.path.includes('/widgets/') ||
    f.path.includes('/components/') ||
    f.path.endsWith('_widget.dart')
  );
}
