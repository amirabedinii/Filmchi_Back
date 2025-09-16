import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ListsService } from '../lists/lists.service';

type RawRecommendation = { title: string; year?: number; reason: string };

export type EnrichedRecommendation = RawRecommendation & {
  tmdbId: number;
  posterPath?: string;
  overview?: string;
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly listsService: ListsService,
  ) {}

  async getRecommendations(userId: string, userQuery: string): Promise<EnrichedRecommendation[]> {
    const watched = await this.listsService.getMoviesForList(userId, 'watched', { page: 1, limit: 50, sort: 'desc' });
    const watchlist = await this.listsService.getMoviesForList(userId, 'watchlist', { page: 1, limit: 50, sort: 'desc' });

    const historyTitles = [
      ...watched.map((m: any) => m.title).filter(Boolean),
      ...watchlist.map((m: any) => m.title).filter(Boolean),
    ];

    const ollamaUrl = this.config.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    const prompt = this.buildPrompt(historyTitles, userQuery);

    const schema = {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              year: { type: 'number' },
              reason: { type: 'string' },
            },
            required: ['title', 'reason'],
          },
        },
      },
      required: ['recommendations'],
    } as const;

    const body = {
      model: 'llama3.1',
      prompt,
      format: schema,
      stream: false,
    } as any;

    const ollamaResponse = await firstValueFrom(this.http.post(ollamaUrl + '/api/generate', body));
    const rawRecs: RawRecommendation[] = ollamaResponse.data?.recommendations || [];

    const enriched: EnrichedRecommendation[] = [];
    for (const rec of rawRecs) {
      const tmdb = await this.findOnTmdb(rec.title, rec.year);
      if (!tmdb) continue;
      enriched.push({ ...rec, tmdbId: tmdb.id, posterPath: tmdb.poster_path, overview: tmdb.overview });
    }

    return enriched;
  }

  private buildPrompt(historyTitles: string[], userQuery: string): string {
    const historyStr = historyTitles.slice(0, 50).join(', ');
    return [
      'You are a movie recommendation engine.',
      `User history: ${historyStr || 'no history provided'}.`,
      `User query: ${userQuery}.`,
      'Return JSON strictly matching the provided schema with 5-8 items.',
    ].join('\n');
  }

  private async findOnTmdb(title: string, year?: number): Promise<any | null> {
    const tmdbKey = this.config.get<string>('TMDB_API_KEY') || '';
    const base = 'https://api.themoviedb.org/3';
    const searchUrl = `${base}/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(title)}${
      year ? `&year=${year}` : ''
    }`;
    const searchResp = await firstValueFrom(this.http.get(searchUrl));
    const id = searchResp.data?.results?.[0]?.id;
    if (!id) return null;
    const detailsUrl = `${base}/movie/${id}?api_key=${tmdbKey}`;
    const detailsResp = await firstValueFrom(this.http.get(detailsUrl));
    return detailsResp.data;
  }
}


