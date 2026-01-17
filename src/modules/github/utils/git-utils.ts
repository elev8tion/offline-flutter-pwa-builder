import { simpleGit, SimpleGit } from 'simple-git';
import { dir as tmpDir } from 'tmp-promise';
import * as path from 'path';
import fs from 'fs-extra';

export interface CloneOptions {
  url: string;
  branch?: string;
  depth?: number;
}

export interface CloneResult {
  success: boolean;
  localPath: string;
  repoName: string;
  branch: string;
  commit: string;
  size: number;
  error?: string;
}

export async function cloneRepository(options: CloneOptions): Promise<CloneResult> {
  const { url, branch = 'main', depth = 1 } = options;

  // Extract repo name from URL
  const repoName = extractRepoName(url);

  // Create temp directory
  const tmpResult = await tmpDir({ prefix: 'mcp-github-', unsafeCleanup: true });
  const localPath = path.join(tmpResult.path, repoName);

  try {
    const git: SimpleGit = simpleGit();

    // Clone with options
    await git.clone(url, localPath, [
      '--branch', branch,
      '--depth', String(depth),
      '--single-branch',
    ]);

    // Get commit hash
    const repoGit = simpleGit(localPath);
    const log = await repoGit.log({ maxCount: 1 });
    const commit = log.latest?.hash || 'unknown';

    // Calculate size
    const size = await getDirectorySize(localPath);

    return {
      success: true,
      localPath,
      repoName,
      branch,
      commit,
      size,
    };
  } catch (error) {
    return {
      success: false,
      localPath: '',
      repoName,
      branch,
      commit: '',
      size: 0,
      error: error instanceof Error ? error.message : 'Clone failed',
    };
  }
}

function extractRepoName(url: string): string {
  // Handle: https://github.com/user/repo.git or https://github.com/user/repo
  const match = url.match(/\/([^\/]+?)(\.git)?$/);
  return match ? match[1] : 'repo';
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  const files = await fs.readdir(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      if (file.name !== '.git') {
        size += await getDirectorySize(filePath);
      }
    } else {
      const stat = await fs.stat(filePath);
      size += stat.size;
    }
  }

  return size;
}

export async function cleanupClone(localPath: string): Promise<void> {
  try {
    await fs.remove(localPath);
  } catch (error) {
    console.warn(`Failed to cleanup: ${localPath}`);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
