export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

type Metadata = Record<string, unknown>;

const priorities: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function configuredLevel(): LogLevel | null {
  const value = process.env.AUTH_PKCE_LOG_LEVEL?.toLowerCase();
  return value && value in priorities ? value as LogLevel : null;
}

function normalize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause,
    };
  }

  return value;
}

function write(level: LogLevel, message: string, metadata: Metadata = {}): void {
  const threshold = configuredLevel();
  if (!threshold || priorities[level] > priorities[threshold]) {
    return;
  }

  const normalized = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, normalize(value)])
  );
  const details = Object.keys(normalized).length > 0 ? ` ${JSON.stringify(normalized)}` : '';
  process.stderr.write(`[auth-pkce:${level}] ${message}${details}\n`);
}

const logger = {
  error: (message: string, metadata?: Metadata): void => write('error', message, metadata),
  warn: (message: string, metadata?: Metadata): void => write('warn', message, metadata),
  info: (message: string, metadata?: Metadata): void => write('info', message, metadata),
  debug: (message: string, metadata?: Metadata): void => write('debug', message, metadata),
};

export default logger;
