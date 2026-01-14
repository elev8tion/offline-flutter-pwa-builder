/**
 * Design Module Tests
 */

import {
  DesignModule,
  DEFAULT_DESIGN_CONFIG,
  DesignModuleConfigSchema,
  DESIGN_TOOLS,
  DESIGN_TEMPLATES,
  hexToFlutterColor,
  hexToRgb,
  isLightColor,
  getContrastColor,
  curveToFlutter,
  isValidHexColor,
} from "../src/modules/design/index.js";

describe("Design Module", () => {
  describe("Module Definition", () => {
    it("should have correct module metadata", () => {
      expect(DesignModule.id).toBe("design");
      expect(DesignModule.name).toBe("Design Module");
      expect(DesignModule.version).toBe("1.0.0");
      expect(DesignModule.description.toLowerCase()).toContain("theme");
    });

    it("should be compatible with all platforms", () => {
      expect(DesignModule.compatibleTargets).toContain("web");
      expect(DesignModule.compatibleTargets).toContain("android");
      expect(DesignModule.compatibleTargets).toContain("ios");
    });

    it("should have hooks defined", () => {
      expect(DesignModule.hooks).toBeDefined();
      expect(DesignModule.hooks.onInstall).toBeDefined();
      expect(DesignModule.hooks.onGenerate).toBeDefined();
    });

    it("should have templates", () => {
      expect(DesignModule.templates.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should have valid default config", () => {
      expect(DEFAULT_DESIGN_CONFIG).toBeDefined();
      expect(DEFAULT_DESIGN_CONFIG.theme).toBeDefined();
      expect(DEFAULT_DESIGN_CONFIG.theme.name).toBe("AppTheme");
    });

    it("should have color palette", () => {
      const { colors } = DEFAULT_DESIGN_CONFIG.theme;
      expect(colors.primary).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.accent).toBeDefined();
      expect(colors.background).toBeDefined();
      expect(colors.surface).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.info).toBeDefined();
    });

    it("should have typography config", () => {
      const { typography } = DEFAULT_DESIGN_CONFIG.theme;
      expect(typography.fontFamily).toBe("Roboto");
      expect(typography.headlineLarge).toBe(32);
      expect(typography.bodyMedium).toBe(14);
    });

    it("should have spacing config", () => {
      const { spacing } = DEFAULT_DESIGN_CONFIG.theme;
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
    });

    it("should have border radius config", () => {
      const { borderRadius } = DEFAULT_DESIGN_CONFIG.theme;
      expect(borderRadius.none).toBe(0);
      expect(borderRadius.sm).toBe(4);
      expect(borderRadius.md).toBe(8);
      expect(borderRadius.lg).toBe(16);
      expect(borderRadius.full).toBe(9999);
    });

    it("should support Material 3", () => {
      expect(DEFAULT_DESIGN_CONFIG.theme.useMaterial3).toBe(true);
    });

    it("should support dark mode", () => {
      expect(DEFAULT_DESIGN_CONFIG.theme.supportDarkMode).toBe(true);
    });
  });

  describe("Schema Validation", () => {
    it("should validate correct config", () => {
      const result = DesignModuleConfigSchema.safeParse(DEFAULT_DESIGN_CONFIG);
      expect(result.success).toBe(true);
    });

    it("should accept custom theme name", () => {
      const config = {
        ...DEFAULT_DESIGN_CONFIG,
        theme: {
          ...DEFAULT_DESIGN_CONFIG.theme,
          name: "CustomTheme",
        },
      };
      const result = DesignModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should accept custom colors", () => {
      const config = {
        ...DEFAULT_DESIGN_CONFIG,
        theme: {
          ...DEFAULT_DESIGN_CONFIG.theme,
          colors: {
            ...DEFAULT_DESIGN_CONFIG.theme.colors,
            primary: "#FF5722",
          },
        },
      };
      const result = DesignModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("Tools", () => {
    it("should export design tools", () => {
      expect(DESIGN_TOOLS).toBeDefined();
      expect(Array.isArray(DESIGN_TOOLS)).toBe(true);
      expect(DESIGN_TOOLS.length).toBe(13); // 3 original + 3 EDC tools + 3 glass component tools + 4 visual effects tools
    });

    it("should have design_generate_theme tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_theme");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("theme");
    });

    it("should have design_create_animation tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_create_animation");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("animation");
    });

    it("should have design_generate_tokens tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_tokens");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("token");
    });

    it("should have design_generate_shadows tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_shadows");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("shadow");
    });

    it("should have design_generate_text_shadows tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_text_shadows");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("text shadow");
    });

    it("should have design_generate_noise_overlay tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_noise_overlay");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("noise");
    });

    it("should have design_generate_light_simulation tool", () => {
      const tool = DESIGN_TOOLS.find((t) => t.name === "design_generate_light_simulation");
      expect(tool).toBeDefined();
      expect(tool?.description?.toLowerCase()).toContain("light");
    });

    it("should have valid input schemas for all tools", () => {
      DESIGN_TOOLS.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe("Templates", () => {
    it("should export templates", () => {
      expect(DESIGN_TEMPLATES).toBeDefined();
      expect(Array.isArray(DESIGN_TEMPLATES)).toBe(true);
      expect(DESIGN_TEMPLATES.length).toBeGreaterThan(0);
    });

    it("should have design-theme template", () => {
      const template = DESIGN_TEMPLATES.find((t) => t.id === "design-theme");
      expect(template).toBeDefined();
      expect(template?.type).toBe("file");
    });

    it("should have design-tokens template", () => {
      const template = DESIGN_TEMPLATES.find((t) => t.id === "design-tokens");
      expect(template).toBeDefined();
    });

    it("should have design-color-extensions template", () => {
      const template = DESIGN_TEMPLATES.find((t) => t.id === "design-color-extensions");
      expect(template).toBeDefined();
    });

    it("should have design-spacing template", () => {
      const template = DESIGN_TEMPLATES.find((t) => t.id === "design-spacing");
      expect(template).toBeDefined();
    });

    it("should have design-animation template", () => {
      const template = DESIGN_TEMPLATES.find((t) => t.id === "design-animation");
      expect(template).toBeDefined();
    });

    it("should have valid output paths", () => {
      DESIGN_TEMPLATES.forEach((template) => {
        expect(template.output).toBeDefined();
        expect(template.output.path).toBeDefined();
        expect(template.output.filename).toBeDefined();
        expect(template.output.extension).toBe("dart");
      });
    });
  });

  describe("Helper Functions", () => {
    describe("hexToFlutterColor", () => {
      it("should convert hex to Flutter Color", () => {
        expect(hexToFlutterColor("#2196F3")).toBe("Color(0xFF2196F3)");
        expect(hexToFlutterColor("#FF5722")).toBe("Color(0xFFFF5722)");
      });

      it("should handle lowercase hex", () => {
        expect(hexToFlutterColor("#ff5722")).toBe("Color(0xFFFF5722)");
      });

      it("should handle hex without #", () => {
        expect(hexToFlutterColor("2196F3")).toBe("Color(0xFF2196F3)");
      });
    });

    describe("hexToRgb", () => {
      it("should convert hex to RGB object", () => {
        const rgb = hexToRgb("#FF0000");
        expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
      });

      it("should convert white", () => {
        const rgb = hexToRgb("#FFFFFF");
        expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
      });

      it("should convert black", () => {
        const rgb = hexToRgb("#000000");
        expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
      });

      it("should return null for invalid hex", () => {
        expect(hexToRgb("invalid")).toBeNull();
      });
    });

    describe("isLightColor", () => {
      it("should identify light colors", () => {
        expect(isLightColor("#FFFFFF")).toBe(true);
        expect(isLightColor("#FFFF00")).toBe(true);
      });

      it("should identify dark colors", () => {
        expect(isLightColor("#000000")).toBe(false);
        expect(isLightColor("#0000FF")).toBe(false);
      });
    });

    describe("getContrastColor", () => {
      it("should return black for light backgrounds", () => {
        expect(getContrastColor("#FFFFFF")).toBe("#000000");
      });

      it("should return white for dark backgrounds", () => {
        expect(getContrastColor("#000000")).toBe("#FFFFFF");
      });
    });

    describe("curveToFlutter", () => {
      it("should convert curve types to Flutter constants", () => {
        expect(curveToFlutter("linear")).toBe("Curves.linear");
        expect(curveToFlutter("easeIn")).toBe("Curves.easeIn");
        expect(curveToFlutter("easeOut")).toBe("Curves.easeOut");
        expect(curveToFlutter("easeInOut")).toBe("Curves.easeInOut");
        expect(curveToFlutter("bounceIn")).toBe("Curves.bounceIn");
        expect(curveToFlutter("bounceOut")).toBe("Curves.bounceOut");
        expect(curveToFlutter("elastic")).toBe("Curves.elasticOut");
      });
    });

    describe("isValidHexColor", () => {
      it("should validate correct hex colors", () => {
        expect(isValidHexColor("#2196F3")).toBe(true);
        expect(isValidHexColor("#ff5722")).toBe(true);
        expect(isValidHexColor("#000000")).toBe(true);
        expect(isValidHexColor("#FFFFFF")).toBe(true);
      });

      it("should reject invalid hex colors", () => {
        expect(isValidHexColor("2196F3")).toBe(false);
        expect(isValidHexColor("#2196")).toBe(false);
        expect(isValidHexColor("#2196F3FF")).toBe(false);
        expect(isValidHexColor("invalid")).toBe(false);
        expect(isValidHexColor("")).toBe(false);
      });
    });
  });
});
