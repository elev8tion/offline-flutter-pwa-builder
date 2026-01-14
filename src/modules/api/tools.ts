/**
 * API Module Tools
 *
 * MCP tool definitions and handlers for API client and mock server generation
 */

import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ProjectDefinition } from "../../core/types.js";
import {
  ApiModuleConfig,
  JsonModelConfig,
  EndpointConfig,
  jsonTypeToDart,
  classNameToFileName,
  toCamelCase,
} from "./config.js";

// ============================================================================
// ZOD SCHEMAS FOR TOOL INPUTS
// ============================================================================

export const GenerateApiClientInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  baseUrl: z.string().describe("API base URL"),
  authType: z.enum(["none", "bearer", "basic", "apiKey", "oauth2"]).optional().describe("Authentication type"),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    description: z.string().optional(),
  })).describe("API endpoints to generate"),
});

export const CreateMockServerInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  port: z.number().describe("Server port"),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.string(),
    response: z.record(z.unknown()).optional(),
    delay: z.number().optional(),
  })).describe("Mock endpoints"),
  useFaker: z.boolean().optional().describe("Use Faker for mock data"),
  delayMs: z.number().optional().describe("Default response delay"),
});

export const GenerateJsonModelInputSchema = z.object({
  projectId: z.string().describe("Project ID"),
  className: z.string().describe("Model class name"),
  schema: z.record(z.unknown()).describe("JSON schema with properties"),
  includeFromJson: z.boolean().optional().describe("Generate fromJson factory"),
  includeToJson: z.boolean().optional().describe("Generate toJson method"),
  immutable: z.boolean().optional().describe("Make fields final"),
  generateRepository: z.boolean().optional().describe("Generate repository class"),
});

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const API_TOOLS: Tool[] = [
  {
    name: "api_generate_client",
    description: "Generate a Dio-based API client with interceptors, error handling, and retry logic for Flutter.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        baseUrl: { type: "string", description: "API base URL" },
        authType: {
          type: "string",
          enum: ["none", "bearer", "basic", "apiKey", "oauth2"],
          description: "Authentication type",
        },
        endpoints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
              description: { type: "string" },
            },
          },
          description: "API endpoints",
        },
      },
      required: ["projectId", "baseUrl", "endpoints"],
    },
  },
  {
    name: "api_create_mock_server",
    description: "Create a mock server with configurable endpoints for development and testing.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        port: { type: "number", description: "Server port" },
        endpoints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
              method: { type: "string" },
              response: { type: "object" },
              delay: { type: "number" },
            },
          },
          description: "Mock endpoints",
        },
        useFaker: { type: "boolean", description: "Use Faker for data" },
        delayMs: { type: "number", description: "Response delay" },
      },
      required: ["projectId", "port", "endpoints"],
    },
  },
  {
    name: "api_generate_json_model",
    description: "Generate JSON-serializable Dart model from schema with optional repository.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        className: { type: "string", description: "Model class name" },
        schema: { type: "object", description: "JSON schema" },
        includeFromJson: { type: "boolean", description: "Include fromJson" },
        includeToJson: { type: "boolean", description: "Include toJson" },
        immutable: { type: "boolean", description: "Make immutable" },
        generateRepository: { type: "boolean", description: "Generate repository" },
      },
      required: ["projectId", "className", "schema"],
    },
  },
];

// ============================================================================
// TOOL CONTEXT TYPE
// ============================================================================

export interface ApiToolContext {
  getProject: (id: string) => ProjectDefinition | undefined;
  getApiConfig: (id: string) => ApiModuleConfig | undefined;
  updateApiConfig: (id: string, config: Partial<ApiModuleConfig>) => void;
}

// ============================================================================
// TOOL HANDLERS
// ============================================================================

async function handleGenerateApiClient(
  args: unknown,
  ctx: ApiToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateApiClientInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const config = ctx.getApiConfig(input.projectId);
  const authType = input.authType || config?.client.authType || "none";

  // Generate API client code
  const apiClientCode = generateApiClientCode(input.baseUrl, authType, input.endpoints);
  const interceptorCode = generateInterceptorCode(authType);
  const errorHandlerCode = generateErrorHandlerCode();

  // Update config
  ctx.updateApiConfig(input.projectId, {
    client: {
      ...config?.client,
      baseUrl: input.baseUrl,
      authType: authType as ApiModuleConfig["client"]["authType"],
      timeout: config?.client?.timeout || 30000,
      retryAttempts: config?.client?.retryAttempts || 3,
      retryDelay: config?.client?.retryDelay || 1000,
      headers: config?.client?.headers || {},
    },
  });

  return {
    content: [
      {
        type: "text",
        text: `Generated API Client for ${project.name}

Base URL: ${input.baseUrl}
Auth Type: ${authType}
Endpoints: ${input.endpoints.length}

lib/core/api/api_client.dart:
\`\`\`dart
${apiClientCode}
\`\`\`

lib/core/api/interceptors.dart:
\`\`\`dart
${interceptorCode}
\`\`\`

lib/core/api/error_handler.dart:
\`\`\`dart
${errorHandlerCode}
\`\`\``,
      },
    ],
  };
}

async function handleCreateMockServer(
  args: unknown,
  ctx: ApiToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = CreateMockServerInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const useFaker = input.useFaker ?? true;
  const delayMs = input.delayMs ?? 200;

  // Generate mock server code
  const mockServerCode = generateMockServerCode(input.port, input.endpoints, useFaker, delayMs);

  // Update config
  ctx.updateApiConfig(input.projectId, {
    mockServer: {
      port: input.port,
      endpoints: input.endpoints.map(e => ({
        path: e.path,
        method: e.method.toUpperCase() as EndpointConfig["method"],
        responseBody: e.response,
        delay: e.delay,
      })),
      useFaker,
      delayMs,
      corsEnabled: true,
    },
  });

  return {
    content: [
      {
        type: "text",
        text: `Generated Mock Server for ${project.name}

Port: ${input.port}
Endpoints: ${input.endpoints.length}
Faker: ${useFaker ? "Enabled" : "Disabled"}
Default Delay: ${delayMs}ms

mock_server/server.dart:
\`\`\`dart
${mockServerCode}
\`\`\`

Run with: dart run mock_server/server.dart`,
      },
    ],
  };
}

async function handleGenerateJsonModel(
  args: unknown,
  ctx: ApiToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const input = GenerateJsonModelInputSchema.parse(args);

  const project = ctx.getProject(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const includeFromJson = input.includeFromJson ?? true;
  const includeToJson = input.includeToJson ?? true;
  const immutable = input.immutable ?? true;
  const generateRepository = input.generateRepository ?? true;

  // Parse schema properties
  const schema = input.schema as { properties?: Record<string, { type?: string }>; required?: string[] };
  const properties = schema.properties || {};
  const required = schema.required || [];

  const fields = Object.entries(properties).map(([name, prop]) => ({
    name: toCamelCase(name),
    type: prop.type || "string",
    nullable: !required.includes(name),
  }));

  // Generate model code
  const modelCode = generateModelCode(input.className, fields, includeFromJson, includeToJson, immutable);

  let repositoryCode = "";
  if (generateRepository) {
    repositoryCode = generateRepositoryCode(input.className);
  }

  // Update config with new model
  const config = ctx.getApiConfig(input.projectId);
  const existingModels = config?.models || [];
  const modelConfig: JsonModelConfig = {
    className: input.className,
    fields: fields.map(f => ({
      name: f.name,
      type: f.type as JsonModelConfig["fields"][0]["type"],
      nullable: f.nullable,
    })),
    includeFromJson,
    includeToJson,
    immutable,
    generateRepository,
  };

  ctx.updateApiConfig(input.projectId, {
    models: [...existingModels, modelConfig],
  });

  return {
    content: [
      {
        type: "text",
        text: `Generated JSON Model: ${input.className}

Fields: ${fields.length}
Immutable: ${immutable}
Repository: ${generateRepository ? "Yes" : "No"}

lib/models/${classNameToFileName(input.className)}.dart:
\`\`\`dart
${modelCode}
\`\`\`

${generateRepository ? `lib/repositories/${classNameToFileName(input.className)}_repository.dart:
\`\`\`dart
${repositoryCode}
\`\`\`` : ""}`,
      },
    ],
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleApiTool(
  toolName: string,
  args: unknown,
  ctx: ApiToolContext
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  switch (toolName) {
    case "api_generate_client":
      return handleGenerateApiClient(args, ctx);
    case "api_create_mock_server":
      return handleCreateMockServer(args, ctx);
    case "api_generate_json_model":
      return handleGenerateJsonModel(args, ctx);
    default:
      throw new Error(`Unknown API tool: ${toolName}`);
  }
}

// ============================================================================
// CODE GENERATORS
// ============================================================================

function generateApiClientCode(
  baseUrl: string,
  authType: string,
  endpoints: Array<{ path: string; method: string; description?: string }>
): string {
  return `import 'package:dio/dio.dart';
import 'interceptors.dart';
import 'error_handler.dart';

class ApiClient {
  late final Dio _dio;
  final String baseUrl;

  ApiClient({this.baseUrl = '${baseUrl}'}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.addAll([
      LoggingInterceptor(),
      ${authType !== "none" ? "AuthInterceptor()," : ""}
      RetryInterceptor(dio: _dio),
    ]);
  }

  ${endpoints.map(e => `
  /// ${e.description || `${e.method} ${e.path}`}
  Future<Response> ${toCamelCase(e.method.toLowerCase() + e.path.replace(/\//g, "_").replace(/[{}:]/g, ""))}(${e.method !== "GET" ? "{Map<String, dynamic>? data}" : ""}) async {
    try {
      return await _dio.${e.method.toLowerCase()}('${e.path}'${e.method !== "GET" ? ", data: data" : ""});
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }`).join("\n")}

  /// Generic GET request
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }

  /// Generic POST request
  Future<Response> post(String path, {Map<String, dynamic>? data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }

  /// Generic PUT request
  Future<Response> put(String path, {Map<String, dynamic>? data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }

  /// Generic DELETE request
  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }
}`;
}

function generateInterceptorCode(authType: string): string {
  return `import 'package:dio/dio.dart';

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    print('REQUEST[\${options.method}] => PATH: \${options.path}');
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    print('RESPONSE[\${response.statusCode}] => PATH: \${response.requestOptions.path}');
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    print('ERROR[\${err.response?.statusCode}] => PATH: \${err.requestOptions.path}');
    super.onError(err, handler);
  }
}

${authType !== "none" ? `class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // TODO: Add your auth token here
    // options.headers['Authorization'] = 'Bearer \$token';
    super.onRequest(options, handler);
  }
}` : ""}

class RetryInterceptor extends Interceptor {
  final Dio dio;
  final int maxRetries;

  RetryInterceptor({required this.dio, this.maxRetries = 3});

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err) && err.requestOptions.extra['retryCount'] == null) {
      err.requestOptions.extra['retryCount'] = 0;
    }

    final retryCount = err.requestOptions.extra['retryCount'] ?? 0;
    if (_shouldRetry(err) && retryCount < maxRetries) {
      err.requestOptions.extra['retryCount'] = retryCount + 1;
      await Future.delayed(Duration(milliseconds: 1000 * (retryCount + 1)));

      try {
        final response = await dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } catch (e) {
        return super.onError(err, handler);
      }
    }
    return super.onError(err, handler);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        (err.response?.statusCode ?? 0) >= 500;
  }
}`;
}

function generateErrorHandlerCode(): string {
  return `import 'package:dio/dio.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ApiException({
    required this.message,
    this.statusCode,
    this.data,
  });

  @override
  String toString() => 'ApiException: \$message (Status: \$statusCode)';
}

class ApiErrorHandler {
  static ApiException handle(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        return ApiException(
          message: 'Connection timeout',
          statusCode: null,
        );
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Receive timeout',
          statusCode: null,
        );
      case DioExceptionType.badResponse:
        return _handleBadResponse(error.response);
      case DioExceptionType.cancel:
        return ApiException(
          message: 'Request cancelled',
          statusCode: null,
        );
      default:
        return ApiException(
          message: error.message ?? 'Unknown error',
          statusCode: null,
        );
    }
  }

  static ApiException _handleBadResponse(Response? response) {
    final statusCode = response?.statusCode ?? 0;
    final data = response?.data;

    switch (statusCode) {
      case 400:
        return ApiException(message: 'Bad request', statusCode: 400, data: data);
      case 401:
        return ApiException(message: 'Unauthorized', statusCode: 401, data: data);
      case 403:
        return ApiException(message: 'Forbidden', statusCode: 403, data: data);
      case 404:
        return ApiException(message: 'Not found', statusCode: 404, data: data);
      case 500:
        return ApiException(message: 'Internal server error', statusCode: 500, data: data);
      default:
        return ApiException(message: 'Server error', statusCode: statusCode, data: data);
    }
  }
}`;
}

function generateMockServerCode(
  port: number,
  endpoints: Array<{ path: string; method: string; response?: Record<string, unknown>; delay?: number }>,
  useFaker: boolean,
  delayMs: number
): string {
  return `import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart';
import 'dart:convert';
import 'dart:async';
${useFaker ? "import 'package:faker/faker.dart';" : ""}

class MockServer {
  final int port;
  final Router _router = Router();
  ${useFaker ? "final faker = Faker();" : ""}

  MockServer({this.port = ${port}});

  void setupRoutes() {
    ${endpoints.map(e => `
    _router.${e.method.toLowerCase()}('${e.path}', (Request request) async {
      await Future.delayed(const Duration(milliseconds: ${e.delay || delayMs}));

      final response = ${useFaker ? `{
        'id': faker.guid.guid(),
        'createdAt': DateTime.now().toIso8601String(),
        ...${JSON.stringify(e.response || {})}
      }` : JSON.stringify(e.response || {})};

      return Response.ok(
        jsonEncode(response),
        headers: {'Content-Type': 'application/json'},
      );
    });`).join("")}

    // Health check
    _router.get('/health', (Request request) {
      return Response.ok(
        jsonEncode({'status': 'healthy', 'timestamp': DateTime.now().toIso8601String()}),
        headers: {'Content-Type': 'application/json'},
      );
    });

    // 404 handler
    _router.all('/<ignored|.*>', (Request request) {
      return Response.notFound(
        jsonEncode({'error': 'Endpoint not found'}),
        headers: {'Content-Type': 'application/json'},
      );
    });
  }

  Future<void> start() async {
    setupRoutes();

    final handler = Pipeline()
        .addMiddleware(logRequests())
        .addHandler(_router);

    final server = await io.serve(handler, 'localhost', port);
    print('Mock server running on http://localhost:\$port');
  }
}

void main() async {
  final server = MockServer(port: ${port});
  await server.start();
}`;
}

function generateModelCode(
  className: string,
  fields: Array<{ name: string; type: string; nullable: boolean }>,
  includeFromJson: boolean,
  includeToJson: boolean,
  immutable: boolean
): string {
  return `import 'package:json_annotation/json_annotation.dart';

part '${classNameToFileName(className)}.g.dart';

@JsonSerializable()
class ${className} {
  ${fields.map(f => `${immutable ? "final " : ""}${jsonTypeToDart(f.type, f.nullable)} ${f.name};`).join("\n  ")}

  ${immutable ? "const " : ""}${className}({
    ${fields.map(f => `${f.nullable ? "" : "required "}this.${f.name},`).join("\n    ")}
  });

  ${includeFromJson ? `factory ${className}.fromJson(Map<String, dynamic> json) =>
      _$${className}FromJson(json);` : ""}

  ${includeToJson ? `Map<String, dynamic> toJson() => _$${className}ToJson(this);` : ""}

  ${immutable ? `${className} copyWith({
    ${fields.map(f => `${jsonTypeToDart(f.type, true)} ${f.name},`).join("\n    ")}
  }) {
    return ${className}(
      ${fields.map(f => `${f.name}: ${f.name} ?? this.${f.name},`).join("\n      ")}
    );
  }` : ""}

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ${className} &&
        ${fields.map(f => `other.${f.name} == ${f.name}`).join(" &&\n        ")};
  }

  @override
  int get hashCode => ${fields.map(f => `${f.name}.hashCode`).join(" ^ ")};

  @override
  String toString() => '${className}(${fields.map(f => `${f.name}: \$${f.name}`).join(", ")})';
}`;
}

function generateRepositoryCode(className: string): string {
  const lowerName = classNameToFileName(className);
  return `import 'package:dio/dio.dart';
import '../models/${lowerName}.dart';

class ${className}Repository {
  final Dio _dio;
  final String baseUrl;

  ${className}Repository({
    required this.baseUrl,
    Dio? dio,
  }) : _dio = dio ?? Dio();

  Future<List<${className}>> getAll() async {
    try {
      final response = await _dio.get('\$baseUrl/${lowerName}s');
      return (response.data as List)
          .map((json) => ${className}.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Failed to load ${className}s: \$e');
    }
  }

  Future<${className}> getById(String id) async {
    try {
      final response = await _dio.get('\$baseUrl/${lowerName}s/\$id');
      return ${className}.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to load ${className}: \$e');
    }
  }

  Future<${className}> create(${className} item) async {
    try {
      final response = await _dio.post(
        '\$baseUrl/${lowerName}s',
        data: item.toJson(),
      );
      return ${className}.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to create ${className}: \$e');
    }
  }

  Future<${className}> update(String id, ${className} item) async {
    try {
      final response = await _dio.put(
        '\$baseUrl/${lowerName}s/\$id',
        data: item.toJson(),
      );
      return ${className}.fromJson(response.data);
    } catch (e) {
      throw Exception('Failed to update ${className}: \$e');
    }
  }

  Future<void> delete(String id) async {
    try {
      await _dio.delete('\$baseUrl/${lowerName}s/\$id');
    } catch (e) {
      throw Exception('Failed to delete ${className}: \$e');
    }
  }
}`;
}
