import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle registration errors', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const error = new Error('Registration failed');
      authService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Registration failed',
      );
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle login errors', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refresh.mockResolvedValue(mockAuthResponse);

      const result = await controller.refresh(refreshDto);

      expect(authService.refresh).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle refresh errors', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'invalid-refresh-token',
      };

      const error = new Error('Invalid refresh token');
      authService.refresh.mockRejectedValue(error);

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should logout a user', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockLogoutResponse = { success: true };
      authService.logout.mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(refreshDto);

      expect(authService.logout).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(mockLogoutResponse);
    });

    it('should handle logout errors gracefully', async () => {
      const refreshDto: RefreshDto = {
        refreshToken: 'any-token',
      };

      const error = new Error('Logout failed');
      authService.logout.mockRejectedValue(error);

      await expect(controller.logout(refreshDto)).rejects.toThrow(
        'Logout failed',
      );
    });
  });
});