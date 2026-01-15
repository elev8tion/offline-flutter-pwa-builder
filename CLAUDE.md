# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Offline Flutter PWA Builder** is an MCP (Model Context Protocol) Server that generates production-ready, offline-first Progressive Web Applications built with Flutter.

**Core Mission:** Generate responsive, local, offline PWAs. AI capabilities may be added in the future.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| MCP Server | TypeScript/Node.js | Tool orchestration |
| Generated Apps | Flutter/Dart | Cross-platform UI |
| Offline Storage | Drift + WASM + OPFS | SQLite in browser |
| Caching | Service Workers | Asset caching |
| State | Riverpod or BLoC | Offline-aware state |

## Key Documents

| File | Purpose |
|------|---------|
| `mcp_server_structure` | Original architectural specification (2,781 lines, 6 phases, 24 tools) |
| `UNIFIED_IMPLEMENTATION_BLUEPRINT.md` | Combined implementation guide with reusable code from flutterorchestrator + visual-flutter-generator |

## Architecture

```
CORE LAYER (Foundation)
├── Project Engine       - Project lifecycle management
├── Template Engine      - Handlebars-based code generation
├── Module System        - Pluggable modules with lifecycle hooks
├── Validation Framework - Code/config validation with autofix
├── Security Framework   - Security policy enforcement
├── File System          - Local + in-memory file operations
├── Communication        - WebSocket for real-time preview (from flutterorchestrator)
└── Widget Tracking      - Component registry (from flutterorchestrator)

MODULES (Pluggable)
├── Drift Module         - SQLite + WASM + OPFS + encryption
├── PWA Module           - Manifest, service workers, install prompt
├── State Module         - Riverpod/BLoC with offline sync
├── Security Module      - Encryption, validation, audit
└── Build Module         - Deployment configs (Vercel, Netlify, Firebase)
```

## Source Repositories

This project combines code from three sources:

| Source | Tools | Reuse |
|--------|-------|-------|
| `mcp_server_structure` | 24 | Blueprint/specification |
| `/Users/kcdacre8tor/flutterorchestrator MCP` | 41 | MCP server setup, widget tracking, code generation, handlers |
| `/Users/kcdacre8tor/visual-flutter-generator` | 26 | Visual analysis, validation, learning system, export pipeline |

## Expected Directory Structure

```
src/
├── index.ts                    # MCP server entry
├── core/
│   ├── project-engine/
│   ├── template-engine/
│   ├── module-system/
│   ├── validation-framework/
│   ├── security-framework/
│   ├── filesystem/
│   ├── communication/          # From flutterorchestrator
│   └── tracking/               # From flutterorchestrator
├── modules/
│   ├── drift/
│   ├── pwa/
│   ├── state/
│   ├── security/
│   └── build/
├── analysis/                   # From visual-flutter-generator
├── generation/
├── learning/                   # From visual-flutter-generator
├── handlers/                   # From flutterorchestrator
└── tools/
```

## Key Interfaces

```typescript
// Project Definition
interface ProjectDefinition {
  id: string;
  name: string;
  pwa: PWAConfig;
  offline: OfflineConfig;
  architecture: 'clean' | 'feature-first' | 'layer-first';
  stateManagement: 'riverpod' | 'bloc';
  modules: ModuleConfig[];
  targets: ('web' | 'android' | 'ios')[];
}

// Module Hooks
interface ModuleHooks {
  onInstall?: (ctx: HookContext) => Promise<void>;
  beforeGenerate?: (ctx: HookContext) => Promise<void>;
  onGenerate?: (ctx: HookContext) => Promise<GeneratedFile[]>;
  afterGenerate?: (ctx: HookContext) => Promise<void>;
  beforeBuild?: (ctx: HookContext) => Promise<void>;
  afterBuild?: (ctx: HookContext) => Promise<void>;
}

// Offline Config
interface OfflineConfig {
  strategy: 'offline-first' | 'online-first' | 'cache-first';
  storage: { type: 'drift'; encryption: boolean; };
  caching: { assets: boolean; api: boolean; ttl: number; };
  sync?: { enabled: boolean; strategy: 'manual' | 'auto' | 'periodic'; };
}
```

## MCP Tools Summary

| Phase | Module | Count | Key Tools |
|-------|--------|-------|-----------|
| 1 | Core | 3 | `module_list`, `module_info`, `template_preview` |
| 2 | Drift | 6 | `drift_add_table`, `drift_generate_dao`, `drift_create_migration` |
| 3 | PWA | 6 | `pwa_configure_manifest`, `pwa_generate_icons`, `pwa_configure_caching` |
| 4 | State | 4 | `state_create_provider`, `state_create_bloc`, `state_generate_feature` |
| 5 | Security | 4 | `security_enable_encryption`, `security_audit` |
| 6 | Build | 6 | `project_create`, `project_build`, `project_configure_deployment` |

## Build Commands (when implemented)

```bash
npm install                 # Install dependencies
npm run build              # Compile TypeScript
npm run dev                # Watch mode
npm run start              # Run MCP server
npm run test               # Run tests
```

## Dependencies (from flutterorchestrator)

```json
{
  "@modelcontextprotocol/sdk": "^0.5.0",
  "zod": "^3.22.4",
  "uuid": "^9.0.1",
  "ws": "^8.18.3",
  "sqlite": "^5.1.1",
  "sqlite3": "^5.1.7",
  "fs-extra": "^11.2.0",
  "glob": "^10.3.10",
  "js-yaml": "^4.1.0",
  "handlebars": "^4.7.8"
}
```

## Implementation Phases

1. **Phase 1:** Core abstractions (Project Engine, Template Engine, Module System)
2. **Phase 2:** Drift module (SQLite + WASM + OPFS)
3. **Phase 3:** PWA module (manifest, service workers)
4. **Phase 4:** State module (Riverpod/BLoC with offline sync)
5. **Phase 5:** Security module (encryption, validation)
6. **Phase 6:** Build module (deployment configs)

## Key Principles

- **Offline-First:** All generated apps work without network
- **Responsive:** PWAs adapt to all screen sizes
- **Secure:** Encrypted storage, input validation, security audits
- **Modular:** Pick only the modules you need
- **Template-Based:** Deterministic code generation via Handlebars

---

## CRITICAL: GitHub Project Transformation Rule

**This rule is MANDATORY and must ALWAYS be followed.**

### When Input is a GitHub URL

If the user provides a GitHub repository URL to transform (e.g., `https://github.com/user/repo.git`):

1. **ALWAYS use `github_import_and_rebuild`** as the PRIMARY tool
2. This single tool handles the entire pipeline:
   - Clone repository
   - Analyze Flutter project structure
   - Extract models and screens
   - Create rebuild schema
   - Generate fresh code using MCP framework patterns
3. **NEVER** use `project_create` + manual file copying
4. **NEVER** copy source files from the original repo to the output
5. **NEVER** bypass the extraction/rebuild pipeline

### When Starting Fresh (No GitHub URL)

Use the individual tools for creating new projects:
- `project_create` - Initialize new project
- `drift_add_table` - Define database tables
- `pwa_configure_*` - Configure PWA settings
- `state_create_*` - Setup state management
- `security_*` - Configure security features
- `project_build` - Build and export

### Why This Matters

The GitHub pipeline tools (`github_import_and_rebuild`) perform **actual code transformation**:
- Parses existing Dart code
- Extracts data models with fields and relationships
- Extracts screen structures
- **Regenerates** everything using MCP framework patterns

Without this pipeline, you end up with:
- Original code copied as-is (not transformed)
- New scaffolding files that aren't connected to anything
- Two parallel systems that conflict
- A broken hybrid instead of a clean rebuild

### Quick Reference

| Input Type | Tool to Use |
|------------|-------------|
| GitHub URL | `github_import_and_rebuild` (mandatory) |
| New project from scratch | `project_create` + individual tools |
| Enhance existing MCP project | Individual tools as needed |
