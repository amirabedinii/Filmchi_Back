import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with userId and email from payload', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        tv: 1,
        iat: 1234567890,
        exp: 1234567999,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should handle payload with only required fields', async () => {
      const payload = {
        sub: 'user-456',
        email: 'another@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-456',
        email: 'another@example.com',
      });
    });

    it('should work with undefined values in payload', async () => {
      const payload = {
        sub: undefined,
        email: undefined,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: undefined,
        email: undefined,
      });
    });
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from config service', () => {
      configService.get.mockReturnValue('test-jwt-secret');

      const newStrategy = new JwtStrategy(configService);

      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(newStrategy).toBeDefined();
    });

    it('should use default secret when JWT_SECRET is not available', () => {
      configService.get.mockReturnValue(undefined);

      const newStrategy = new JwtStrategy(configService);

      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(newStrategy).toBeDefined();
    });
  });
});
