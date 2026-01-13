/**
 * PWA Module Configuration
 *
 * Defines configuration types and schemas for Progressive Web App features.
 */

import { z } from "zod";

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Hex color validation regex
 */
const HexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Icon configuration schema
 */
export const IconConfigSchema = z.object({
  src: z.string().min(1),
  sizes: z.string().regex(/^\d+x\d+$/, "Must be in format WxH (e.g., 192x192)"),
  type: z.string().default("image/png"),
  purpose: z.enum(["any", "maskable", "monochrome"]).optional(),
});

/**
 * Standard PWA icon sizes
 */
export const STANDARD_ICON_SIZES = [
  { size: 72, name: "icon-72x72.png" },
  { size: 96, name: "icon-96x96.png" },
  { size: 128, name: "icon-128x128.png" },
  { size: 144, name: "icon-144x144.png" },
  { size: 152, name: "icon-152x152.png" },
  { size: 192, name: "icon-192x192.png" },
  { size: 384, name: "icon-384x384.png" },
  { size: 512, name: "icon-512x512.png" },
];

/**
 * Maskable icon sizes (with safe zone)
 */
export const MASKABLE_ICON_SIZES = [
  { size: 192, name: "icon-maskable-192x192.png" },
  { size: 512, name: "icon-maskable-512x512.png" },
];

/**
 * Display mode schema
 */
export const DisplayModeSchema = z.enum([
  "standalone",
  "fullscreen",
  "minimal-ui",
  "browser",
]);

/**
 * Orientation schema
 */
export const OrientationSchema = z.enum([
  "any",
  "natural",
  "portrait",
  "portrait-primary",
  "portrait-secondary",
  "landscape",
  "landscape-primary",
  "landscape-secondary",
]);

/**
 * Caching strategy schema
 */
export const CachingStrategySchema = z.enum([
  "cache-first",
  "network-first",
  "stale-while-revalidate",
  "network-only",
  "cache-only",
]);

/**
 * Cache rule schema for defining caching behavior per route/asset type
 */
export const CacheRuleSchema = z.object({
  pattern: z.string().min(1),
  strategy: CachingStrategySchema,
  maxAgeSeconds: z.number().int().positive().optional(),
  maxEntries: z.number().int().positive().optional(),
});

/**
 * Service worker configuration schema
 */
export const ServiceWorkerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  precacheAssets: z.boolean().default(true),
  runtimeCaching: z.array(CacheRuleSchema).default([]),
  skipWaiting: z.boolean().default(true),
  clientsClaim: z.boolean().default(true),
  offlineFallbackPage: z.string().optional(),
  navigationPreload: z.boolean().default(false),
});

/**
 * Install prompt configuration
 */
export const InstallPromptConfigSchema = z.object({
  enabled: z.boolean().default(true),
  delay: z.number().int().nonnegative().default(30000), // ms before showing
  showOnVisit: z.number().int().positive().default(2), // visit count threshold
  customPrompt: z.boolean().default(true),
  promptTitle: z.string().default("Install App"),
  promptMessage: z.string().default("Add this app to your home screen for quick access!"),
  promptInstallButton: z.string().default("Install"),
  promptCancelButton: z.string().default("Not now"),
});

/**
 * Offline indicator configuration
 */
export const OfflineIndicatorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  position: z.enum(["top", "bottom"]).default("bottom"),
  message: z.string().default("You are offline"),
  onlineMessage: z.string().default("Back online"),
  showDuration: z.number().int().positive().default(3000), // ms
});

/**
 * Full PWA module configuration schema
 */
export const PWAConfigSchema = z.object({
  // Manifest properties
  name: z.string().min(1).max(45),
  shortName: z.string().min(1).max(12),
  description: z.string().max(300).optional(),
  themeColor: z.string().regex(HexColorRegex, "Must be valid hex color"),
  backgroundColor: z.string().regex(HexColorRegex, "Must be valid hex color"),
  display: DisplayModeSchema.default("standalone"),
  orientation: OrientationSchema.default("any"),
  startUrl: z.string().default("/"),
  scope: z.string().default("/"),
  id: z.string().optional(), // PWA app ID for updates
  categories: z.array(z.string()).default([]),
  icons: z.array(IconConfigSchema).default([]),

  // Service worker
  serviceWorker: ServiceWorkerConfigSchema.default({}),

  // Install prompt
  installPrompt: InstallPromptConfigSchema.default({}),

  // Offline indicator
  offlineIndicator: OfflineIndicatorConfigSchema.default({}),

  // Additional features
  screenshots: z.array(z.object({
    src: z.string(),
    sizes: z.string(),
    type: z.string().default("image/png"),
    label: z.string().optional(),
  })).default([]),

  shortcuts: z.array(z.object({
    name: z.string(),
    shortName: z.string().optional(),
    description: z.string().optional(),
    url: z.string(),
    icons: z.array(IconConfigSchema).optional(),
  })).default([]),

  relatedApplications: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    id: z.string().optional(),
  })).default([]),

  preferRelatedApplications: z.boolean().default(false),
});

// ============================================================================
// TYPES
// ============================================================================

export type IconConfig = z.infer<typeof IconConfigSchema>;
export type DisplayMode = z.infer<typeof DisplayModeSchema>;
export type Orientation = z.infer<typeof OrientationSchema>;
export type CachingStrategy = z.infer<typeof CachingStrategySchema>;
export type CacheRule = z.infer<typeof CacheRuleSchema>;
export type ServiceWorkerConfig = z.infer<typeof ServiceWorkerConfigSchema>;
export type InstallPromptConfig = z.infer<typeof InstallPromptConfigSchema>;
export type OfflineIndicatorConfig = z.infer<typeof OfflineIndicatorConfigSchema>;
export type PWAModuleConfig = z.infer<typeof PWAConfigSchema>;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_PWA_CONFIG: PWAModuleConfig = {
  name: "My PWA App",
  shortName: "MyPWA",
  description: "An offline-first Progressive Web App",
  themeColor: "#2196F3",
  backgroundColor: "#FFFFFF",
  display: "standalone",
  orientation: "any",
  startUrl: "/",
  scope: "/",
  categories: [],
  icons: [],
  serviceWorker: {
    enabled: true,
    precacheAssets: true,
    runtimeCaching: [
      {
        pattern: "^https://fonts\\.googleapis\\.com/",
        strategy: "stale-while-revalidate",
        maxAgeSeconds: 86400,
      },
      {
        pattern: "^https://fonts\\.gstatic\\.com/",
        strategy: "cache-first",
        maxAgeSeconds: 31536000,
        maxEntries: 30,
      },
      {
        pattern: "/api/",
        strategy: "network-first",
        maxAgeSeconds: 300,
      },
    ],
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
  },
  installPrompt: {
    enabled: true,
    delay: 30000,
    showOnVisit: 2,
    customPrompt: true,
    promptTitle: "Install App",
    promptMessage: "Add this app to your home screen for quick access!",
    promptInstallButton: "Install",
    promptCancelButton: "Not now",
  },
  offlineIndicator: {
    enabled: true,
    position: "bottom",
    message: "You are offline",
    onlineMessage: "Back online",
    showDuration: 3000,
  },
  screenshots: [],
  shortcuts: [],
  relatedApplications: [],
  preferRelatedApplications: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate standard icon configurations from a base path
 */
export function generateIconConfigs(
  basePath: string = "/icons",
  includeMaskable: boolean = true
): IconConfig[] {
  const icons: IconConfig[] = [];

  // Standard icons
  for (const { size, name } of STANDARD_ICON_SIZES) {
    icons.push({
      src: `${basePath}/${name}`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    });
  }

  // Maskable icons
  if (includeMaskable) {
    for (const { size, name } of MASKABLE_ICON_SIZES) {
      icons.push({
        src: `${basePath}/${name}`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable",
      });
    }
  }

  return icons;
}

/**
 * Generate manifest.json content from config
 */
export function generateManifestContent(config: PWAModuleConfig): string {
  const manifest: Record<string, unknown> = {
    name: config.name,
    short_name: config.shortName,
    description: config.description,
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    display: config.display,
    orientation: config.orientation,
    start_url: config.startUrl,
    scope: config.scope,
    icons: config.icons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      ...(icon.purpose && { purpose: icon.purpose }),
    })),
  };

  if (config.id) {
    manifest.id = config.id;
  }

  if (config.categories.length > 0) {
    manifest.categories = config.categories;
  }

  if (config.screenshots.length > 0) {
    manifest.screenshots = config.screenshots;
  }

  if (config.shortcuts.length > 0) {
    manifest.shortcuts = config.shortcuts;
  }

  if (config.relatedApplications.length > 0) {
    manifest.related_applications = config.relatedApplications;
    manifest.prefer_related_applications = config.preferRelatedApplications;
  }

  return JSON.stringify(manifest, null, 2);
}

/**
 * Get caching strategy description
 */
export function getCachingStrategyDescription(strategy: CachingStrategy): string {
  const descriptions: Record<CachingStrategy, string> = {
    "cache-first": "Serve from cache, fallback to network",
    "network-first": "Try network first, fallback to cache",
    "stale-while-revalidate": "Serve cached content while fetching updates",
    "network-only": "Always fetch from network",
    "cache-only": "Only serve from cache",
  };
  return descriptions[strategy];
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return HexColorRegex.test(color);
}

/**
 * Ensure color has # prefix
 */
export function normalizeHexColor(color: string): string {
  if (!color.startsWith("#")) {
    return `#${color}`;
  }
  return color;
}
