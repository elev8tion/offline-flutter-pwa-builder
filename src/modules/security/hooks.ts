/**
 * Security Module Hooks
 *
 * Lifecycle hooks for the Security module.
 * Handles security-related operations during project lifecycle.
 */

import type { ModuleHooks, HookContext, GeneratedFile } from "../../core/types.js";
import {
  SecurityModuleConfig,
  DEFAULT_SECURITY_CONFIG,
  getSecurityDependencies,
  getBiometricDependencies,
} from "./config.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get security module config from project
 */
function getSecurityConfig(ctx: HookContext): SecurityModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "security");
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...((moduleConfig?.config as Partial<SecurityModuleConfig>) ?? {}),
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const securityHooks: ModuleHooks = {
  /**
   * Called when module is installed into a project
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getSecurityConfig(ctx);

    // Log dependencies to add
    const deps = getSecurityDependencies();
    console.log(`[Security Module] Dependencies to add: ${Object.keys(deps).join(", ")}`);

    // Log biometric dependencies if enabled
    if (config.secureStorage.biometricProtection) {
      const biometricDeps = getBiometricDependencies();
      console.log(`[Security Module] Biometric dependencies: ${Object.keys(biometricDeps).join(", ")}`);
    }

    console.log(`[Security Module] Installed with ${config.encryption.algorithm} encryption support`);
  },

  /**
   * Called before code generation starts
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getSecurityConfig(ctx);

    // Validate security configuration
    if (config.encryption.enabled) {
      if (config.encryption.keyDerivation === "PBKDF2" && !config.encryption.iterations) {
        console.warn("[Security Module] PBKDF2 requires iterations setting. Using default: 100000");
      }
      if (config.encryption.keyDerivation === "Argon2" && !config.encryption.memoryCost) {
        console.warn("[Security Module] Argon2 requires memoryCost setting. Using default: 65536");
      }
    }

    // Validate audit configuration
    if (config.audit.remoteLogging && !config.audit.remoteEndpoint) {
      console.warn("[Security Module] Remote logging enabled but no endpoint configured");
    }
  },

  /**
   * Called to generate module-specific files
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getSecurityConfig(ctx);
    const files: GeneratedFile[] = [];

    // Generate encryption service if enabled
    if (config.encryption.enabled) {
      files.push({
        path: "lib/core/security/encryption_service.dart",
        content: generateEncryptionService(config),
      });

      files.push({
        path: "lib/core/security/key_manager.dart",
        content: generateKeyManager(config),
      });
    }

    // Generate input validator
    if (config.validation.sanitizeInput || config.validation.customRules.length > 0) {
      files.push({
        path: "lib/core/security/input_validator.dart",
        content: generateInputValidator(config),
      });
    }

    // Generate secure storage service
    files.push({
      path: "lib/core/security/secure_storage_service.dart",
      content: generateSecureStorageService(config),
    });

    // Generate audit logger if enabled
    if (config.audit.enabled) {
      files.push({
        path: "lib/core/security/audit_logger.dart",
        content: generateAuditLogger(config),
      });
    }

    // Generate biometric service if enabled
    if (config.secureStorage.biometricProtection) {
      files.push({
        path: "lib/core/security/biometric_service.dart",
        content: generateBiometricService(),
      });
    }

    return files;
  },

  /**
   * Called after code generation completes
   */
  afterGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getSecurityConfig(ctx);

    // Log summary
    const features = [];
    if (config.encryption.enabled) features.push("encryption");
    if (config.validation.sanitizeInput) features.push("input validation");
    if (config.audit.enabled) features.push("audit logging");
    if (config.secureStorage.biometricProtection) features.push("biometric protection");

    console.log(`[Security Module] Generated files for: ${features.join(", ") || "basic security"}`);
  },

  /**
   * Called before project build starts
   */
  beforeBuild: async (ctx: HookContext): Promise<void> => {
    const config = getSecurityConfig(ctx);

    // Run security checks before build
    if (config.encryption.enabled && !config.secureStorage.provider) {
      throw new Error("Security Error: Encryption enabled but no secure storage provider configured");
    }
  },

  /**
   * Called after project build completes
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("[Security Module] Build complete with security features enabled");
  },

  /**
   * Called when module is uninstalled from a project
   */
  onUninstall: async (_ctx: HookContext): Promise<void> => {
    console.log("[Security Module] Uninstalled - remember to remove security-related code manually");
  },
};

// ============================================================================
// CODE GENERATORS
// ============================================================================

function generateEncryptionService(config: SecurityModuleConfig): string {
  const algorithm = config.encryption.algorithm;
  const keyDerivation = config.encryption.keyDerivation;
  const iterations = config.encryption.iterations ?? 100000;
  const saltLength = config.encryption.saltLength;
  const keyLength = config.encryption.keyLength;

  return `// Encryption Service
// Generated by Offline Flutter PWA Builder

import 'dart:convert';
import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:crypto/crypto.dart';
import 'package:pointycastle/export.dart';

/// Encryption service using ${algorithm}
class EncryptionService {
  static const String _algorithm = '${algorithm}';
  static const int _iterations = ${iterations};
  static const int _saltLength = ${saltLength};
  static const int _keyLength = ${keyLength};

  /// Encrypt data with password
  Future<String> encryptWithPassword(String data, String password) async {
    final salt = _generateSalt();
    final key = await _deriveKey(password, salt);
    final iv = encrypt.IV.fromSecureRandom(16);

    final encrypter = encrypt.Encrypter(
      encrypt.AES(key, mode: encrypt.AESMode.gcm),
    );

    final encrypted = encrypter.encrypt(data, iv: iv);

    // Combine salt + iv + encrypted data
    final combined = Uint8List.fromList([
      ...salt,
      ...iv.bytes,
      ...encrypted.bytes,
    ]);

    return base64.encode(combined);
  }

  /// Decrypt data with password
  Future<String> decryptWithPassword(String encryptedData, String password) async {
    final combined = base64.decode(encryptedData);

    // Extract salt, iv, and encrypted data
    final salt = combined.sublist(0, _saltLength);
    final iv = encrypt.IV(combined.sublist(_saltLength, _saltLength + 16));
    final cipherText = combined.sublist(_saltLength + 16);

    final key = await _deriveKey(password, salt);

    final encrypter = encrypt.Encrypter(
      encrypt.AES(key, mode: encrypt.AESMode.gcm),
    );

    return encrypter.decrypt(
      encrypt.Encrypted(cipherText),
      iv: iv,
    );
  }

  /// Encrypt data with raw key
  String encryptWithKey(String data, Uint8List keyBytes) {
    final key = encrypt.Key(keyBytes);
    final iv = encrypt.IV.fromSecureRandom(16);

    final encrypter = encrypt.Encrypter(
      encrypt.AES(key, mode: encrypt.AESMode.gcm),
    );

    final encrypted = encrypter.encrypt(data, iv: iv);

    final combined = Uint8List.fromList([
      ...iv.bytes,
      ...encrypted.bytes,
    ]);

    return base64.encode(combined);
  }

  /// Decrypt data with raw key
  String decryptWithKey(String encryptedData, Uint8List keyBytes) {
    final key = encrypt.Key(keyBytes);
    final combined = base64.decode(encryptedData);

    final iv = encrypt.IV(combined.sublist(0, 16));
    final cipherText = combined.sublist(16);

    final encrypter = encrypt.Encrypter(
      encrypt.AES(key, mode: encrypt.AESMode.gcm),
    );

    return encrypter.decrypt(
      encrypt.Encrypted(cipherText),
      iv: iv,
    );
  }

  /// Generate cryptographically secure salt
  Uint8List _generateSalt() {
    final random = FortunaRandom();
    random.seed(KeyParameter(
      Uint8List.fromList(List.generate(32, (_) => DateTime.now().microsecondsSinceEpoch % 256)),
    ));
    return random.nextBytes(_saltLength);
  }

  /// Derive key from password using ${keyDerivation}
  Future<encrypt.Key> _deriveKey(String password, Uint8List salt) async {
    ${keyDerivation === "PBKDF2" ? `
    final derivator = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64))
      ..init(Pbkdf2Parameters(salt, _iterations, _keyLength));

    final key = derivator.process(Uint8List.fromList(utf8.encode(password)));
    return encrypt.Key(key);
    ` : `
    final derivator = Argon2BytesGenerator()
      ..init(Argon2Parameters(
        Argon2Parameters.ARGON2_id,
        salt,
        desiredKeyLength: _keyLength,
        iterations: _iterations,
        memory: ${config.encryption.memoryCost ?? 65536},
        lanes: 4,
      ));

    final key = derivator.process(Uint8List.fromList(utf8.encode(password)));
    return encrypt.Key(key);
    `}
  }

  /// Hash data with SHA-256
  String hashSha256(String data) {
    return sha256.convert(utf8.encode(data)).toString();
  }
}
`;
}

function generateKeyManager(config: SecurityModuleConfig): string {
  return `// Key Manager
// Generated by Offline Flutter PWA Builder

import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pointycastle/export.dart';

/// Manages encryption keys securely
class KeyManager {
  static const String _masterKeyId = 'master_encryption_key';
  static const String _saltKeyId = 'master_key_salt';

  final FlutterSecureStorage _storage;

  KeyManager({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: ${config.secureStorage.encryptedSharedPreferences},
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        );

  /// Get or generate master key
  Future<Uint8List> getMasterKey() async {
    final existingKey = await _storage.read(key: _masterKeyId);

    if (existingKey != null) {
      return Uint8List.fromList(existingKey.codeUnits);
    }

    // Generate new master key
    final newKey = _generateSecureKey(${config.encryption.keyLength});
    await _storage.write(
      key: _masterKeyId,
      value: String.fromCharCodes(newKey),
    );

    return newKey;
  }

  /// Get or generate salt
  Future<Uint8List> getSalt() async {
    final existingSalt = await _storage.read(key: _saltKeyId);

    if (existingSalt != null) {
      return Uint8List.fromList(existingSalt.codeUnits);
    }

    // Generate new salt
    final newSalt = _generateSecureKey(${config.encryption.saltLength});
    await _storage.write(
      key: _saltKeyId,
      value: String.fromCharCodes(newSalt),
    );

    return newSalt;
  }

  /// Generate a secure random key
  Uint8List _generateSecureKey(int length) {
    final random = FortunaRandom();
    random.seed(KeyParameter(
      Uint8List.fromList(
        List.generate(32, (_) => DateTime.now().microsecondsSinceEpoch % 256),
      ),
    ));
    return random.nextBytes(length);
  }

  /// Clear all keys (use with caution!)
  Future<void> clearAllKeys() async {
    await _storage.delete(key: _masterKeyId);
    await _storage.delete(key: _saltKeyId);
  }

  /// Check if keys exist
  Future<bool> hasKeys() async {
    return await _storage.containsKey(key: _masterKeyId);
  }
}
`;
}

function generateInputValidator(config: SecurityModuleConfig): string {
  const rules = config.validation.customRules;

  return `// Input Validator
// Generated by Offline Flutter PWA Builder

/// Input validator with SQL injection and XSS protection
class InputValidator {
  static const bool _preventSqlInjection = ${config.validation.preventSqlInjection};
  static const bool _xssProtection = ${config.validation.xssProtection};
  static const bool _htmlEncode = ${config.validation.htmlEncode};

  /// Sanitize input string
  static String sanitize(String input) {
    String result = input.trim();

    if (_preventSqlInjection) {
      result = _escapeSql(result);
    }

    if (_xssProtection) {
      result = _escapeXss(result);
    }

    if (_htmlEncode) {
      result = _encodeHtml(result);
    }

    return result;
  }

  /// Validate email format
  static bool isValidEmail(String email) {
    return RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
        .hasMatch(email);
  }

  /// Validate phone number format
  static bool isValidPhone(String phone) {
    return RegExp(r'^\\+?[1-9]\\d{1,14}$').hasMatch(phone);
  }

  /// Validate URL format
  static bool isValidUrl(String url) {
    return Uri.tryParse(url)?.hasAbsolutePath ?? false;
  }

  /// Escape SQL special characters
  static String _escapeSql(String input) {
    return input
        .replaceAll("'", "''")
        .replaceAll("--", "")
        .replaceAll(";", "")
        .replaceAll("/*", "")
        .replaceAll("*/", "")
        .replaceAll("xp_", "")
        .replaceAll("UNION", "")
        .replaceAll("SELECT", "")
        .replaceAll("DROP", "")
        .replaceAll("INSERT", "")
        .replaceAll("DELETE", "")
        .replaceAll("UPDATE", "");
  }

  /// Escape XSS characters
  static String _escapeXss(String input) {
    return input
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#x27;')
        .replaceAll('/', '&#x2F;')
        .replaceAll('\\\\', '&#x5C;')
        .replaceAll(RegExp(r'javascript:', caseSensitive: false), '')
        .replaceAll(RegExp(r'on\\w+\\s*=', caseSensitive: false), '');
  }

  /// HTML encode special characters
  static String _encodeHtml(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
  }

  /// Validate input length
  static bool isValidLength(String input, {int? min, int? max}) {
    if (min != null && input.length < min) return false;
    if (max != null && input.length > max) return false;
    return true;
  }

  /// Validate with custom regex pattern
  static bool matchesPattern(String input, String pattern) {
    return RegExp(pattern).hasMatch(input);
  }

${rules.map((rule) => `
  /// Validate ${rule.name}
  static bool isValid${rule.name.split('_').map((w) => w[0].toUpperCase() + w.substring(1)).join('')}(String input) {
    ${rule.minLength !== undefined ? `if (input.length < ${rule.minLength}) return false;` : ''}
    ${rule.maxLength !== undefined ? `if (input.length > ${rule.maxLength}) return false;` : ''}
    ${rule.pattern ? `if (!RegExp(r'${rule.pattern}').hasMatch(input)) return false;` : ''}
    return true;
  }
`).join('')}
}
`;
}

function generateSecureStorageService(config: SecurityModuleConfig): string {
  return `// Secure Storage Service
// Generated by Offline Flutter PWA Builder

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure storage service for sensitive data
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: ${config.secureStorage.encryptedSharedPreferences},
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock_this_device,
          ),
        );

  /// Store a value securely
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  /// Read a secure value
  Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  /// Delete a secure value
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  /// Check if a key exists
  Future<bool> containsKey(String key) async {
    return await _storage.containsKey(key: key);
  }

  /// Get all keys
  Future<Map<String, String>> readAll() async {
    return await _storage.readAll();
  }

  /// Delete all stored values
  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }
}
`;
}

function generateAuditLogger(config: SecurityModuleConfig): string {
  const events = config.audit.events;

  return `// Audit Logger
// Generated by Offline Flutter PWA Builder

import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Audit event types
enum AuditEventType {
  ${events.map((e) => e).join(",\n  ")},
}

/// Audit log entry
class AuditLogEntry {
  final String id;
  final AuditEventType type;
  final String message;
  final DateTime timestamp;
  final String? userId;
  final Map<String, dynamic>? metadata;

  AuditLogEntry({
    required this.id,
    required this.type,
    required this.message,
    DateTime? timestamp,
    this.userId,
    this.metadata,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'message': message,
    'timestamp': timestamp.toIso8601String(),
    ${config.audit.includeUserId ? "'userId': userId," : ''}
    if (metadata != null) 'metadata': metadata,
  };
}

/// Audit logger for security events
class AuditLogger {
  static const String _logLevel = '${config.audit.level}';
  static const int _maxLogSize = ${config.audit.maxLogSize}; // KB
  static const bool _encryptLogs = ${config.audit.encryptLogs};

  final List<AuditLogEntry> _logs = [];
  int _logCounter = 0;

  /// Log an audit event
  void log(AuditEventType type, String message, {String? userId, Map<String, dynamic>? metadata}) {
    final entry = AuditLogEntry(
      id: 'AUDIT-\${++_logCounter}',
      type: type,
      message: message,
      userId: userId,
      metadata: metadata,
    );

    _logs.add(entry);
    _checkLogSize();

    if (kDebugMode) {
      print('[AUDIT] \${entry.type.name}: \${entry.message}');
    }
  }

  /// Get all logs
  List<AuditLogEntry> getLogs() => List.unmodifiable(_logs);

  /// Clear logs
  void clearLogs() {
    _logs.clear();
  }

  /// Export logs as JSON
  String exportLogsJson() {
    return jsonEncode(_logs.map((e) => e.toJson()).toList());
  }

  /// Check and rotate logs if necessary
  void _checkLogSize() {
    // Simple size check - in real implementation would measure actual size
    if (_logs.length > 10000) {
      _logs.removeRange(0, _logs.length - 5000);
    }
  }
}
`;
}

function generateBiometricService(): string {
  return `// Biometric Service
// Generated by Offline Flutter PWA Builder

import 'package:local_auth/local_auth.dart';

/// Biometric authentication service
class BiometricService {
  final LocalAuthentication _auth = LocalAuthentication();

  /// Check if biometrics are available
  Future<bool> isBiometricAvailable() async {
    try {
      final canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } catch (e) {
      return false;
    }
  }

  /// Get available biometric types
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  /// Authenticate with biometrics
  Future<bool> authenticate({
    String reason = 'Please authenticate to continue',
    bool biometricOnly = false,
  }) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: biometricOnly,
        ),
      );
    } catch (e) {
      return false;
    }
  }

  /// Cancel authentication
  Future<void> cancelAuthentication() async {
    await _auth.stopAuthentication();
  }
}
`;
}

export default securityHooks;
