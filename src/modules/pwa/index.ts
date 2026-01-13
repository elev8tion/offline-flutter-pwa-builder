/**
 * PWA Module
 *
 * Provides Progressive Web App capabilities for Flutter web applications.
 *
 * Features:
 * - Web App Manifest configuration
 * - Service Worker with caching strategies
 * - Install prompt handling
 * - Offline indicator
 * - Icon generation configuration
 * - PWA shortcuts
 */

import type { Module } from "../../core/types.js";
import { PWAModuleConfig, DEFAULT_PWA_CONFIG, PWAConfigSchema } from "./config.js";
import { pwaHooks } from "./hooks.js";
import { PWA_TOOLS, handlePWATool, type PWAToolContext } from "./tools.js";
import { PWA_TEMPLATES } from "./templates.js";

// Re-export types and utilities
export * from "./config.js";
export { pwaHooks, handlePWATool, PWA_TOOLS, PWA_TEMPLATES };
export type { PWAToolContext };

// ============================================================================
// MODULE DEFINITION
// ============================================================================

export const PWA_MODULE: Module = {
  id: "pwa",
  name: "Progressive Web App",
  version: "1.0.0",
  description: "PWA features including manifest, service worker, install prompt, and offline support",
  compatibleTargets: ["web"],
  dependencies: [],
  conflicts: [],
  configSchema: PWAConfigSchema as unknown as Record<string, unknown>,
  defaultConfig: DEFAULT_PWA_CONFIG as unknown as Record<string, unknown>,
  templates: PWA_TEMPLATES,
  assets: [
    {
      src: "generated",
      dest: "web/manifest.json",
      type: "file",
    },
    {
      src: "generated",
      dest: "web/flutter_service_worker.js",
      type: "file",
    },
    {
      src: "generated",
      dest: "web/offline.html",
      type: "file",
    },
  ],
  hooks: pwaHooks,
};

// ============================================================================
// MODULE REGISTRY HELPER
// ============================================================================

/**
 * Register the PWA module with a module system
 */
export function registerPWAModule(moduleSystem: {
  register: (module: Module) => void;
}): void {
  moduleSystem.register(PWA_MODULE);
}

// ============================================================================
// PUBSPEC DEPENDENCIES
// ============================================================================

/**
 * Flutter/Dart dependencies for PWA functionality
 * Note: Most PWA features are web-only and don't require Flutter packages
 */
export const PWA_DEPENDENCIES = {
  dependencies: {
    // connectivity_plus is used for cross-platform connectivity detection
    connectivity_plus: "^5.0.2",
  },
  devDependencies: {},
};

// ============================================================================
// INDEX.HTML INTEGRATION
// ============================================================================

/**
 * Get the meta tags to add to index.html for PWA support
 */
export function getPWAMetaTags(config: PWAModuleConfig): string {
  return `  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="${config.themeColor}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${config.shortName}">
  <meta name="application-name" content="${config.shortName}">
  <meta name="msapplication-TileColor" content="${config.themeColor}">
  <meta name="msapplication-config" content="/browserconfig.xml">

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">

  <!-- Favicons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
`;
}

/**
 * Get the service worker registration script
 */
export function getServiceWorkerScript(): string {
  return `  <!-- Service Worker Registration -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/flutter_service_worker.js')
          .then(function(registration) {
            console.log('ServiceWorker registered: ', registration.scope);
          })
          .catch(function(err) {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
  </script>
`;
}

// ============================================================================
// DEPLOYMENT CONFIGURATIONS
// ============================================================================

/**
 * Generate deployment configuration for various platforms
 */
export function generatePWADeployConfig(platform: "vercel" | "netlify" | "firebase"): string {
  // PWA needs no special headers unless combined with WASM
  // This provides basic security headers
  switch (platform) {
    case "vercel":
      return `{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/flutter_service_worker.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}`;

    case "netlify":
      return `[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/flutter_service_worker.js"
  [headers.values]
    Cache-Control = "no-cache"
    Service-Worker-Allowed = "/"
`;

    case "firebase":
      return `{
  "hosting": {
    "public": "build/web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" }
        ]
      },
      {
        "source": "/flutter_service_worker.js",
        "headers": [
          { "key": "Cache-Control", "value": "no-cache" },
          { "key": "Service-Worker-Allowed", "value": "/" }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}`;

    default:
      return "";
  }
}

// ============================================================================
// LIGHTHOUSE OPTIMIZATION TIPS
// ============================================================================

export const PWA_LIGHTHOUSE_TIPS = [
  "Ensure all icons are served (192x192 and 512x512 minimum)",
  "Include at least one maskable icon for Android",
  "Set theme_color in both manifest and meta tag",
  "Enable HTTPS (required for service workers)",
  "Implement offline fallback page",
  "Add apple-touch-icon for iOS",
  "Include screenshots for richer install experience",
  "Add shortcuts for quick actions",
  "Ensure start_url is cached by service worker",
  "Test install prompt on mobile devices",
];

export default PWA_MODULE;
