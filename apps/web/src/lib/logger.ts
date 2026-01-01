/**
 * Logger condicional para ambiente de desenvolvimento
 * Substitui console.log, console.warn, etc. por logger.log, logger.warn, etc.
 */

const isDev = process.env.NODE_ENV === 'development';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  group: (...args: unknown[]) => void;
  groupEnd: () => void;
}

function createLogger(): Logger {
  const noop = () => {};
  if (!isDev && typeof window !== 'undefined') {
    // No-op em produção
    return {
      log: noop,
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      group: noop,
      groupEnd: noop,
    };
  }
  return {
    log: (...args) => console.log(...args),
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => console.debug(...args),
    group: (...args) => console.group(...args),
    groupEnd: () => console.groupEnd(),
  };
}

export const logger = createLogger();

// Aliases para compatibilidade
export const log = logger.log;
export const warn = logger.warn;
export const error = logger.error;
