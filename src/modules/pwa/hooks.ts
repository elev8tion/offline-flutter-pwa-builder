/**
 * PWA Module Hooks
 *
 * Lifecycle hooks for the PWA module.
 */

import type { HookContext, ModuleHooks, GeneratedFile } from "../../core/types.js";
import { PWAModuleConfig, DEFAULT_PWA_CONFIG, generateIconConfigs } from "./config.js";
import { PWA_TEMPLATES } from "./templates.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get PWA config from project modules
 */
function getPWAConfig(ctx: HookContext): PWAModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "pwa");
  return {
    ...DEFAULT_PWA_CONFIG,
    ...(moduleConfig?.config as Partial<PWAModuleConfig> ?? {}),
  };
}

/**
 * Generate browserconfig.xml for Windows tiles
 */
function generateBrowserConfig(config: PWAModuleConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/icons/mstile-150x150.png"/>
      <TileColor>${config.themeColor}</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
}

/**
 * Generate robots.txt
 */
function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: /sitemap.xml`;
}

// ============================================================================
// MODULE HOOKS
// ============================================================================

export const pwaHooks: ModuleHooks = {
  /**
   * Called when module is installed
   */
  async onInstall(ctx: HookContext): Promise<void> {
    console.log(`[PWA] Installing PWA module for project: ${ctx.project.name}`);

    // Ensure web directory exists
    const webDir = `${ctx.project.name}/web`;
    if (!(await ctx.fileSystem.exists(webDir))) {
      await ctx.fileSystem.mkdir(webDir, true);
    }

    // Ensure icons directory exists
    const iconsDir = `${ctx.project.name}/web/icons`;
    if (!(await ctx.fileSystem.exists(iconsDir))) {
      await ctx.fileSystem.mkdir(iconsDir, true);
    }

    // Ensure lib/core/pwa directory exists
    const pwaLibDir = `${ctx.project.name}/lib/core/pwa`;
    if (!(await ctx.fileSystem.exists(pwaLibDir))) {
      await ctx.fileSystem.mkdir(pwaLibDir, true);
    }

    console.log("[PWA] PWA module installed successfully");
  },

  /**
   * Called before code generation
   */
  async beforeGenerate(ctx: HookContext): Promise<void> {
    console.log("[PWA] Preparing PWA generation...");

    const config = getPWAConfig(ctx);

    // Auto-generate icon configs if none provided
    if (config.icons.length === 0) {
      const moduleConfig = ctx.project.modules.find((m) => m.id === "pwa");
      if (moduleConfig) {
        (moduleConfig.config as PWAModuleConfig).icons = generateIconConfigs("/icons", true);
      }
    }
  },

  /**
   * Generate PWA files
   */
  async onGenerate(ctx: HookContext): Promise<GeneratedFile[]> {
    console.log("[PWA] Generating PWA files...");

    const config = getPWAConfig(ctx);
    const generatedFiles: GeneratedFile[] = [];

    // Generate files from templates
    for (const template of PWA_TEMPLATES) {
      try {
        const rendered = await ctx.templateEngine.render(template.id, {
          project: ctx.project,
          module: ctx.module,
          data: { config },
        });

        generatedFiles.push({
          path: rendered.path,
          content: rendered.content,
          module: "pwa",
        });
      } catch (error) {
        console.warn(`[PWA] Failed to render template ${template.id}:`, error);
      }
    }

    // Generate browserconfig.xml
    generatedFiles.push({
      path: `${ctx.project.name}/web/browserconfig.xml`,
      content: generateBrowserConfig(config),
      module: "pwa",
    });

    // Generate robots.txt
    generatedFiles.push({
      path: `${ctx.project.name}/web/robots.txt`,
      content: generateRobotsTxt(),
      module: "pwa",
    });

    // Generate PWA barrel file
    generatedFiles.push({
      path: `${ctx.project.name}/lib/core/pwa/pwa.dart`,
      content: `/// PWA Module Exports
///
/// Provides Progressive Web App functionality including
/// install prompts, offline indicators, and service worker management.

export 'install_prompt_widget.dart';
export 'offline_indicator_widget.dart';
export 'pwa_service.dart';
`,
      module: "pwa",
    });

    console.log(`[PWA] Generated ${generatedFiles.length} PWA files`);
    return generatedFiles;
  },

  /**
   * Called after code generation
   */
  async afterGenerate(ctx: HookContext): Promise<void> {
    console.log("[PWA] Post-generation tasks...");

    const config = getPWAConfig(ctx);

    // Log configuration summary
    console.log(`[PWA] Configuration Summary:
  - App Name: ${config.name}
  - Short Name: ${config.shortName}
  - Display Mode: ${config.display}
  - Theme Color: ${config.themeColor}
  - Service Worker: ${config.serviceWorker.enabled ? "Enabled" : "Disabled"}
  - Install Prompt: ${config.installPrompt.enabled ? "Enabled" : "Disabled"}
  - Offline Indicator: ${config.offlineIndicator.enabled ? "Enabled" : "Disabled"}
  - Icon Count: ${config.icons.length}
`);
  },

  /**
   * Called before build
   */
  async beforeBuild(ctx: HookContext): Promise<void> {
    console.log("[PWA] Pre-build validation...");

    const config = getPWAConfig(ctx);
    const warnings: string[] = [];

    // Validate required icons
    const requiredSizes = [192, 512];
    for (const size of requiredSizes) {
      const hasIcon = config.icons.some((icon) =>
        icon.sizes === `${size}x${size}`
      );
      if (!hasIcon) {
        warnings.push(`Missing required icon size: ${size}x${size}`);
      }
    }

    // Validate maskable icon
    const hasMaskable = config.icons.some((icon) => icon.purpose === "maskable");
    if (!hasMaskable) {
      warnings.push("No maskable icon defined - recommended for Android");
    }

    // Validate short name length
    if (config.shortName.length > 12) {
      warnings.push(`Short name "${config.shortName}" exceeds 12 characters`);
    }

    // Check service worker
    if (!config.serviceWorker.enabled) {
      warnings.push("Service Worker is disabled - offline functionality limited");
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn("[PWA] Build warnings:");
      warnings.forEach((w) => console.warn(`  - ${w}`));
    }
  },

  /**
   * Called after build
   */
  async afterBuild(_ctx: HookContext): Promise<void> {
    console.log("[PWA] Build completed");

    // Provide deployment instructions
    console.log(`[PWA] Deployment Notes:
  1. Ensure HTTPS is enabled (required for Service Workers)
  2. Configure server headers for COOP/COEP if using SharedArrayBuffer
  3. Test install prompt on mobile devices
  4. Verify offline functionality works correctly
  5. Run Lighthouse PWA audit for optimization suggestions
`);
  },
};

export default pwaHooks;
