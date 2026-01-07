import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async signAccessToken(user: User): Promise<string> {
    const payload = { sub: user.id, email: user.email, tv: user.tokenVersion };
    return this.jwtService.sign(payload);
  }

  private async signRefreshToken(user: User): Promise<string> {
    const payload: any = { sub: user.id, tv: user.tokenVersion };
    const secret = this.configService.get<string>(
      'REFRESH_JWT_SECRET',
    )! as jwt.Secret;
    const expiresIn = (this.configService.get<string>(
      'REFRESH_JWT_EXPIRES_IN',
    ) || '7d') as jwt.SignOptions['expiresIn'];
    return jwt.sign(payload, secret, { expiresIn });
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
    });

    const savedUser = await this.userRepository.save(user);

    const accessToken = await this.signAccessToken(savedUser);
    const refreshToken = await this.signRefreshToken(savedUser);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    savedUser.refreshTokenHash = refreshTokenHash;
    await this.userRepository.save(savedUser);

    return { accessToken, refreshToken };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.save(user);
    return { accessToken, refreshToken };
  }

  async refresh(
    dto: RefreshDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = this.configService.get<string>(
      'REFRESH_JWT_SECRET',
    )! as jwt.Secret;
    let decoded: any;
    try {
      decoded = jwt.verify(dto.refreshToken, secret) as any;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.userRepository.findOne({
      where: { id: decoded.sub },
    });
    if (
      !user ||
      typeof decoded.tv !== 'number' ||
      decoded.tv !== user.tokenVersion
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const matches =
      user.refreshTokenHash &&
      (await bcrypt.compare(dto.refreshToken, user.refreshTokenHash));
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    user.tokenVersion += 1;
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.save(user);
    return { accessToken, refreshToken };
  }

  async logout(dto: RefreshDto): Promise<{ success: boolean }> {
    const secret = this.configService.get<string>(
      'REFRESH_JWT_SECRET',
    )! as jwt.Secret;
    try {
      const decoded: any = jwt.verify(dto.refreshToken, secret);
      const user = await this.userRepository.findOne({
        where: { id: decoded.sub },
      });
      if (user) {
        user.refreshTokenHash = null;
        user.tokenVersion += 1;
        await this.userRepository.save(user);
      }
    } catch {
      // ignore
    }
    return { success: true };
  }
}
