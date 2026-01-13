/**
 * File System Abstraction
 *
 * Provides unified file operations for both local and in-memory file systems.
 * Supports transactions for atomic operations.
 */

import * as fs from "fs-extra";
import * as path from "path";
import { glob } from "glob";
import type { FileSystem, FileInfo, Transaction } from "../types.js";

// ============================================================================
// LOCAL FILE SYSTEM
// ============================================================================

class LocalTransaction implements Transaction {
  private operations: Array<{ type: "write" | "delete"; path: string; content?: string }> = [];
  private committed = false;
  private rolledBack = false;
  private backups: Map<string, string | null> = new Map();

  write(filePath: string, content: string): void {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction already completed");
    }
    this.operations.push({ type: "write", path: filePath, content });
  }

  delete(filePath: string): void {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction already completed");
    }
    this.operations.push({ type: "delete", path: filePath });
  }

  async commit(): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error("Transaction already completed");
    }

    // First, backup existing files
    for (const op of this.operations) {
      if (await fs.pathExists(op.path)) {
        const content = await fs.readFile(op.path, "utf-8");
        this.backups.set(op.path, content);
      } else {
        this.backups.set(op.path, null);
      }
    }

    try {
      // Execute operations
      for (const op of this.operations) {
        if (op.type === "write" && op.content !== undefined) {
          await fs.ensureDir(path.dirname(op.path));
          await fs.writeFile(op.path, op.content, "utf-8");
        } else if (op.type === "delete") {
          if (await fs.pathExists(op.path)) {
            await fs.remove(op.path);
          }
        }
      }
      this.committed = true;
    } catch (error) {
      // Rollback on error
      await this.performRollback();
      throw error;
    }
  }

  rollback(): void {
    if (this.committed) {
      throw new Error("Cannot rollback committed transaction");
    }
    this.rolledBack = true;
    this.operations = [];
  }

  private async performRollback(): Promise<void> {
    for (const [filePath, content] of this.backups) {
      if (content === null) {
        // File didn't exist before, remove it
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      } else {
        // Restore original content
        await fs.writeFile(filePath, content, "utf-8");
      }
    }
    this.rolledBack = true;
  }
}

export class LocalFileSystem implements FileSystem {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.basePath, filePath);
  }

  async read(filePath: string): Promise<string> {
    const resolved = this.resolvePath(filePath);
    return fs.readFile(resolved, "utf-8");
  }

  async write(filePath: string, content: string): Promise<void> {
    const resolved = this.resolvePath(filePath);
    await fs.ensureDir(path.dirname(resolved));
    await fs.writeFile(resolved, content, "utf-8");
  }

  async exists(filePath: string): Promise<boolean> {
    const resolved = this.resolvePath(filePath);
    return fs.pathExists(resolved);
  }

  async mkdir(dirPath: string, _recursive = true): Promise<void> {
    const resolved = this.resolvePath(dirPath);
    await fs.ensureDir(resolved);
  }

  async rmdir(dirPath: string, recursive = false): Promise<void> {
    const resolved = this.resolvePath(dirPath);
    if (recursive) {
      await fs.remove(resolved);
    } else {
      await fs.rmdir(resolved);
    }
  }

  async delete(filePath: string): Promise<void> {
    const resolved = this.resolvePath(filePath);
    await fs.remove(resolved);
  }

  async list(dirPath: string, pattern?: string): Promise<string[]> {
    const resolved = this.resolvePath(dirPath);

    if (pattern) {
      const matches = await glob(pattern, { cwd: resolved });
      return matches.map((match) => path.join(resolved, match));
    }

    const entries = await fs.readdir(resolved);
    return entries.map((entry) => path.join(resolved, entry));
  }

  async stat(filePath: string): Promise<FileInfo> {
    const resolved = this.resolvePath(filePath);
    const stats = await fs.stat(resolved);

    return {
      path: resolved,
      name: path.basename(resolved),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      modifiedAt: stats.mtime,
    };
  }

  async copy(src: string, dest: string): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);
    await fs.copy(resolvedSrc, resolvedDest);
  }

  async move(src: string, dest: string): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);
    await fs.move(resolvedSrc, resolvedDest);
  }

  beginTransaction(): Transaction {
    return new LocalTransaction();
  }
}

// ============================================================================
// IN-MEMORY FILE SYSTEM
// ============================================================================

interface MemoryNode {
  type: "file" | "directory";
  content?: string;
  children?: Map<string, MemoryNode>;
  modifiedAt: Date;
}

class MemoryTransaction implements Transaction {
  private operations: Array<{ type: "write" | "delete"; path: string; content?: string }> = [];
  private fs: MemoryFileSystem;
  private completed = false;

  constructor(fs: MemoryFileSystem) {
    this.fs = fs;
  }

  write(filePath: string, content: string): void {
    if (this.completed) throw new Error("Transaction already completed");
    this.operations.push({ type: "write", path: filePath, content });
  }

  delete(filePath: string): void {
    if (this.completed) throw new Error("Transaction already completed");
    this.operations.push({ type: "delete", path: filePath });
  }

  async commit(): Promise<void> {
    if (this.completed) throw new Error("Transaction already completed");

    for (const op of this.operations) {
      if (op.type === "write" && op.content !== undefined) {
        await this.fs.write(op.path, op.content);
      } else if (op.type === "delete") {
        await this.fs.delete(op.path);
      }
    }

    this.completed = true;
  }

  rollback(): void {
    this.operations = [];
    this.completed = true;
  }
}

export class MemoryFileSystem implements FileSystem {
  private root: MemoryNode = {
    type: "directory",
    children: new Map(),
    modifiedAt: new Date(),
  };

  private parsePath(filePath: string): string[] {
    return filePath.split("/").filter((part) => part.length > 0);
  }

  private getNode(parts: string[]): MemoryNode | undefined {
    let current = this.root;

    for (const part of parts) {
      if (current.type !== "directory" || !current.children) {
        return undefined;
      }
      const next = current.children.get(part);
      if (!next) return undefined;
      current = next;
    }

    return current;
  }

  private ensureDirectory(parts: string[]): MemoryNode {
    let current = this.root;

    for (const part of parts) {
      if (!current.children) {
        current.children = new Map();
      }

      let next = current.children.get(part);
      if (!next) {
        next = {
          type: "directory",
          children: new Map(),
          modifiedAt: new Date(),
        };
        current.children.set(part, next);
      }

      if (next.type !== "directory") {
        throw new Error(`Path component ${part} is not a directory`);
      }

      current = next;
    }

    return current;
  }

  async read(filePath: string): Promise<string> {
    const parts = this.parsePath(filePath);
    const node = this.getNode(parts);

    if (!node) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (node.type !== "file") {
      throw new Error(`Not a file: ${filePath}`);
    }

    return node.content ?? "";
  }

  async write(filePath: string, content: string): Promise<void> {
    const parts = this.parsePath(filePath);
    const filename = parts.pop();

    if (!filename) {
      throw new Error("Invalid file path");
    }

    const parent = this.ensureDirectory(parts);

    if (!parent.children) {
      parent.children = new Map();
    }

    parent.children.set(filename, {
      type: "file",
      content,
      modifiedAt: new Date(),
    });
  }

  async exists(filePath: string): Promise<boolean> {
    const parts = this.parsePath(filePath);
    return this.getNode(parts) !== undefined;
  }

  async mkdir(dirPath: string, _recursive = true): Promise<void> {
    const parts = this.parsePath(dirPath);
    this.ensureDirectory(parts);
  }

  async rmdir(dirPath: string, recursive = false): Promise<void> {
    const parts = this.parsePath(dirPath);
    const dirname = parts.pop();

    if (!dirname) {
      throw new Error("Cannot remove root");
    }

    const parent = this.getNode(parts);
    if (!parent || parent.type !== "directory" || !parent.children) {
      return;
    }

    const node = parent.children.get(dirname);
    if (!node) return;

    if (node.type !== "directory") {
      throw new Error("Not a directory");
    }

    if (!recursive && node.children && node.children.size > 0) {
      throw new Error("Directory not empty");
    }

    parent.children.delete(dirname);
  }

  async delete(filePath: string): Promise<void> {
    const parts = this.parsePath(filePath);
    const filename = parts.pop();

    if (!filename) return;

    const parent = this.getNode(parts);
    if (!parent || parent.type !== "directory" || !parent.children) {
      return;
    }

    parent.children.delete(filename);
  }

  async list(dirPath: string, _pattern?: string): Promise<string[]> {
    const parts = this.parsePath(dirPath);
    const node = parts.length === 0 ? this.root : this.getNode(parts);

    if (!node || node.type !== "directory" || !node.children) {
      return [];
    }

    const basePath = "/" + parts.join("/");
    return Array.from(node.children.keys()).map((name) =>
      basePath === "/" ? `/${name}` : `${basePath}/${name}`
    );
  }

  async stat(filePath: string): Promise<FileInfo> {
    const parts = this.parsePath(filePath);
    const node = this.getNode(parts);

    if (!node) {
      throw new Error(`Path not found: ${filePath}`);
    }

    return {
      path: filePath,
      name: parts[parts.length - 1] || "/",
      isDirectory: node.type === "directory",
      size: node.content?.length ?? 0,
      modifiedAt: node.modifiedAt,
    };
  }

  async copy(src: string, dest: string): Promise<void> {
    const content = await this.read(src);
    await this.write(dest, content);
  }

  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest);
    await this.delete(src);
  }

  beginTransaction(): Transaction {
    return new MemoryTransaction(this);
  }

  // Utility method to clear all files (useful for testing)
  clear(): void {
    this.root = {
      type: "directory",
      children: new Map(),
      modifiedAt: new Date(),
    };
  }
}
