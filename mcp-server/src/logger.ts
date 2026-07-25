import pino, { type Logger } from 'pino';

export interface LoggerOptions {
  readonly pretty?: boolean;
  readonly destination?: NodeJS.WritableStream;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const destination = options.destination ?? process.stderr;

  if (options.pretty) {
    return pino(
      { level: 'info' },
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: false,
          destination: 2,
        },
      }),
    );
  }

  return pino({ level: 'info' }, destination);
}
