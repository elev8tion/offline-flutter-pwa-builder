/**
 * State Module Hooks
 *
 * Lifecycle hooks for state management module.
 * Handles provider/BLoC generation and offline sync setup.
 */

import type { ModuleHooks, HookContext, GeneratedFile } from "../../core/types.js";
import {
  StateModuleConfig,
  DEFAULT_STATE_CONFIG,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  generateProviderName,
  generateBlocNames,
  getStateDependencies,
} from "./config.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get state module config from project
 */
function getStateConfig(ctx: HookContext): StateModuleConfig {
  const moduleConfig = ctx.project.modules.find((m) => m.id === "state");
  return {
    ...DEFAULT_STATE_CONFIG,
    ...((moduleConfig?.config as Partial<StateModuleConfig>) ?? {}),
  };
}

// ============================================================================
// HOOKS
// ============================================================================

export const stateHooks: ModuleHooks = {
  /**
   * Called when the state module is installed
   */
  onInstall: async (ctx: HookContext): Promise<void> => {
    const config = getStateConfig(ctx);
    const deps = getStateDependencies(config.type);

    // Add dependencies to project config
    ctx.project.offline = {
      ...ctx.project.offline,
      sync: {
        enabled: config.offlineSync.enabled,
        strategy: config.offlineSync.strategy,
      },
    };

    console.log(
      `State module installed with ${config.type} state management`
    );
    console.log(`Dependencies to add: ${Object.keys(deps.dependencies).join(", ")}`);
  },

  /**
   * Called before code generation
   */
  beforeGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getStateConfig(ctx);

    // Validate configuration
    if (config.type === "riverpod" && config.blocs.length > 0) {
      console.warn(
        "Warning: BLoC configurations found but state type is 'riverpod'. BLoCs will be ignored."
      );
    }

    if (config.type === "bloc" && config.providers.length > 0) {
      console.warn(
        "Warning: Provider configurations found but state type is 'bloc'. Providers will be ignored."
      );
    }
  },

  /**
   * Generate state management code
   */
  onGenerate: async (ctx: HookContext): Promise<GeneratedFile[]> => {
    const config = getStateConfig(ctx);
    const files: GeneratedFile[] = [];

    // Generate providers (Riverpod)
    if (config.type === "riverpod" || config.type === "provider") {
      for (const provider of config.providers) {
        const className = toPascalCase(provider.name);
        const providerName = generateProviderName(provider.name, provider.type);
        const snakeName = toSnakeCase(provider.name);

        files.push({
          path: `lib/providers/${snakeName}_provider.dart`,
          content: generateProviderCode(provider, className, providerName),
        });
      }

      // Generate offline providers if enabled
      if (config.offlineSync.enabled) {
        files.push({
          path: "lib/core/offline/offline_providers.dart",
          content: generateOfflineProvidersCode(config),
        });
      }
    }

    // Generate BLoCs
    if (config.type === "bloc") {
      for (const bloc of config.blocs) {
        const names = generateBlocNames(bloc.name, bloc.useCubit);
        const initialState = bloc.states.find((s) => s.isInitial)?.name ?? bloc.states[0]?.name ?? "Initial";

        // Main BLoC file
        files.push({
          path: `lib/blocs/${names.fileName}.dart`,
          content: generateBlocCode(bloc, names, initialState, config.offlineSync.enabled),
        });

        // Events file (if not Cubit)
        if (!bloc.useCubit) {
          files.push({
            path: `lib/blocs/${names.fileName}_event.dart`,
            content: generateBlocEventsCode(bloc, names),
          });
        }

        // States file
        files.push({
          path: `lib/blocs/${names.fileName}_state.dart`,
          content: generateBlocStatesCode(bloc, names),
        });
      }
    }

    return files;
  },

  /**
   * Called after code generation
   */
  afterGenerate: async (ctx: HookContext): Promise<void> => {
    const config = getStateConfig(ctx);

    console.log(`State module generated ${config.providers.length} providers`);
    console.log(`State module generated ${config.blocs.length} BLoCs`);

    if (config.offlineSync.enabled) {
      console.log(
        `Offline sync configured with strategy: ${config.offlineSync.strategy}`
      );
    }
  },

  /**
   * Called before build
   */
  beforeBuild: async (ctx: HookContext): Promise<void> => {
    const config = getStateConfig(ctx);

    if (config.codeGeneration.generateFreezed || config.codeGeneration.generateJsonSerializable) {
      console.log("Note: Run 'dart run build_runner build' after build for code generation");
    }
  },

  /**
   * Called after build
   */
  afterBuild: async (_ctx: HookContext): Promise<void> => {
    console.log("State module build complete");
  },
};

// ============================================================================
// CODE GENERATION HELPERS
// ============================================================================

/**
 * Generate provider code
 */
function generateProviderCode(
  provider: StateModuleConfig["providers"][0],
  className: string,
  providerName: string
): string {
  const imports = [
    "import 'package:flutter_riverpod/flutter_riverpod.dart';",
  ];

  if (provider.dependencies) {
    for (const dep of provider.dependencies) {
      imports.push(`import '${dep}';`);
    }
  }

  let code = `// ${provider.name} Provider
// Generated by Offline Flutter PWA Builder
${provider.description ? `// ${provider.description}` : ""}

${imports.join("\n")}

`;

  switch (provider.type) {
    case "provider":
      code += `/// Simple provider for ${provider.name}
final ${providerName} = Provider<${provider.stateType}>((ref) {
  ${provider.initialValue ? `return ${provider.initialValue};` : "// TODO: Return computed value\n  throw UnimplementedError();"}
});
`;
      break;

    case "stateProvider":
      code += `/// State provider for ${provider.name}
final ${providerName} = StateProvider${provider.autoDispose ? ".autoDispose" : ""}${provider.family ? `.family<${provider.stateType}, ${provider.familyParamType}>` : `<${provider.stateType}>`}((ref${provider.family ? ", param" : ""}) {
  ${provider.initialValue ? `return ${provider.initialValue};` : "// TODO: Return initial state\n  throw UnimplementedError();"}
});
`;
      break;

    case "stateNotifierProvider":
      code += `/// State notifier for ${provider.name}
class ${className}Notifier extends StateNotifier<${provider.stateType}> {
  ${className}Notifier() : super(${provider.initialValue ?? "/* initial state */"});

  void update(${provider.stateType} newState) {
    state = newState;
  }
}

final ${providerName} = StateNotifierProvider${provider.autoDispose ? ".autoDispose" : ""}${provider.family ? `.family<${className}Notifier, ${provider.stateType}, ${provider.familyParamType}>` : `<${className}Notifier, ${provider.stateType}>`}((ref${provider.family ? ", param" : ""}) {
  return ${className}Notifier();
});
`;
      break;

    case "futureProvider":
      code += `/// Future provider for ${provider.name}
final ${providerName} = FutureProvider${provider.autoDispose ? ".autoDispose" : ""}${provider.family ? `.family<${provider.stateType}, ${provider.familyParamType}>` : `<${provider.stateType}>`}((ref${provider.family ? ", param" : ""}) async {
  ${provider.initialValue ? `return ${provider.initialValue};` : "// TODO: Implement async logic\n  throw UnimplementedError();"}
});
`;
      break;

    case "streamProvider":
      code += `/// Stream provider for ${provider.name}
final ${providerName} = StreamProvider${provider.autoDispose ? ".autoDispose" : ""}${provider.family ? `.family<${provider.stateType}, ${provider.familyParamType}>` : `<${provider.stateType}>`}((ref${provider.family ? ", param" : ""}) {
  // TODO: Return stream
  throw UnimplementedError();
});
`;
      break;

    case "notifierProvider":
      code += `/// Notifier provider for ${provider.name} (Riverpod 2.0+)
class ${className}Notifier extends Notifier<${provider.stateType}> {
  @override
  ${provider.stateType} build() {
    ${provider.initialValue ? `return ${provider.initialValue};` : "// TODO: Return initial state\n    throw UnimplementedError();"}
  }

  void update(${provider.stateType} newState) {
    state = newState;
  }
}

final ${providerName} = NotifierProvider<${className}Notifier, ${provider.stateType}>(
  ${className}Notifier.new,
);
`;
      break;

    case "asyncNotifierProvider":
      code += `/// Async notifier provider for ${provider.name} (Riverpod 2.0+)
class ${className}AsyncNotifier extends AsyncNotifier<${provider.stateType}> {
  @override
  Future<${provider.stateType}> build() async {
    ${provider.initialValue ? `return ${provider.initialValue};` : "// TODO: Implement async initialization\n    throw UnimplementedError();"}
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => build());
  }
}

final ${providerName} = AsyncNotifierProvider<${className}AsyncNotifier, ${provider.stateType}>(
  ${className}AsyncNotifier.new,
);
`;
      break;

    default:
      code += `final ${providerName} = Provider<${provider.stateType}>((ref) {
  throw UnimplementedError();
});
`;
  }

  return code;
}

/**
 * Generate offline providers code
 */
function generateOfflineProvidersCode(config: StateModuleConfig): string {
  return `// Offline Providers
// Generated by Offline Flutter PWA Builder

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Connectivity provider
final connectivityProvider = StreamProvider<ConnectivityResult>((ref) {
  return Connectivity().onConnectivityChanged.map((results) => results.first);
});

/// Offline status provider
final isOfflineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityProvider);
  return connectivity.when(
    data: (result) => result == ConnectivityResult.none,
    loading: () => false,
    error: (_, __) => true,
  );
});

/// Sync queue state
class SyncQueueState {
  final List<SyncOperation> pending;
  final bool isSyncing;
  final String? lastError;

  const SyncQueueState({
    this.pending = const [],
    this.isSyncing = false,
    this.lastError,
  });

  SyncQueueState copyWith({
    List<SyncOperation>? pending,
    bool? isSyncing,
    String? lastError,
  }) {
    return SyncQueueState(
      pending: pending ?? this.pending,
      isSyncing: isSyncing ?? this.isSyncing,
      lastError: lastError,
    );
  }
}

/// Sync operation
class SyncOperation {
  final String id;
  final String type;
  final Map<String, dynamic> data;
  final DateTime createdAt;
  final int retryCount;

  SyncOperation({
    required this.id,
    required this.type,
    required this.data,
    required this.createdAt,
    this.retryCount = 0,
  });
}

/// Sync queue notifier
class SyncQueueNotifier extends StateNotifier<SyncQueueState> {
  final int maxRetries;
  final int retryDelay;

  SyncQueueNotifier({
    this.maxRetries = ${config.offlineSync.retryAttempts},
    this.retryDelay = ${config.offlineSync.retryDelay},
  }) : super(const SyncQueueState());

  void addOperation(SyncOperation op) {
    state = state.copyWith(pending: [...state.pending, op]);
  }

  void removeOperation(String id) {
    state = state.copyWith(
      pending: state.pending.where((op) => op.id != id).toList(),
    );
  }

  void setSyncing(bool value) {
    state = state.copyWith(isSyncing: value);
  }

  void setError(String? error) {
    state = state.copyWith(lastError: error);
  }

  Future<void> syncAll() async {
    if (state.isSyncing || state.pending.isEmpty) return;

    setSyncing(true);
    setError(null);

    try {
      for (final op in List.from(state.pending)) {
        try {
          // TODO: Implement actual sync logic based on operation type
          await Future.delayed(Duration(milliseconds: 100));
          removeOperation(op.id);
        } catch (e) {
          if (op.retryCount < maxRetries) {
            // Retry later
            await Future.delayed(Duration(milliseconds: retryDelay));
          } else {
            setError('Failed to sync operation: \${op.id}');
          }
        }
      }
    } finally {
      setSyncing(false);
    }
  }
}

final syncQueueProvider = StateNotifierProvider<SyncQueueNotifier, SyncQueueState>((ref) {
  return SyncQueueNotifier();
});
`;
}

/**
 * Generate BLoC code
 */
function generateBlocCode(
  bloc: StateModuleConfig["blocs"][0],
  names: ReturnType<typeof generateBlocNames>,
  initialState: string,
  offlineEnabled: boolean
): string {
  const imports = [
    "import 'package:flutter_bloc/flutter_bloc.dart';",
  ];

  if (bloc.useEquatable) {
    imports.push("import 'package:equatable/equatable.dart';");
  }

  if (offlineEnabled) {
    imports.push("import 'package:connectivity_plus/connectivity_plus.dart';");
    imports.push("import 'dart:async';");
  }

  let code = `// ${bloc.name} BLoC
// Generated by Offline Flutter PWA Builder
${bloc.description ? `// ${bloc.description}` : ""}

${imports.join("\n")}

part '${names.fileName}_event.dart';
part '${names.fileName}_state.dart';

`;

  if (bloc.useCubit) {
    code += `/// ${bloc.name} Cubit
class ${names.bloc} extends Cubit<${names.state}> {
  ${names.bloc}() : super(const ${initialState}());

${bloc.events
  .map((e) => {
    const methodName = toCamelCase(e.name);
    const params = e.properties?.map((p) => `${p.required ? "required " : ""}${p.type} ${p.name}`).join(", ");
    return `  /// Handle ${e.name}
  void ${methodName}(${params ? `{${params}}` : ""}) {
    // TODO: Implement ${methodName} logic
    // emit(NewState());
  }
`;
  })
  .join("\n")}
}
`;
  } else {
    code += `/// ${bloc.name} BLoC
class ${names.bloc} extends Bloc<${names.event}, ${names.state}> {
  ${names.bloc}() : super(const ${initialState}()) {
${bloc.events.map((e) => `    on<${e.name}>(_on${e.name});`).join("\n")}
  }

${bloc.events
  .map(
    (e) => `  Future<void> _on${e.name}(
    ${e.name} event,
    Emitter<${names.state}> emit,
  ) async {
    // TODO: Implement ${e.name} handler
    // emit(NewState());
  }
`
  )
  .join("\n")}
}
`;
  }

  return code;
}

/**
 * Generate BLoC events code
 */
function generateBlocEventsCode(
  bloc: StateModuleConfig["blocs"][0],
  names: ReturnType<typeof generateBlocNames>
): string {
  let code = `// ${bloc.name} Events
// Generated by Offline Flutter PWA Builder

part of '${names.fileName}.dart';

`;

  if (bloc.useEquatable) {
    code += `abstract class ${names.event} extends Equatable {
  const ${names.event}();

  @override
  List<Object?> get props => [];
}

`;
  } else {
    code += `abstract class ${names.event} {
  const ${names.event}();
}

`;
  }

  for (const event of bloc.events) {
    code += `/// ${event.description ?? `${event.name} event`}
class ${event.name} extends ${names.event} {
`;

    if (event.properties && event.properties.length > 0) {
      for (const prop of event.properties) {
        code += `  final ${prop.type} ${prop.name};\n`;
      }

      code += `
  const ${event.name}({
${event.properties.map((p) => `    ${p.required ? "required " : ""}this.${p.name},`).join("\n")}
  });
`;

      if (bloc.useEquatable) {
        code += `
  @override
  List<Object?> get props => [${event.properties.map((p) => p.name).join(", ")}];
`;
      }
    } else {
      code += `  const ${event.name}();\n`;
    }

    code += `}

`;
  }

  return code;
}

/**
 * Generate BLoC states code
 */
function generateBlocStatesCode(
  bloc: StateModuleConfig["blocs"][0],
  names: ReturnType<typeof generateBlocNames>
): string {
  let code = `// ${bloc.name} States
// Generated by Offline Flutter PWA Builder

part of '${names.fileName}.dart';

`;

  if (bloc.useEquatable) {
    code += `abstract class ${names.state} extends Equatable {
  const ${names.state}();

  @override
  List<Object?> get props => [];
}

`;
  } else {
    code += `abstract class ${names.state} {
  const ${names.state}();
}

`;
  }

  for (const state of bloc.states) {
    code += `/// ${state.description ?? `${state.name} state`}
class ${state.name} extends ${names.state} {
`;

    if (state.properties && state.properties.length > 0) {
      for (const prop of state.properties) {
        code += `  final ${prop.type} ${prop.name};\n`;
      }

      code += `
  const ${state.name}({
${state.properties.map((p) => `    ${p.required ? "required " : ""}this.${p.name},`).join("\n")}
  });
`;

      if (bloc.useEquatable) {
        code += `
  @override
  List<Object?> get props => [${state.properties.map((p) => p.name).join(", ")}];
`;
      }
    } else {
      code += `  const ${state.name}();\n`;
    }

    code += `}

`;
  }

  return code;
}

export default stateHooks;
