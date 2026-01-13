/**
 * PWA Module Tools
 *
 * MCP tool definitions and handlers for PWA configuration.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import { z } from "zod";
import {
  PWAModuleConfig,
  CacheRuleSchema,
  generateIconConfigs,
  generateManifestContent,
  STANDARD_ICON_SIZES,
  MASKABLE_ICON_SIZES,
} from "./config.js";

// ============================================================================
// TOOL CONTEXT
// ============================================================================

export interface PWAToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  updateProject: (id: string, updates: Partial<ProjectDefinition>) => Promise<ProjectDefinition>;
  getPWAConfig: (projectId: string) => PWAModuleConfig | undefined;
  updatePWAConfig: (projectId: string, config: Partial<PWAModuleConfig>) => void;
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const ConfigureManifestInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(45).optional(),
  shortName: z.string().min(1).max(12).optional(),
  description: z.string().max(300).optional(),
  themeColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).optional(),
  orientation: z.enum(["any", "portrait", "landscape"]).optional(),
  startUrl: z.string().optional(),
  scope: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

const GenerateIconsInputSchema = z.object({
  projectId: z.string().min(1),
  sourceImage: z.string().min(1).optional(),
  outputPath: z.string().default("/icons"),
  includeMaskable: z.boolean().default(true),
  sizes: z.array(z.number().int().positive()).optional(),
});

const ConfigureCachingInputSchema = z.object({
  projectId: z.string().min(1),
  precacheAssets: z.boolean().optional(),
  skipWaiting: z.boolean().optional(),
  clientsClaim: z.boolean().optional(),
  navigationPreload: z.boolean().optional(),
  offlineFallbackPage: z.string().optional(),
  rules: z.array(CacheRuleSchema).optional(),
});

const AddShortcutInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().optional(),
  description: z.string().optional(),
  url: z.string().min(1),
  iconSrc: z.string().optional(),
});

const ConfigureInstallPromptInputSchema = z.object({
  projectId: z.string().min(1),
  enabled: z.boolean().optional(),
  delay: z.number().int().nonnegative().optional(),
  showOnVisit: z.number().int().positive().optional(),
  customPrompt: z.boolean().optional(),
  promptTitle: z.string().optional(),
  promptMessage: z.string().optional(),
  promptInstallButton: z.string().optional(),
  promptCancelButton: z.string().optional(),
});

const GenerateManifestInputSchema = z.object({
  projectId: z.string().min(1),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const PWA_TOOLS: Tool[] = [
  {
    name: "pwa_configure_manifest",
    description: "Configure PWA manifest settings (name, colors, display mode, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        name: { type: "string", description: "Full app name (max 45 chars)" },
        shortName: { type: "string", description: "Short app name (max 12 chars)" },
        description: { type: "string", description: "App description (max 300 chars)" },
        themeColor: { type: "string", description: "Theme color (hex format, e.g., #2196F3)" },
        backgroundColor: { type: "string", description: "Background color (hex format)" },
        display: {
          type: "string",
          enum: ["standalone", "fullscreen", "minimal-ui", "browser"],
          description: "Display mode",
        },
        orientation: {
          type: "string",
          enum: ["any", "portrait", "landscape"],
          description: "Screen orientation",
        },
        startUrl: { type: "string", description: "Start URL (default: /)" },
        scope: { type: "string", description: "App scope (default: /)" },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "App categories",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "pwa_generate_icons",
    description: "Generate PWA icons configuration (standard and maskable sizes)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        sourceImage: { type: "string", description: "Source image path (optional)" },
        outputPath: { type: "string", description: "Output path for icons (default: /icons)" },
        includeMaskable: { type: "boolean", description: "Include maskable icons (default: true)" },
        sizes: {
          type: "array",
          items: { type: "number" },
          description: "Custom icon sizes (optional)",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "pwa_configure_caching",
    description: "Configure service worker caching strategies and rules",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        precacheAssets: { type: "boolean", description: "Precache static assets" },
        skipWaiting: { type: "boolean", description: "Skip waiting for SW activation" },
        clientsClaim: { type: "boolean", description: "Claim clients immediately" },
        navigationPreload: { type: "boolean", description: "Enable navigation preload" },
        offlineFallbackPage: { type: "string", description: "Offline fallback page path" },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              pattern: { type: "string", description: "URL pattern (regex)" },
              strategy: {
                type: "string",
                enum: ["cache-first", "network-first", "stale-while-revalidate", "network-only", "cache-only"],
              },
              maxAgeSeconds: { type: "number", description: "Cache max age in seconds" },
              maxEntries: { type: "number", description: "Max cache entries" },
            },
            required: ["pattern", "strategy"],
          },
          description: "Caching rules",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "pwa_add_shortcut",
    description: "Add a PWA shortcut (app launcher shortcut)",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        name: { type: "string", description: "Shortcut name" },
        shortName: { type: "string", description: "Short name (optional)" },
        description: { type: "string", description: "Shortcut description" },
        url: { type: "string", description: "Shortcut URL" },
        iconSrc: { type: "string", description: "Icon source path" },
      },
      required: ["projectId", "name", "url"],
    },
  },
  {
    name: "pwa_configure_install_prompt",
    description: "Configure the PWA install prompt behavior and appearance",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        enabled: { type: "boolean", description: "Enable install prompt" },
        delay: { type: "number", description: "Delay before showing prompt (ms)" },
        showOnVisit: { type: "number", description: "Show after N visits" },
        customPrompt: { type: "boolean", description: "Use custom prompt UI" },
        promptTitle: { type: "string", description: "Prompt title" },
        promptMessage: { type: "string", description: "Prompt message" },
        promptInstallButton: { type: "string", description: "Install button text" },
        promptCancelButton: { type: "string", description: "Cancel button text" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "pwa_generate_manifest",
    description: "Generate the manifest.json file content from current config",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["projectId"],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

/**
 * Handle PWA tool calls
 */
export async function handlePWATool(
  name: string,
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (name) {
    case "pwa_configure_manifest":
      return handleConfigureManifest(args, ctx);
    case "pwa_generate_icons":
      return handleGenerateIcons(args, ctx);
    case "pwa_configure_caching":
      return handleConfigureCaching(args, ctx);
    case "pwa_add_shortcut":
      return handleAddShortcut(args, ctx);
    case "pwa_configure_install_prompt":
      return handleConfigureInstallPrompt(args, ctx);
    case "pwa_generate_manifest":
      return handleGenerateManifest(args, ctx);
    default:
      throw new Error(`Unknown PWA tool: ${name}`);
  }
}

// ============================================================================
// INDIVIDUAL HANDLERS
// ============================================================================

async function handleConfigureManifest(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureManifestInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  // Update config with provided values
  const updates: Partial<PWAModuleConfig> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.shortName !== undefined) updates.shortName = input.shortName;
  if (input.description !== undefined) updates.description = input.description;
  if (input.themeColor !== undefined) updates.themeColor = input.themeColor;
  if (input.backgroundColor !== undefined) updates.backgroundColor = input.backgroundColor;
  if (input.display !== undefined) updates.display = input.display;
  if (input.orientation !== undefined) updates.orientation = input.orientation;
  if (input.startUrl !== undefined) updates.startUrl = input.startUrl;
  if (input.scope !== undefined) updates.scope = input.scope;
  if (input.categories !== undefined) updates.categories = input.categories;

  ctx.updatePWAConfig(input.projectId, updates);

  const updatedFields = Object.keys(updates).join(", ");

  return {
    content: [
      {
        type: "text",
        text: `✓ PWA manifest configured
Updated fields: ${updatedFields || "none"}
Name: ${updates.name || config.name}
Short Name: ${updates.shortName || config.shortName}
Display: ${updates.display || config.display}
Theme Color: ${updates.themeColor || config.themeColor}
`,
      },
    ],
  };
}

async function handleGenerateIcons(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateIconsInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  // Generate icon configurations
  const icons = generateIconConfigs(input.outputPath, input.includeMaskable);

  // Add custom sizes if provided
  if (input.sizes && input.sizes.length > 0) {
    for (const size of input.sizes) {
      const existing = icons.find((i) => i.sizes === `${size}x${size}`);
      if (!existing) {
        icons.push({
          src: `${input.outputPath}/icon-${size}x${size}.png`,
          sizes: `${size}x${size}`,
          type: "image/png",
          purpose: "any",
        });
      }
    }
  }

  ctx.updatePWAConfig(input.projectId, { icons });

  const standardCount = STANDARD_ICON_SIZES.length;
  const maskableCount = input.includeMaskable ? MASKABLE_ICON_SIZES.length : 0;
  const customCount = input.sizes?.length || 0;

  return {
    content: [
      {
        type: "text",
        text: `✓ PWA icons configured
Output Path: ${input.outputPath}
Standard Icons: ${standardCount}
Maskable Icons: ${maskableCount}
Custom Icons: ${customCount}
Total: ${icons.length}

Icon sizes generated:
${icons.map((i) => `  - ${i.sizes} (${i.purpose || "any"})`).join("\n")}

Note: Actual image files need to be created separately.
Use a tool like pwa-asset-generator or create manually.
`,
      },
    ],
  };
}

async function handleConfigureCaching(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureCachingInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  const swUpdates: Partial<typeof config.serviceWorker> = {};

  if (input.precacheAssets !== undefined) swUpdates.precacheAssets = input.precacheAssets;
  if (input.skipWaiting !== undefined) swUpdates.skipWaiting = input.skipWaiting;
  if (input.clientsClaim !== undefined) swUpdates.clientsClaim = input.clientsClaim;
  if (input.navigationPreload !== undefined) swUpdates.navigationPreload = input.navigationPreload;
  if (input.offlineFallbackPage !== undefined) swUpdates.offlineFallbackPage = input.offlineFallbackPage;
  if (input.rules !== undefined) swUpdates.runtimeCaching = input.rules;

  const updatedSW = { ...config.serviceWorker, ...swUpdates };
  ctx.updatePWAConfig(input.projectId, { serviceWorker: updatedSW });

  const ruleCount = updatedSW.runtimeCaching?.length || 0;

  return {
    content: [
      {
        type: "text",
        text: `✓ Service worker caching configured
Precache Assets: ${updatedSW.precacheAssets}
Skip Waiting: ${updatedSW.skipWaiting}
Clients Claim: ${updatedSW.clientsClaim}
Navigation Preload: ${updatedSW.navigationPreload}
Offline Fallback: ${updatedSW.offlineFallbackPage || "default"}
Caching Rules: ${ruleCount}
${ruleCount > 0 ? `
Rules:
${updatedSW.runtimeCaching?.map((r) => `  - ${r.pattern}: ${r.strategy}`).join("\n")}` : ""}
`,
      },
    ],
  };
}

async function handleAddShortcut(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = AddShortcutInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  // Check for duplicate
  const existing = config.shortcuts.find((s) => s.url === input.url);
  if (existing) {
    throw new Error(`Shortcut with URL '${input.url}' already exists`);
  }

  const shortcut: typeof config.shortcuts[number] = {
    name: input.name,
    url: input.url,
  };

  if (input.shortName) shortcut.shortName = input.shortName;
  if (input.description) shortcut.description = input.description;
  if (input.iconSrc) {
    shortcut.icons = [
      {
        src: input.iconSrc,
        sizes: "96x96",
        type: "image/png",
      },
    ];
  }

  const updatedShortcuts = [...config.shortcuts, shortcut];
  ctx.updatePWAConfig(input.projectId, { shortcuts: updatedShortcuts });

  return {
    content: [
      {
        type: "text",
        text: `✓ Shortcut added: ${input.name}
URL: ${input.url}
Description: ${input.description || "none"}
Icon: ${input.iconSrc || "none"}
Total shortcuts: ${updatedShortcuts.length}
`,
      },
    ],
  };
}

async function handleConfigureInstallPrompt(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = ConfigureInstallPromptInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  const promptUpdates: Partial<typeof config.installPrompt> = {};

  if (input.enabled !== undefined) promptUpdates.enabled = input.enabled;
  if (input.delay !== undefined) promptUpdates.delay = input.delay;
  if (input.showOnVisit !== undefined) promptUpdates.showOnVisit = input.showOnVisit;
  if (input.customPrompt !== undefined) promptUpdates.customPrompt = input.customPrompt;
  if (input.promptTitle !== undefined) promptUpdates.promptTitle = input.promptTitle;
  if (input.promptMessage !== undefined) promptUpdates.promptMessage = input.promptMessage;
  if (input.promptInstallButton !== undefined) promptUpdates.promptInstallButton = input.promptInstallButton;
  if (input.promptCancelButton !== undefined) promptUpdates.promptCancelButton = input.promptCancelButton;

  const updatedPrompt = { ...config.installPrompt, ...promptUpdates };
  ctx.updatePWAConfig(input.projectId, { installPrompt: updatedPrompt });

  return {
    content: [
      {
        type: "text",
        text: `✓ Install prompt configured
Enabled: ${updatedPrompt.enabled}
Delay: ${updatedPrompt.delay}ms
Show on Visit: ${updatedPrompt.showOnVisit}
Custom Prompt: ${updatedPrompt.customPrompt}
Title: "${updatedPrompt.promptTitle}"
Message: "${updatedPrompt.promptMessage}"
`,
      },
    ],
  };
}

async function handleGenerateManifest(
  args: Record<string, unknown>,
  ctx: PWAToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateManifestInputSchema.parse(args);

  const config = ctx.getPWAConfig(input.projectId);
  if (!config) {
    throw new Error(`Project not found or PWA module not installed: ${input.projectId}`);
  }

  const manifestContent = generateManifestContent(config);

  return {
    content: [
      {
        type: "text",
        text: `✓ Generated manifest.json

\`\`\`json
${manifestContent}
\`\`\`

Save this to: web/manifest.json
`,
      },
    ],
  };
}

export default PWA_TOOLS;
