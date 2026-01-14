/**
 * API Module Tests
 */

import {
  ApiModule,
  DEFAULT_API_CONFIG,
  ApiModuleConfigSchema,
  API_TOOLS,
  API_TEMPLATES,
  jsonTypeToDart,
  classNameToFileName,
  toPascalCase,
  toCamelCase,
  getMethodColor,
  isValidEndpointPath,
} from "../src/modules/api/index.js";

describe("API Module", () => {
  describe("Module Definition", () => {
    it("should have correct module metadata", () => {
      expect(ApiModule.id).toBe("api");
      expect(ApiModule.name).toBe("API Module");
      expect(ApiModule.version).toBe("1.0.0");
      expect(ApiModule.description).toContain("API");
    });

    it("should be compatible with all platforms", () => {
      expect(ApiModule.compatibleTargets).toContain("web");
      expect(ApiModule.compatibleTargets).toContain("android");
      expect(ApiModule.compatibleTargets).toContain("ios");
    });

    it("should have hooks defined", () => {
      expect(ApiModule.hooks).toBeDefined();
      expect(ApiModule.hooks.onInstall).toBeDefined();
      expect(ApiModule.hooks.onGenerate).toBeDefined();
    });

    it("should have templates", () => {
      expect(ApiModule.templates.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should have valid default config", () => {
      expect(DEFAULT_API_CONFIG).toBeDefined();
      expect(DEFAULT_API_CONFIG.client).toBeDefined();
      expect(DEFAULT_API_CONFIG.client.baseUrl).toBe("http://localhost:3000/api");
      expect(DEFAULT_API_CONFIG.client.timeout).toBe(30000);
    });

    it("should have default auth type as none", () => {
      expect(DEFAULT_API_CONFIG.client.authType).toBe("none");
    });

    it("should have mock server config", () => {
      expect(DEFAULT_API_CONFIG.mockServer).toBeDefined();
      expect(DEFAULT_API_CONFIG.mockServer.port).toBe(3001);
    });

    it("should have interceptors flag", () => {
      expect(DEFAULT_API_CONFIG.generateInterceptors).toBe(true);
    });

    it("should have error handling flag", () => {
      expect(DEFAULT_API_CONFIG.generateErrorHandling).toBe(true);
    });
  });

  describe("Schema Validation", () => {
    it("should validate correct config", () => {
      const result = ApiModuleConfigSchema.safeParse(DEFAULT_API_CONFIG);
      expect(result.success).toBe(true);
    });

    it("should accept custom base URL", () => {
      const config = {
        ...DEFAULT_API_CONFIG,
        client: {
          ...DEFAULT_API_CONFIG.client,
          baseUrl: "https://api.example.com/v1",
        },
      };
      const result = ApiModuleConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate auth types", () => {
      const authTypes = ["none", "bearer", "basic", "apiKey", "oauth2"] as const;
      authTypes.forEach((authType) => {
        const config = {
          ...DEFAULT_API_CONFIG,
          client: {
            ...DEFAULT_API_CONFIG.client,
            authType,
          },
        };
        const result = ApiModuleConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("Tools", () => {
    it("should export API tools", () => {
      expect(API_TOOLS).toBeDefined();
      expect(Array.isArray(API_TOOLS)).toBe(true);
      expect(API_TOOLS.length).toBe(3);
    });

    it("should have api_generate_client tool", () => {
      const tool = API_TOOLS.find((t) => t.name === "api_generate_client");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("API client");
    });

    it("should have api_create_mock_server tool", () => {
      const tool = API_TOOLS.find((t) => t.name === "api_create_mock_server");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("mock server");
    });

    it("should have api_generate_json_model tool", () => {
      const tool = API_TOOLS.find((t) => t.name === "api_generate_json_model");
      expect(tool).toBeDefined();
      expect(tool?.description).toContain("JSON");
    });

    it("should have valid input schemas for all tools", () => {
      API_TOOLS.forEach((tool) => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe("Templates", () => {
    it("should export templates", () => {
      expect(API_TEMPLATES).toBeDefined();
      expect(Array.isArray(API_TEMPLATES)).toBe(true);
      expect(API_TEMPLATES.length).toBeGreaterThan(0);
    });

    it("should have api-client template", () => {
      const template = API_TEMPLATES.find((t) => t.id === "api-client");
      expect(template).toBeDefined();
      expect(template?.type).toBe("file");
    });

    it("should have api-json-model template", () => {
      const template = API_TEMPLATES.find((t) => t.id === "api-json-model");
      expect(template).toBeDefined();
    });

    it("should have api-repository template", () => {
      const template = API_TEMPLATES.find((t) => t.id === "api-repository");
      expect(template).toBeDefined();
    });

    it("should have api-mock-server template", () => {
      const template = API_TEMPLATES.find((t) => t.id === "api-mock-server");
      expect(template).toBeDefined();
    });

    it("should have api-interceptors template", () => {
      const template = API_TEMPLATES.find((t) => t.id === "api-interceptors");
      expect(template).toBeDefined();
    });

    it("should have valid output paths", () => {
      API_TEMPLATES.forEach((template) => {
        expect(template.output).toBeDefined();
        expect(template.output.path).toBeDefined();
        expect(template.output.filename).toBeDefined();
        expect(template.output.extension).toBe("dart");
      });
    });
  });

  describe("Helper Functions", () => {
    describe("jsonTypeToDart", () => {
      it("should convert string type", () => {
        expect(jsonTypeToDart("string", false)).toBe("String");
      });

      it("should convert number type to double", () => {
        expect(jsonTypeToDart("number", false)).toBe("double");
      });

      it("should convert integer type to int", () => {
        expect(jsonTypeToDart("integer", false)).toBe("int");
      });

      it("should convert boolean type", () => {
        expect(jsonTypeToDart("boolean", false)).toBe("bool");
      });

      it("should convert array type", () => {
        expect(jsonTypeToDart("array", false)).toBe("List<dynamic>");
      });

      it("should convert object type", () => {
        expect(jsonTypeToDart("object", false)).toBe("Map<String, dynamic>");
      });

      it("should handle nullable types", () => {
        expect(jsonTypeToDart("string", true)).toBe("String?");
        expect(jsonTypeToDart("number", true)).toBe("double?");
        expect(jsonTypeToDart("integer", true)).toBe("int?");
      });

      it("should return dynamic for unknown types", () => {
        expect(jsonTypeToDart("unknown", false)).toBe("dynamic");
      });
    });

    describe("classNameToFileName", () => {
      it("should convert PascalCase to snake_case", () => {
        expect(classNameToFileName("UserProfile")).toBe("user_profile");
        expect(classNameToFileName("ApiResponse")).toBe("api_response");
      });
    });

    describe("toPascalCase", () => {
      it("should convert snake_case to PascalCase", () => {
        expect(toPascalCase("user_profile")).toBe("UserProfile");
        expect(toPascalCase("api_response")).toBe("ApiResponse");
      });

      it("should handle single word", () => {
        expect(toPascalCase("user")).toBe("User");
      });
    });

    describe("toCamelCase", () => {
      it("should convert snake_case to camelCase", () => {
        expect(toCamelCase("user_profile")).toBe("userProfile");
        expect(toCamelCase("api_response")).toBe("apiResponse");
      });

      it("should handle single word", () => {
        expect(toCamelCase("user")).toBe("user");
      });
    });

    describe("getMethodColor", () => {
      it("should return colors for HTTP methods", () => {
        expect(getMethodColor("GET")).toBeDefined();
        expect(getMethodColor("POST")).toBeDefined();
        expect(getMethodColor("PUT")).toBeDefined();
        expect(getMethodColor("DELETE")).toBeDefined();
      });

      it("should return different colors for different methods", () => {
        expect(getMethodColor("GET")).not.toBe(getMethodColor("DELETE"));
      });
    });

    describe("isValidEndpointPath", () => {
      it("should validate valid paths", () => {
        expect(isValidEndpointPath("/api/users")).toBe(true);
        expect(isValidEndpointPath("/users/:id")).toBe(true);
        expect(isValidEndpointPath("/api/v1/products")).toBe(true);
      });

      it("should reject invalid paths", () => {
        expect(isValidEndpointPath("api/users")).toBe(false);
        expect(isValidEndpointPath("")).toBe(false);
      });
    });
  });
});
