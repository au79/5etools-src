import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse, type ParseError, printParseErrorCode } from 'jsonc-parser';
import { z } from 'zod';

export const CONFIG_FILE_NAME = '.5etools-mcp.jsonc';

const SourceRootSchema = z.enum(['data', 'prerelease', 'homebrew']);
const AdventureModeSchema = z.enum(['disabled', 'allowlist', 'all']);
const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error']);

export type SourceRoot = z.infer<typeof SourceRootSchema>;
export type AdventureMode = z.infer<typeof AdventureModeSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const ConfigFileSchema = z.strictObject({
  root: z.string().min(1).optional(),
  sources: z.array(SourceRootSchema).min(1).optional(),
  adventures: z
    .discriminatedUnion('mode', [
      z.strictObject({ mode: z.literal('disabled') }),
      z.strictObject({ mode: z.literal('all') }),
      z.strictObject({ mode: z.literal('allowlist'), sourceIds: z.array(z.string().min(1)).min(1) }),
    ])
    .optional(),
  log: z.strictObject({ level: LogLevelSchema.optional(), pretty: z.boolean().optional() }).optional(),
});

type ConfigFile = z.infer<typeof ConfigFileSchema>;

interface CliConfiguration {
  adventureMode?: AdventureMode | undefined;
  adventureSourceIds?: readonly string[] | undefined;
  configPath?: string | undefined;
  logLevel?: LogLevel | undefined;
  logPretty?: boolean | undefined;
  root?: string | undefined;
  sources?: readonly SourceRoot[] | undefined;
}

type EnvironmentConfiguration = CliConfiguration;

export interface EnabledSourceRoot {
  readonly name: SourceRoot;
  readonly path: string;
}

export interface EffectiveConfiguration {
  readonly adventure: {
    readonly mode: AdventureMode;
    readonly sourceIds: readonly string[];
  };
  readonly configPath?: string | undefined;
  readonly log: {
    readonly level: LogLevel;
    readonly pretty: boolean;
  };
  readonly projectRoot: string;
  readonly sourceRoots: readonly EnabledSourceRoot[];
  readonly warnings: readonly string[];
}

export interface ConfigurationDiagnostics {
  readonly adventure: EffectiveConfiguration['adventure'];
  readonly configPath?: string | undefined;
  readonly log: EffectiveConfiguration['log'];
  readonly projectRoot: string;
  readonly sourceRoots: readonly SourceRoot[];
  readonly warnings: readonly string[];
}

export interface ResolveConfigurationOptions {
  readonly argv?: readonly string[];
  readonly defaultProjectRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly workingDirectory?: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const DEFAULT_SOURCES: readonly SourceRoot[] = ['data'];

function getDefaultProjectRoot(): string {
  const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
  return resolve(packageRoot, '..');
}

function readOptionValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new ConfigurationError(`${option} requires a value.`);
  }
  return value;
}

function parseList(value: string, label: string): readonly string[] {
  const values = value.split(',').map((entry) => entry.trim());
  if (values.some((entry) => entry.length === 0)) {
    throw new ConfigurationError(`${label} must be a comma-separated list without empty values.`);
  }
  return values;
}

function parseBoolean(value: string, label: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ConfigurationError(`${label} must be true or false.`);
}

function parseEnumList<T extends string>(value: string, label: string, schema: z.ZodType<T>): readonly T[] {
  return parseList(value, label).map((entry) => {
    const result = schema.safeParse(entry);
    if (!result.success) throw new ConfigurationError(`${label} contains unsupported value ${JSON.stringify(entry)}.`);
    return result.data;
  });
}

function parseCliConfiguration(argv: readonly string[]): CliConfiguration {
  let adventureMode: AdventureMode | undefined;
  const adventureSourceIds: string[] = [];
  let configPath: string | undefined;
  let logLevel: LogLevel | undefined;
  let logPretty: boolean | undefined;
  let root: string | undefined;
  let sources: readonly SourceRoot[] | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') {
      root = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === '--config') {
      configPath = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === '--sources') {
      sources = parseEnumList(readOptionValue(argv, index, argument), argument, SourceRootSchema);
      index += 1;
    } else if (argument === '--adventures') {
      const value = readOptionValue(argv, index, argument);
      const result = AdventureModeSchema.safeParse(value);
      if (!result.success) throw new ConfigurationError(`${argument} has unsupported value ${JSON.stringify(value)}.`);
      adventureMode = result.data;
      index += 1;
    } else if (argument === '--adventure-source') {
      adventureSourceIds.push(readOptionValue(argv, index, argument));
      index += 1;
    } else if (argument === '--log-level') {
      const value = readOptionValue(argv, index, argument);
      const result = LogLevelSchema.safeParse(value);
      if (!result.success) throw new ConfigurationError(`${argument} has unsupported value ${JSON.stringify(value)}.`);
      logLevel = result.data;
      index += 1;
    } else if (argument === '--log-pretty') {
      logPretty = true;
    } else if (argument === '--no-log-pretty') {
      logPretty = false;
    } else {
      throw new ConfigurationError(`Unknown configuration option ${JSON.stringify(argument)}.`);
    }
  }

  return {
    adventureMode,
    adventureSourceIds: adventureSourceIds.length > 0 ? adventureSourceIds : undefined,
    configPath,
    logLevel,
    logPretty,
    root,
    sources,
  };
}

function parseEnvironmentConfiguration(environment: NodeJS.ProcessEnv): EnvironmentConfiguration {
  const result: EnvironmentConfiguration = {};
  if (environment.MCP_5ETOOLS_ROOT !== undefined) result.root = environment.MCP_5ETOOLS_ROOT;
  if (environment.MCP_5ETOOLS_CONFIG !== undefined) result.configPath = environment.MCP_5ETOOLS_CONFIG;
  if (environment.MCP_5ETOOLS_SOURCES !== undefined) {
    result.sources = parseEnumList(environment.MCP_5ETOOLS_SOURCES, 'MCP_5ETOOLS_SOURCES', SourceRootSchema);
  }
  if (environment.MCP_5ETOOLS_ADVENTURES !== undefined) {
    const value = environment.MCP_5ETOOLS_ADVENTURES;
    const parsed = AdventureModeSchema.safeParse(value);
    if (!parsed.success)
      throw new ConfigurationError(`MCP_5ETOOLS_ADVENTURES has unsupported value ${JSON.stringify(value)}.`);
    result.adventureMode = parsed.data;
  }
  if (environment.MCP_5ETOOLS_ADVENTURE_SOURCES !== undefined) {
    result.adventureSourceIds = parseList(environment.MCP_5ETOOLS_ADVENTURE_SOURCES, 'MCP_5ETOOLS_ADVENTURE_SOURCES');
  }
  if (environment.MCP_5ETOOLS_LOG_LEVEL !== undefined) {
    const value = environment.MCP_5ETOOLS_LOG_LEVEL;
    const parsed = LogLevelSchema.safeParse(value);
    if (!parsed.success)
      throw new ConfigurationError(`MCP_5ETOOLS_LOG_LEVEL has unsupported value ${JSON.stringify(value)}.`);
    result.logLevel = parsed.data;
  }
  if (environment.MCP_5ETOOLS_LOG_PRETTY !== undefined) {
    result.logPretty = parseBoolean(environment.MCP_5ETOOLS_LOG_PRETTY, 'MCP_5ETOOLS_LOG_PRETTY');
  }
  return result;
}

function resolveInputPath(value: string, workingDirectory: string): string {
  return resolve(workingDirectory, value);
}

function resolveConfigPath(
  cli: CliConfiguration,
  environment: EnvironmentConfiguration,
  initialProjectRoot: string,
  workingDirectory: string,
): { readonly explicit: boolean; readonly path: string } {
  const value = cli.configPath ?? environment.configPath;
  if (value === undefined) {
    return { explicit: false, path: resolve(initialProjectRoot, CONFIG_FILE_NAME) };
  }
  return { explicit: true, path: resolveInputPath(value, workingDirectory) };
}

function formatParseErrors(errors: readonly ParseError[]): string {
  return errors.map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`).join(', ');
}

function readConfigFile(configPath: string, required: boolean): ConfigFile {
  if (!existsSync(configPath)) {
    if (required) throw new ConfigurationError(`Configuration file does not exist: ${configPath}`);
    return {};
  }

  const errors: ParseError[] = [];
  const value = parse(readFileSync(configPath, 'utf8'), errors, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as unknown;
  if (errors.length > 0) throw new ConfigurationError(`Invalid JSONC in ${configPath}: ${formatParseErrors(errors)}`);

  const result = ConfigFileSchema.safeParse(value);
  if (!result.success) throw new ConfigurationError(`Invalid configuration in ${configPath}: ${result.error.message}`);
  return result.data;
}

function realDirectory(path: string, label: string): string {
  try {
    if (!statSync(path).isDirectory()) throw new ConfigurationError(`${label} is not a directory: ${path}`);
    return realpathSync(path);
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError(`${label} does not exist: ${path}`);
  }
}

function ensureContained(path: string, projectRoot: string, label: string): void {
  const pathRelativeToRoot = relative(projectRoot, path);
  if (
    pathRelativeToRoot === '' ||
    (!pathRelativeToRoot.startsWith(`..${sep}`) && pathRelativeToRoot !== '..' && !isAbsolute(pathRelativeToRoot))
  ) {
    return;
  }
  throw new ConfigurationError(`${label} must be inside the selected project root: ${path}`);
}

function unique<T extends string>(values: readonly T[], label: string): readonly T[] {
  if (new Set(values).size !== values.length) throw new ConfigurationError(`${label} cannot contain duplicate values.`);
  return values;
}

function getConfigAdventure(config: ConfigFile): {
  readonly mode?: AdventureMode;
  readonly sourceIds?: readonly string[];
} {
  if (config.adventures === undefined) return {};
  if (config.adventures.mode !== 'allowlist') return { mode: config.adventures.mode };
  return { mode: config.adventures.mode, sourceIds: config.adventures.sourceIds };
}

export function resolveConfiguration(options: ResolveConfigurationOptions = {}): EffectiveConfiguration {
  const argv = options.argv ?? process.argv.slice(2);
  const environment = options.environment ?? process.env;
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const defaultProjectRoot = options.defaultProjectRoot ?? getDefaultProjectRoot();
  const cli = parseCliConfiguration(argv);
  const environmentConfig = parseEnvironmentConfiguration(environment);
  const initialProjectRoot = resolveInputPath(
    cli.root ?? environmentConfig.root ?? defaultProjectRoot,
    workingDirectory,
  );
  const configFile = resolveConfigPath(cli, environmentConfig, initialProjectRoot, workingDirectory);
  const config = readConfigFile(configFile.path, configFile.explicit);
  const commandOrEnvironmentRoot = cli.root ?? environmentConfig.root;
  const configuredProjectRoot =
    commandOrEnvironmentRoot !== undefined
      ? resolveInputPath(commandOrEnvironmentRoot, workingDirectory)
      : config.root !== undefined
        ? resolve(dirname(configFile.path), config.root)
        : resolveInputPath(defaultProjectRoot, workingDirectory);
  const projectRoot = realDirectory(configuredProjectRoot, 'Selected project root');

  if (existsSync(configFile.path)) ensureContained(realpathSync(configFile.path), projectRoot, 'Configuration file');

  const configAdventure = getConfigAdventure(config);
  const sourceNames = unique(cli.sources ?? environmentConfig.sources ?? config.sources ?? DEFAULT_SOURCES, 'Sources');
  const sourceRoots = sourceNames.map((name) => {
    const path = realDirectory(resolve(projectRoot, name), `Enabled source root ${JSON.stringify(name)}`);
    ensureContained(path, projectRoot, `Enabled source root ${JSON.stringify(name)}`);
    return { name, path };
  });
  const adventureMode = cli.adventureMode ?? environmentConfig.adventureMode ?? configAdventure.mode ?? 'disabled';
  const adventureSourceIds = unique(
    cli.adventureSourceIds ?? environmentConfig.adventureSourceIds ?? configAdventure.sourceIds ?? [],
    'Adventure source IDs',
  );
  if (adventureMode === 'allowlist' && adventureSourceIds.length === 0) {
    throw new ConfigurationError('Adventure allowlist mode requires at least one adventure source ID.');
  }
  if (adventureMode !== 'allowlist' && adventureSourceIds.length > 0) {
    throw new ConfigurationError('Adventure source IDs are only valid when adventure mode is allowlist.');
  }

  const warnings: string[] = [];
  if (adventureMode === 'all') warnings.push('Adventure content is enabled for all adventure source IDs.');
  if (adventureMode === 'allowlist') {
    warnings.push(`Adventure content is enabled for allowlisted source IDs: ${adventureSourceIds.join(', ')}.`);
  }

  return {
    adventure: { mode: adventureMode, sourceIds: adventureSourceIds },
    configPath: existsSync(configFile.path) ? realpathSync(configFile.path) : undefined,
    log: {
      level: cli.logLevel ?? environmentConfig.logLevel ?? config.log?.level ?? 'info',
      pretty: cli.logPretty ?? environmentConfig.logPretty ?? config.log?.pretty ?? false,
    },
    projectRoot,
    sourceRoots,
    warnings,
  };
}

export function getConfigurationDiagnostics(configuration: EffectiveConfiguration): ConfigurationDiagnostics {
  return {
    adventure: configuration.adventure,
    configPath: configuration.configPath,
    log: configuration.log,
    projectRoot: configuration.projectRoot,
    sourceRoots: configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
    warnings: configuration.warnings,
  };
}
