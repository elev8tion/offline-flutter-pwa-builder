/**
 * API Module Templates
 *
 * Handlebars templates for API code generation
 */

import type { Template } from "../../core/types.js";

// ============================================================================
// TEMPLATE SOURCES
// ============================================================================

const API_CLIENT_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Client for {{projectName}}

import 'package:dio/dio.dart';

class ApiClient {
  late final Dio _dio;
  final String baseUrl;

  ApiClient({this.baseUrl = '{{baseUrl}}'}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(milliseconds: {{timeout}}),
      receiveTimeout: const Duration(milliseconds: {{timeout}}),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
  }

  Dio get dio => _dio;
}
`;

const JSON_MODEL_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Model: {{className}}

import 'package:json_annotation/json_annotation.dart';

part '{{fileName}}.g.dart';

@JsonSerializable()
class {{className}} {
  {{#each fields}}
  {{#if ../immutable}}final {{/if}}{{dartType type nullable}} {{name}};
  {{/each}}

  {{#if immutable}}const {{/if}}{{className}}({
    {{#each fields}}
    {{#unless nullable}}required {{/unless}}this.{{name}},
    {{/each}}
  });

  {{#if includeFromJson}}
  factory {{className}}.fromJson(Map<String, dynamic> json) =>
      _\${{className}}FromJson(json);
  {{/if}}

  {{#if includeToJson}}
  Map<String, dynamic> toJson() => _\${{className}}ToJson(this);
  {{/if}}
}
`;

const REPOSITORY_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Repository: {{className}}Repository

import 'package:dio/dio.dart';
import '{{modelImport}}';

class {{className}}Repository {
  final Dio _dio;
  final String baseUrl;

  {{className}}Repository({
    required this.baseUrl,
    Dio? dio,
  }) : _dio = dio ?? Dio();

  Future<List<{{className}}>> getAll() async {
    final response = await _dio.get('\$baseUrl/{{endpoint}}');
    return (response.data as List)
        .map((json) => {{className}}.fromJson(json))
        .toList();
  }

  Future<{{className}}> getById(String id) async {
    final response = await _dio.get('\$baseUrl/{{endpoint}}/\$id');
    return {{className}}.fromJson(response.data);
  }

  Future<{{className}}> create({{className}} item) async {
    final response = await _dio.post(
      '\$baseUrl/{{endpoint}}',
      data: item.toJson(),
    );
    return {{className}}.fromJson(response.data);
  }

  Future<{{className}}> update(String id, {{className}} item) async {
    final response = await _dio.put(
      '\$baseUrl/{{endpoint}}/\$id',
      data: item.toJson(),
    );
    return {{className}}.fromJson(response.data);
  }

  Future<void> delete(String id) async {
    await _dio.delete('\$baseUrl/{{endpoint}}/\$id');
  }
}
`;

const MOCK_SERVER_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// Mock Server

import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as io;
import 'package:shelf_router/shelf_router.dart';
import 'dart:convert';
import 'dart:async';

class MockServer {
  final int port;
  final Router _router = Router();

  MockServer({this.port = {{port}}});

  void setupRoutes() {
    {{#each endpoints}}
    _router.{{lowercase method}}('{{path}}', (Request request) async {
      {{#if delay}}
      await Future.delayed(const Duration(milliseconds: {{delay}}));
      {{/if}}
      return Response.ok(
        jsonEncode({{json response}}),
        headers: {'Content-Type': 'application/json'},
      );
    });
    {{/each}}

    _router.get('/health', (Request request) {
      return Response.ok(
        jsonEncode({'status': 'healthy'}),
        headers: {'Content-Type': 'application/json'},
      );
    });
  }

  Future<void> start() async {
    setupRoutes();
    final handler = Pipeline()
        .addMiddleware(logRequests())
        .addHandler(_router);

    await io.serve(handler, 'localhost', port);
    print('Mock server running on http://localhost:\$port');
  }
}
`;

const INTERCEPTORS_SOURCE = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Interceptors

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('[API] \${options.method} \${options.uri}');
    }
    super.onRequest(options, handler);
  }
}

class AuthInterceptor extends Interceptor {
  String? _token;

  void setToken(String token) => _token = token;
  void clearToken() => _token = null;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_token != null) {
      options.headers['Authorization'] = 'Bearer \$_token';
    }
    super.onRequest(options, handler);
  }
}
`;

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const API_TEMPLATES: Template[] = [
  {
    id: "api-client",
    name: "API Client",
    description: "Dio-based API client with configuration",
    type: "file",
    source: API_CLIENT_SOURCE,
    output: {
      path: "lib/core/api",
      filename: "api_client",
      extension: "dart",
    },
  },
  {
    id: "api-json-model",
    name: "JSON Model",
    description: "JSON-serializable Dart model class",
    type: "file",
    source: JSON_MODEL_SOURCE,
    output: {
      path: "lib/models",
      filename: "{{snakeCase className}}",
      extension: "dart",
    },
  },
  {
    id: "api-repository",
    name: "Repository",
    description: "Repository pattern for API data access",
    type: "file",
    source: REPOSITORY_SOURCE,
    output: {
      path: "lib/repositories",
      filename: "{{snakeCase className}}_repository",
      extension: "dart",
    },
  },
  {
    id: "api-mock-server",
    name: "Mock Server",
    description: "Shelf-based mock server for development",
    type: "file",
    source: MOCK_SERVER_SOURCE,
    output: {
      path: "mock_server",
      filename: "server",
      extension: "dart",
    },
  },
  {
    id: "api-interceptors",
    name: "API Interceptors",
    description: "Dio interceptors for logging and auth",
    type: "file",
    source: INTERCEPTORS_SOURCE,
    output: {
      path: "lib/core/api",
      filename: "interceptors",
      extension: "dart",
    },
  },
];

export default API_TEMPLATES;
