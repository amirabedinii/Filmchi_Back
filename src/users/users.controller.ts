import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdatePreferencesDto, UpdatePrivacyDto, UpdateProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Req } from '@nestjs/common';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Get('stats')
  async stats(@Req() req: any) {
    return this.usersService.stats(req.user.userId);
  }

  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(req.user.userId, dto);
  }

  @Put('privacy')
  async updatePrivacy(@Req() req: any, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(req.user.userId, dto);
  }

  @Put('activity')
  async setActivity(@Req() req: any, @Body('status') status: string) {
    return this.usersService.setActivityStatus(req.user.userId, status);
  }

  @Get('export')
  async export(@Req() req: any) {
    return this.usersService.exportData(req.user.userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('account')
  async deleteAccount(@Req() req: any) {
    await this.usersService.softDelete(req.user.userId);
  }
}


