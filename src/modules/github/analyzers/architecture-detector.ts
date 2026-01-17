import fs from 'fs-extra';
import * as path from 'path';
import { FolderNode } from '../config.js';

export type Architecture = 'clean' | 'feature-first' | 'layer-first' | 'custom';

export interface ArchitectureResult {
  detected: Architecture;
  confidence: number;  // 0-100
  structure: FolderNode;
  reasoning: string[];
}

// Detection patterns
const CLEAN_ARCH_FOLDERS = ['domain', 'data', 'presentation'];

const FEATURE_FIRST_PATTERN = /^(features|modules)$/;
const FEATURE_SUBFOLDERS = ['data', 'domain', 'presentation', 'screens', 'widgets'];

const LAYER_FIRST_FOLDERS = ['models', 'views', 'controllers', 'services'];
const LAYER_FIRST_ALT = ['screens', 'pages', 'providers', 'repositories', 'widgets'];

export async function detectArchitecture(libPath: string): Promise<ArchitectureResult> {
  const structure = await buildFolderTree(libPath);
  const topLevelFolders = await getTopLevelFolders(libPath);
  const reasoning: string[] = [];

  // Check for clean architecture
  const cleanScore = detectCleanArchitecture(topLevelFolders, libPath, reasoning);

  // Check for feature-first
  const featureScore = await detectFeatureFirst(topLevelFolders, libPath, reasoning);

  // Check for layer-first
  const layerScore = detectLayerFirst(topLevelFolders, reasoning);

  // Determine winner
  const scores = [
    { arch: 'clean' as Architecture, score: cleanScore },
    { arch: 'feature-first' as Architecture, score: featureScore },
    { arch: 'layer-first' as Architecture, score: layerScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const winner = scores[0];

  // If no clear winner, mark as custom
  if (winner.score < 40) {
    return {
      detected: 'custom',
      confidence: 100 - winner.score,
      structure,
      reasoning: [...reasoning, 'No clear architecture pattern detected'],
    };
  }

  return {
    detected: winner.arch,
    confidence: winner.score,
    structure,
    reasoning,
  };
}

function detectCleanArchitecture(
  folders: string[],
  _libPath: string,
  reasoning: string[]
): number {
  let score = 0;
  const found = CLEAN_ARCH_FOLDERS.filter(f => folders.includes(f));

  if (found.length >= 2) {
    score += 40;
    reasoning.push(`Found clean arch folders: ${found.join(', ')}`);
  }

  if (found.length === 3) {
    score += 30;
    reasoning.push('All three clean architecture layers present');
  }

  return Math.min(score, 100);
}

async function detectFeatureFirst(
  folders: string[],
  libPath: string,
  reasoning: string[]
): Promise<number> {
  let score = 0;

  const featureFolder = folders.find(f => FEATURE_FIRST_PATTERN.test(f));
  if (featureFolder) {
    score += 30;
    reasoning.push(`Found features folder: ${featureFolder}`);

    // Check feature subfolders
    const featuresPath = path.join(libPath, featureFolder);
    const features = await getTopLevelFolders(featuresPath);

    if (features.length >= 2) {
      score += 20;
      reasoning.push(`Found ${features.length} feature modules`);

      // Check first feature for structure
      const firstFeaturePath = path.join(featuresPath, features[0]);
      const featureContents = await getTopLevelFolders(firstFeaturePath);
      const hasStructure = FEATURE_SUBFOLDERS.some(f => featureContents.includes(f));

      if (hasStructure) {
        score += 30;
        reasoning.push('Feature modules have internal structure');
      }
    }
  }

  return Math.min(score, 100);
}

function detectLayerFirst(folders: string[], reasoning: string[]): number {
  let score = 0;

  const found = [...LAYER_FIRST_FOLDERS, ...LAYER_FIRST_ALT]
    .filter(f => folders.includes(f));

  if (found.length >= 3) {
    score += 60;
    reasoning.push(`Found layer folders: ${found.join(', ')}`);
  } else if (found.length >= 2) {
    score += 40;
    reasoning.push(`Found some layer folders: ${found.join(', ')}`);
  }

  return Math.min(score, 100);
}

async function getTopLevelFolders(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(n => !n.startsWith('.'));
  } catch {
    return [];
  }
}

async function buildFolderTree(dirPath: string, depth = 3): Promise<FolderNode> {
  const name = path.basename(dirPath);
  const node: FolderNode = {
    name,
    path: dirPath,
    type: 'directory',
    children: [],
  };

  if (depth <= 0) return node;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const child = await buildFolderTree(entryPath, depth - 1);
        node.children!.push(child);
      } else {
        node.children!.push({
          name: entry.name,
          path: entryPath,
          type: 'file',
          fileType: getFileType(entry.name),
          category: categorizeFile(entry.name, dirPath),
        });
      }
    }
  } catch {
    // Directory not readable
  }

  return node;
}

function getFileType(filename: string): FolderNode['fileType'] {
  if (filename.endsWith('.dart')) return 'dart';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'yaml';
  if (filename.endsWith('.json')) return 'json';
  return 'other';
}

function categorizeFile(filename: string, dirPath: string): FolderNode['category'] {
  const dir = path.basename(dirPath).toLowerCase();

  if (dir.includes('model') || filename.includes('_model')) return 'model';
  if (dir.includes('screen') || dir.includes('page')) return 'screen';
  if (dir.includes('widget')) return 'widget';
  if (dir.includes('provider') || dir.includes('bloc')) return 'provider';
  if (dir.includes('service') || dir.includes('repository')) return 'service';
  if (dir.includes('theme')) return 'theme';
  if (dir.includes('route')) return 'route';

  return 'unknown';
}
