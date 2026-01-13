/**
 * MCP Resources
 *
 * Exposes project data, templates, and module information as resources.
 */

import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectEngine, ModuleSystem } from "../core/types.js";

interface ResourceContext {
  projectEngine: ProjectEngine;
  moduleSystem: ModuleSystem;
}

// ============================================================================
// RESOURCE DEFINITIONS
// ============================================================================

export function getResources(): Resource[] {
  return [
    {
      uri: "offline-pwa://projects",
      name: "Projects",
      description: "List of all projects",
      mimeType: "application/json",
    },
    {
      uri: "offline-pwa://modules",
      name: "Modules",
      description: "List of available modules",
      mimeType: "application/json",
    },
    {
      uri: "offline-pwa://architecture/clean",
      name: "Clean Architecture",
      description: "Clean Architecture structure guide",
      mimeType: "text/markdown",
    },
    {
      uri: "offline-pwa://architecture/feature-first",
      name: "Feature-First Architecture",
      description: "Feature-First Architecture structure guide",
      mimeType: "text/markdown",
    },
    {
      uri: "offline-pwa://architecture/layer-first",
      name: "Layer-First Architecture",
      description: "Layer-First Architecture structure guide",
      mimeType: "text/markdown",
    },
    {
      uri: "offline-pwa://offline-strategies",
      name: "Offline Strategies",
      description: "Guide to offline caching strategies",
      mimeType: "text/markdown",
    },
  ];
}

// ============================================================================
// RESOURCE HANDLERS
// ============================================================================

export function readResource(
  uri: string,
  context: ResourceContext
): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
  const url = new URL(uri);

  switch (url.pathname) {
    case "//projects": {
      const projects = context.projectEngine.list();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                count: projects.length,
                projects: projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  displayName: p.displayName,
                  architecture: p.architecture,
                  stateManagement: p.stateManagement,
                  targets: p.targets,
                  createdAt: p.createdAt,
                  updatedAt: p.updatedAt,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "//modules": {
      const modules = context.moduleSystem.list();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                count: modules.length,
                modules: modules.map((m) => ({
                  id: m.id,
                  name: m.name,
                  version: m.version,
                  description: m.description,
                  compatibleTargets: m.compatibleTargets,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "//architecture/clean":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: CLEAN_ARCHITECTURE_GUIDE,
          },
        ],
      };

    case "//architecture/feature-first":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: FEATURE_FIRST_GUIDE,
          },
        ],
      };

    case "//architecture/layer-first":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: LAYER_FIRST_GUIDE,
          },
        ],
      };

    case "//offline-strategies":
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: OFFLINE_STRATEGIES_GUIDE,
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
}

// ============================================================================
// RESOURCE CONTENT
// ============================================================================

const CLEAN_ARCHITECTURE_GUIDE = `# Clean Architecture

## Overview
Clean Architecture separates concerns into concentric layers, with dependencies pointing inward.

## Structure
\`\`\`
lib/
├── domain/           # Business logic (innermost)
│   ├── entities/     # Core business objects
│   ├── repositories/ # Repository interfaces
│   └── usecases/     # Business use cases
├── data/             # Data layer
│   ├── models/       # Data transfer objects
│   ├── repositories/ # Repository implementations
│   └── datasources/  # Remote/local data sources
├── presentation/     # UI layer (outermost)
│   ├── pages/        # Screens
│   └── widgets/      # Reusable components
└── core/             # Shared utilities
    ├── constants/
    ├── errors/
    └── utils/
\`\`\`

## Benefits
- Testability: Each layer can be tested independently
- Maintainability: Clear boundaries between concerns
- Flexibility: Easy to swap implementations
- Scalability: Well-suited for large teams

## When to Use
- Large, complex applications
- Team projects with multiple developers
- Apps requiring extensive testing
- Long-term maintainability is critical
`;

const FEATURE_FIRST_GUIDE = `# Feature-First Architecture

## Overview
Organizes code by feature/domain rather than technical layer.

## Structure
\`\`\`
lib/
├── features/
│   ├── auth/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── home/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   └── settings/
│       ├── data/
│       ├── domain/
│       └── presentation/
├── shared/
│   ├── widgets/
│   ├── services/
│   └── models/
└── core/
    ├── constants/
    ├── theme/
    └── utils/
\`\`\`

## Benefits
- Feature isolation: Easy to add/remove features
- Team scalability: Teams can own features
- Code locality: Related code stays together
- Easier navigation: Find code by feature

## When to Use
- Medium to large applications
- Modular feature sets
- Multiple development teams
- Features with independent lifecycles
`;

const LAYER_FIRST_GUIDE = `# Layer-First Architecture

## Overview
Simple, flat organization by technical concern. Best for smaller projects.

## Structure
\`\`\`
lib/
├── models/      # Data models
├── services/    # Business logic & API calls
├── providers/   # State management
├── screens/     # Full page views
├── widgets/     # Reusable UI components
├── utils/       # Helper functions
└── constants/   # App-wide constants
\`\`\`

## Benefits
- Simple: Easy to understand
- Quick setup: Minimal boilerplate
- Low overhead: Fewer files/folders
- Fast development: Less structure to maintain

## When to Use
- Small applications
- Prototypes/MVPs
- Solo development
- Quick turnaround projects
`;

const OFFLINE_STRATEGIES_GUIDE = `# Offline Strategies

## Available Strategies

### 1. Offline-First (Recommended for PWAs)
\`\`\`
User Action → Local Database → UI Update → Background Sync
\`\`\`
- All operations work offline
- Data syncs when connection available
- Best user experience
- Requires conflict resolution

### 2. Online-First
\`\`\`
User Action → API Call → Success? → Local Cache
                      → Failure? → Queue for Retry
\`\`\`
- Prefers network when available
- Falls back to cache on failure
- Simpler sync logic
- May have delays on slow connections

### 3. Cache-First
\`\`\`
User Action → Check Cache → Cache Hit? → Return Cached
                         → Cache Miss? → Fetch & Cache
\`\`\`
- Always checks cache first
- Reduces API calls
- Great for static content
- May serve stale data

## Sync Strategies

### Manual Sync
User explicitly triggers synchronization.

### Auto Sync
Syncs automatically when connection restored.

### Periodic Sync
Background sync at configured intervals.

## Implementation with Drift

\`\`\`dart
class OfflineRepository {
  final AppDatabase db;
  final ApiClient api;
  final SyncQueue syncQueue;

  Future<List<Item>> getItems() async {
    // Always return local data immediately
    final local = await db.select(db.items).get();

    // Attempt background refresh
    _refreshInBackground();

    return local;
  }

  Future<void> _refreshInBackground() async {
    try {
      final remote = await api.getItems();
      await db.batch((batch) {
        batch.insertAll(db.items, remote, mode: InsertMode.replace);
      });
    } catch (_) {
      // Silently fail - offline or error
    }
  }
}
\`\`\`
`;
