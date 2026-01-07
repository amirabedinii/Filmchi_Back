import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { IRANIAN_CONTENT_FILTER } from '../movies/utils/movie-filter.util';

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
    const language = body.language?.toLowerCase();

    // Use provided content filter or default to Iranian filter
    const contentFilter = body.contentFilter || IRANIAN_CONTENT_FILTER;

    const data = await this.service.getRecommendations(
      userId,
      body.query,
      language,
      contentFilter,
    );
    return data;
  }
}
