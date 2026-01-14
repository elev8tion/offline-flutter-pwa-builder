/**
 * API Module Hooks
 *
 * Lifecycle hooks for the API module
 */

import type {
  HookContext,
  GeneratedFile,
  ModuleHooks,
} from "../../core/types.js";
import {
  ApiModuleConfig,
  DEFAULT_API_CONFIG,
} from "./config.js";

// ============================================================================
// HANDLEBARS HELPERS FOR API TEMPLATES
// ============================================================================

export function registerApiHelpers(handlebars: typeof import("handlebars")): void {
  // HTTP method badge
  handlebars.registerHelper("methodBadge", (method: string) => {
    const badges: Record<string, string> = {
      GET: "[GET]",
      POST: "[POST]",
      PUT: "[PUT]",
      PATCH: "[PATCH]",
      DELETE: "[DELETE]",
    };
    return badges[method] || "[?]";
  });

  // Convert to Dart type
  handlebars.registerHelper("dartType", (jsonType: string, nullable: boolean) => {
    const typeMap: Record<string, string> = {
      string: "String",
      number: "double",
      integer: "int",
      boolean: "bool",
      array: "List<dynamic>",
      object: "Map<String, dynamic>",
    };
    const dartType = typeMap[jsonType] || "dynamic";
    return nullable ? `${dartType}?` : dartType;
  });
}

// ============================================================================
// MODULE HOOKS IMPLEMENTATION
// ============================================================================

/**
 * Get API config from project modules
 */
function getApiConfig(ctx: HookContext): ApiModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "api");
  return {
    ...DEFAULT_API_CONFIG,
    ...(moduleConfig?.config as Partial<ApiModuleConfig> ?? {}),
  };
}

export const apiHooks: ModuleHooks = {
  /**
   * Called when the module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getApiConfig(ctx);
    console.log(`[API] Module installed`);
    console.log(`[API] Base URL: ${config.client.baseUrl}`);
    console.log(`[API] Auth Type: ${config.client.authType}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getApiConfig(ctx);

    // Validate config
    if (!config.client.baseUrl) {
      throw new Error("[API] Base URL is required");
    }

    console.log("[API] Preparing API client code...");
  },

  /**
   * Main code generation hook
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getApiConfig(ctx);
    const files: GeneratedFile[] = [];

    // 1. Generate API client base
    files.push(generateApiClient(config));

    // 2. Generate interceptors
    if (config.generateInterceptors) {
      files.push(generateInterceptors(config));
    }

    // 3. Generate error handler
    if (config.generateErrorHandling) {
      files.push(generateErrorHandler());
    }

    // 4. Generate API service
    files.push(generateApiService(config));

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (_ctx: HookContext): Promise<void> => {
    console.log("[API] Generated API client utilities");
    console.log("[API] Run 'dart run build_runner build' to generate JSON serialization");
  },

  /**
   * Called before build
   */
  beforeBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[API] Running pre-build API checks...");
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[API] Build completed");
  },
};

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

function generateApiClient(config: ApiModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Client Configuration

import 'package:dio/dio.dart';

class ApiClientConfig {
  static const String baseUrl = '${config.client.baseUrl}';
  static const Duration connectTimeout = Duration(milliseconds: ${config.client.timeout});
  static const Duration receiveTimeout = Duration(milliseconds: ${config.client.timeout});
  static const int maxRetries = ${config.client.retryAttempts};
  static const Duration retryDelay = Duration(milliseconds: ${config.client.retryDelay});
}

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: ApiClientConfig.baseUrl,
      connectTimeout: ApiClientConfig.connectTimeout,
      receiveTimeout: ApiClientConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
  }

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return dio.get<T>(path, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return dio.post<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return dio.put<T>(path, data: data, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    return dio.delete<T>(path, data: data, queryParameters: queryParameters, options: options);
  }
}
`;

  return {
    path: "lib/core/api/api_client.dart",
    content,
  };
}

function generateInterceptors(config: ApiModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Interceptors

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Logging interceptor for debugging
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('[API] \${options.method} \${options.uri}');
    }
    super.onRequest(options, handler);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('[API] Response: \${response.statusCode}');
    }
    super.onResponse(response, handler);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      debugPrint('[API] Error: \${err.message}');
    }
    super.onError(err, handler);
  }
}

${config.client.authType !== "none" ? `/// Authentication interceptor
class AuthInterceptor extends Interceptor {
  String? _accessToken;

  void setToken(String token) {
    _accessToken = token;
  }

  void clearToken() {
    _accessToken = null;
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_accessToken != null) {
      options.headers['Authorization'] = 'Bearer \$_accessToken';
    }
    super.onRequest(options, handler);
  }
}` : ""}

/// Retry interceptor for failed requests
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final int maxRetries;

  RetryInterceptor({
    required this.dio,
    this.maxRetries = 3,
  });

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final retryCount = err.requestOptions.extra['retryCount'] ?? 0;

    if (_shouldRetry(err) && retryCount < maxRetries) {
      err.requestOptions.extra['retryCount'] = retryCount + 1;

      await Future.delayed(Duration(milliseconds: 1000 * (retryCount + 1)));

      try {
        final response = await dio.fetch(err.requestOptions);
        return handler.resolve(response);
      } catch (_) {
        // Fall through to super
      }
    }

    super.onError(err, handler);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
           err.type == DioExceptionType.receiveTimeout ||
           (err.response?.statusCode ?? 0) >= 500;
  }
}
`;

  return {
    path: "lib/core/api/interceptors.dart",
    content,
  };
}

function generateErrorHandler(): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Error Handler

import 'package:dio/dio.dart';

/// API Exception class
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;
  final StackTrace? stackTrace;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
    this.stackTrace,
  });

  @override
  String toString() => 'ApiException: \$message (Status: \$statusCode)';

  bool get isNetworkError => statusCode == null;
  bool get isServerError => (statusCode ?? 0) >= 500;
  bool get isClientError => (statusCode ?? 0) >= 400 && (statusCode ?? 0) < 500;
  bool get isUnauthorized => statusCode == 401;
  bool get isNotFound => statusCode == 404;
}

/// API Error Handler utility
class ApiErrorHandler {
  static ApiException handle(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
        return const ApiException(
          message: 'Connection timed out',
        );
      case DioExceptionType.sendTimeout:
        return const ApiException(
          message: 'Request send timed out',
        );
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          message: 'Response timed out',
        );
      case DioExceptionType.badCertificate:
        return const ApiException(
          message: 'Invalid certificate',
        );
      case DioExceptionType.badResponse:
        return _handleBadResponse(error.response);
      case DioExceptionType.cancel:
        return const ApiException(
          message: 'Request was cancelled',
        );
      case DioExceptionType.connectionError:
        return const ApiException(
          message: 'No internet connection',
        );
      case DioExceptionType.unknown:
      default:
        return ApiException(
          message: error.message ?? 'An unknown error occurred',
        );
    }
  }

  static ApiException _handleBadResponse(Response? response) {
    final statusCode = response?.statusCode ?? 0;
    final data = response?.data;

    String message;
    switch (statusCode) {
      case 400:
        message = 'Bad request';
        break;
      case 401:
        message = 'Unauthorized';
        break;
      case 403:
        message = 'Forbidden';
        break;
      case 404:
        message = 'Resource not found';
        break;
      case 409:
        message = 'Conflict';
        break;
      case 422:
        message = 'Validation failed';
        break;
      case 429:
        message = 'Too many requests';
        break;
      case 500:
        message = 'Internal server error';
        break;
      case 502:
        message = 'Bad gateway';
        break;
      case 503:
        message = 'Service unavailable';
        break;
      default:
        message = 'Server error';
    }

    return ApiException(
      message: message,
      statusCode: statusCode,
      data: data,
    );
  }
}
`;

  return {
    path: "lib/core/api/error_handler.dart",
    content,
  };
}

function generateApiService(config: ApiModuleConfig): GeneratedFile {
  const content = `// GENERATED CODE - DO NOT MODIFY BY HAND
// API Service

import 'package:dio/dio.dart';
import 'api_client.dart';
import 'interceptors.dart';
import 'error_handler.dart';

/// Main API Service singleton
class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late final ApiClient _client;
  bool _initialized = false;

  /// Initialize the API service
  void initialize() {
    if (_initialized) return;

    _client = ApiClient();

    // Add interceptors
    _client.dio.interceptors.addAll([
      LoggingInterceptor(),
      ${config.client.authType !== "none" ? "AuthInterceptor()," : ""}
      RetryInterceptor(dio: _client.dio),
    ]);

    _initialized = true;
  }

  /// Get the Dio instance
  Dio get dio {
    if (!_initialized) {
      throw StateError('ApiService not initialized. Call initialize() first.');
    }
    return _client.dio;
  }

  /// Generic request with error handling
  Future<T> request<T>(
    String method,
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await dio.request<dynamic>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: Options(method: method),
      );

      if (fromJson != null) {
        return fromJson(response.data);
      }
      return response.data as T;
    } on DioException catch (e) {
      throw ApiErrorHandler.handle(e);
    }
  }

  /// GET request
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) {
    return request<T>('GET', path, queryParameters: queryParameters, fromJson: fromJson);
  }

  /// POST request
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) {
    return request<T>('POST', path, data: data, fromJson: fromJson);
  }

  /// PUT request
  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) {
    return request<T>('PUT', path, data: data, fromJson: fromJson);
  }

  /// DELETE request
  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) {
    return request<T>('DELETE', path, fromJson: fromJson);
  }
}
`;

  return {
    path: "lib/core/api/api_service.dart",
    content,
  };
}

export default apiHooks;
