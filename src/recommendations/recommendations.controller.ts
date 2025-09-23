import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';

class RecommendationsDto {
  query!: string;
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async get(@Req() req: any, @Body() body: GetRecommendationsDto) {
    const userId = req.user.userId;
    const data = await this.service.getRecommendations(userId, body.query);
    return data;
  }
}
