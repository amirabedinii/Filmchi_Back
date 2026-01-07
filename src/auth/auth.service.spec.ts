import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  let mockUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh mock user for each test
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      refreshTokenHash: 'hashed-refresh-token',
      tokenVersion: 1,
      createdAt: new Date(),
    };
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password' as never);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-refresh-token' as never);
      jwtService.sign.mockReturnValue('access-token');
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_JWT_SECRET') return 'refresh-secret';
        if (key === 'REFRESH_JWT_EXPIRES_IN') return '7d';
        return undefined;
      });
      mockedJwt.sign.mockReturnValue('refresh-token' as never);

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        passwordHash: 'hashed-password',
      });
      expect(userRepository.save).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-refresh-token' as never);
      jwtService.sign.mockReturnValue('access-token');
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_JWT_SECRET') return 'refresh-secret';
        if (key === 'REFRESH_JWT_EXPIRES_IN') return '7d';
        return undefined;
      });
      mockedJwt.sign.mockReturnValue('refresh-token' as never);

      const result = await service.login(loginDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.passwordHash,
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    const refreshDto: RefreshDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh tokens successfully', async () => {
      const decodedToken = { sub: mockUser.id, tv: mockUser.tokenVersion };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue({ ...mockUser, tokenVersion: 2 });
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-refresh-token' as never);
      jwtService.sign.mockReturnValue('new-access-token');
      mockedJwt.sign.mockReturnValue('new-refresh-token' as never);

      const result = await service.refresh(refreshDto);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        'refresh-secret',
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        'hashed-refresh-token',
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const decodedToken = { sub: 'non-existent-user', tv: 1 };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token version mismatch', async () => {
      const decodedToken = { sub: mockUser.id, tv: 999 };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token hash does not match', async () => {
      const decodedToken = { sub: mockUser.id, tv: mockUser.tokenVersion };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const refreshDto: RefreshDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should logout user successfully', async () => {
      const decodedToken = { sub: mockUser.id };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      userRepository.save.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
        tokenVersion: 2,
      });

      const result = await service.logout(refreshDto);

      expect(mockedJwt.verify).toHaveBeenCalledWith(
        refreshDto.refreshToken,
        'refresh-secret',
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshTokenHash: null,
          tokenVersion: 2,
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('should return success even if token is invalid', async () => {
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.logout(refreshDto);

      expect(result).toEqual({ success: true });
    });

    it('should return success even if user not found', async () => {
      const decodedToken = { sub: 'non-existent-user' };
      configService.get.mockReturnValue('refresh-secret');
      mockedJwt.verify.mockReturnValue(decodedToken as never);
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.logout(refreshDto);

      expect(result).toEqual({ success: true });
    });
  });

  describe('private methods through public methods', () => {
    it('should call signAccessToken and signRefreshToken during registration', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-password' as never);
      mockedBcrypt.hash.mockResolvedValueOnce('hashed-refresh-token' as never);
      jwtService.sign.mockReturnValue('access-token');
      configService.get.mockImplementation((key: string) => {
        if (key === 'REFRESH_JWT_SECRET') return 'refresh-secret';
        if (key === 'REFRESH_JWT_EXPIRES_IN') return '7d';
        return undefined;
      });
      mockedJwt.sign.mockReturnValue('refresh-token' as never);

      await service.register(registerDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        tv: mockUser.tokenVersion,
      });
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { sub: mockUser.id, tv: mockUser.tokenVersion },
        'refresh-secret',
        { expiresIn: '7d' },
      );
    });
  });
});
