import { Logger } from '@nestjs/common';

// Suppress all NestJS logger output during tests by mocking all Logger methods
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => { });

// Also suppress static Logger methods
jest.spyOn(Logger, 'log').mockImplementation(() => { });
jest.spyOn(Logger, 'error').mockImplementation(() => { });
jest.spyOn(Logger, 'warn').mockImplementation(() => { });
jest.spyOn(Logger, 'debug').mockImplementation(() => { });
jest.spyOn(Logger, 'verbose').mockImplementation(() => { });

// Suppress console methods to keep test output clean
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
