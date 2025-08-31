const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = LOG_LEVELS.DEBUG; // Set the current log level

const logger = {
  debug: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error(...args);
    }
  },
};

export default logger;