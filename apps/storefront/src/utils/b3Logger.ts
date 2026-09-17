type B2BLoggerType = Pick<Console, 'error' | 'log'>;

const b2bLogger: B2BLoggerType = {
  // eslint-disable-next-line no-console
  error: console.error,
  log: globalThis.console.log,
};

export default b2bLogger;
