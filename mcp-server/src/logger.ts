import pino, { type LevelWithSilentOrString, type Logger } from 'pino';

import type { EffectiveConfiguration } from './config.js';

export interface LoggerOptions {
  readonly pretty?: boolean;
  readonly destination?: NodeJS.WritableStream;
  readonly level?: LevelWithSilentOrString;
}

export type LogFields = Readonly<Record<string, unknown>>;

export interface ObserveActionOptions<T> {
  readonly complete?: (value: T) => LogFields;
  readonly event: string;
  readonly fields?: LogFields;
  readonly action: () => T;
}

const SAFE_ERROR_TYPES = new Set(['CatalogError', 'ConfigurationError', 'QueryError', 'ValidationError']);

function getSafeErrorFields(error: Error): LogFields {
  return {
    errorMessage: SAFE_ERROR_TYPES.has(error.name)
      ? error.message.replaceAll(/\s+/g, ' ').slice(0, 240)
      : 'Unexpected internal failure.',
    errorType: error.name,
  };
}

export function getConfigurationLogFields(configuration: EffectiveConfiguration): LogFields {
  return {
    adventureMode: configuration.adventure.mode,
    configFileConfigured: configuration.configPath !== undefined,
    logLevel: configuration.log.level,
    logPretty: configuration.log.pretty,
    sourceRoots: configuration.sourceRoots.map((sourceRoot) => sourceRoot.name),
    validationRollout: configuration.validationRollout,
    warningCount: configuration.warnings.length,
  };
}

export function observeAction<T>(logger: Logger, options: ObserveActionOptions<T>): T {
  const operationId = crypto.randomUUID();
  const startedAt = performance.now();
  const fields = options.fields ?? {};
  logger.info({ event: `${options.event}.started`, operationId, ...fields }, 'MCP operation started');

  try {
    const value = options.action();
    logger.info(
      {
        event: `${options.event}.completed`,
        operationId,
        durationMs: Math.round(performance.now() - startedAt),
        ...fields,
        ...(options.complete?.(value) ?? {}),
      },
      'MCP operation completed',
    );
    return value;
  } catch (error) {
    logger.error(
      {
        event: `${options.event}.failed`,
        operationId,
        durationMs: Math.round(performance.now() - startedAt),
        ...fields,
        ...getSafeErrorFields(error as Error),
      },
      'MCP operation failed',
    );
    throw error;
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const destination = options.destination ?? process.stderr;

  if (options.pretty) {
    return pino(
      { level: options.level ?? 'info' },
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: false,
          destination: 2,
        },
      }),
    );
  }

  return pino({ level: options.level ?? 'info' }, destination);
}
