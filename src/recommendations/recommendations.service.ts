import { Injectable, Logger } from '@nestjs/common';
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
    Logger.debug({ userId, userQuery }, 'Recommendations: start');
    const watched = await this.listsService.getMoviesForList(userId, 'watched', { page: 1, limit: 50, sort: 'desc' });
    const watchlist = await this.listsService.getMoviesForList(userId, 'watchlist', { page: 1, limit: 50, sort: 'desc' });
    Logger.debug({ watchedCount: watched.length, watchlistCount: watchlist.length }, 'Recommendations: list counts');

    const historyTitles = [
      ...watched.map((m: any) => m.title).filter(Boolean),
      ...watchlist.map((m: any) => m.title).filter(Boolean),
    ];

    const ollamaUrl = this.config.get<string>('OLLAMA_URL') || 'http://localhost:11434';
    const ollamaModel = this.config.get<string>('OLLAMA_MODEL') || 'llama3.1';
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
      model: ollamaModel,
      prompt,
      format: schema,
      stream: false,
    } as any;

    Logger.debug({ ollamaUrl, ollamaModel }, 'Recommendations: calling Ollama');
    let ollamaResponse: any;
    try {
      ollamaResponse = await firstValueFrom(this.http.post(ollamaUrl + '/api/generate', body));
    } catch (error: any) {
      Logger.error({ err: error?.message, status: error?.response?.status }, 'Recommendations: Ollama request failed');
      return [];
    }

    // Ollama with `format` usually returns a JSON string in `response`
    // e.g. { response: "{ \"recommendations\": [...] }", ... }
    // Fallbacks:
    // - data.recommendations (if middleware parsed already)
    // - try parse entire data if it is a string
    let rawRecs: RawRecommendation[] = [];
    try {
      const data = ollamaResponse?.data;
      if (data && typeof data.response === 'string') {
        const parsed = JSON.parse(data.response);
        rawRecs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
        Logger.debug({ parsedCount: rawRecs.length }, 'Recommendations: parsed from data.response');
      } else if (Array.isArray(data?.recommendations)) {
        rawRecs = data.recommendations;
        Logger.debug({ parsedCount: rawRecs.length }, 'Recommendations: parsed from data.recommendations');
      } else if (typeof data === 'string') {
        const parsed = JSON.parse(data);
        rawRecs = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
        Logger.debug({ parsedCount: rawRecs.length }, 'Recommendations: parsed from string data');
      } else {
        Logger.warn({ sample: JSON.stringify(data)?.slice(0, 200) }, 'Recommendations: unexpected Ollama response shape');
      }
    } catch (parseErr: any) {
      Logger.error({ err: parseErr?.message, sample: JSON.stringify(ollamaResponse?.data)?.slice(0, 200) }, 'Recommendations: failed to parse Ollama response');
      rawRecs = [];
    }

    if (!Array.isArray(rawRecs) || rawRecs.length === 0) {
      Logger.warn({ userId, userQuery }, 'Recommendations: no raw recommendations from Ollama');
      return [];
    }
    Logger.debug({ rawCount: rawRecs.length }, 'Recommendations: raw recommendations received');

    const tmdbKey = this.config.get<string>('TMDB_API_KEY') || '';
    if (!tmdbKey) {
      Logger.warn('Recommendations: TMDB_API_KEY not set, returning raw items with tmdbId=0');
      const minimal = rawRecs.map((rec) => ({ ...rec, tmdbId: 0 })) as EnrichedRecommendation[];
      Logger.debug({ returnedCount: minimal.length }, 'Recommendations: returning minimal recommendations');
      return minimal;
    }

    const enriched: EnrichedRecommendation[] = (
      await Promise.all(
        rawRecs.map(async (rec) => {
          try {
            const tmdb = await this.findOnTmdb(rec.title, rec.year);
            if (!tmdb) {
              Logger.debug({ title: rec.title, year: rec.year }, 'Recommendations: TMDB match not found');
              return null;
            }
            return { ...rec, tmdbId: tmdb.id, posterPath: tmdb.poster_path, overview: tmdb.overview } as EnrichedRecommendation;
          } catch (error: any) {
            Logger.warn({ err: error?.message, title: rec.title, year: rec.year }, 'TMDB enrichment failed');
            return null;
          }
        }),
      )
    ).filter(Boolean) as EnrichedRecommendation[];

    Logger.debug({ enrichedCount: enriched.length }, 'Recommendations: enriched recommendations count');

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
    const tmdbBearer = this.config.get<string>('TMDB_BEARER_TOKEN') || '';
    const base = 'https://api.themoviedb.org/3';
    const useBearer = Boolean(tmdbBearer);
    Logger.debug({ useBearer }, 'TMDB: auth method');

    const searchUrl = useBearer
      ? `${base}/search/movie?query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`
      : `${base}/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;

    const headers = useBearer ? { Authorization: `Bearer ${tmdbBearer}` } : undefined;
    try {
      const searchResp = await firstValueFrom(this.http.get(searchUrl, { headers }));
      const results = Array.isArray(searchResp.data?.results) ? searchResp.data.results : [];
      if (results.length === 0) {
        Logger.debug({ title, year }, 'TMDB search returned no results');
        return null;
      }

      const best = this.pickBestTmdbMatch(title, year, results);
      if (!best) return null;

      const detailsUrl = useBearer ? `${base}/movie/${best.id}` : `${base}/movie/${best.id}?api_key=${tmdbKey}`;
      const detailsResp = await firstValueFrom(this.http.get(detailsUrl, { headers }));
      return detailsResp.data;
    } catch (error: any) {
      Logger.error({ err: error?.message, title, year }, 'TMDB request failed');
      return null;
    }
  }

  private pickBestTmdbMatch(title: string, year: number | undefined, results: any[]): any | null {
    if (results.length === 1) {
      return results[0];
    }
    const norm = (s: string) => s.toLowerCase().trim();
    const parseYear = (date?: string) => (date && date.length >= 4 ? Number(date.slice(0, 4)) : undefined);
    const targetTitle = norm(title);
    const targetYear = year;

    const scored = results.map((r) => {
      const rTitle = norm(r.title || r.original_title || '');
      const rYear = parseYear(r.release_date);
      const titleScore = 1 - this.levenshteinDistance(targetTitle, rTitle) / Math.max(targetTitle.length || 1, rTitle.length || 1);
      const yearScore = targetYear && rYear ? (Math.abs(targetYear - rYear) <= 1 ? 1 : Math.max(0, 1 - Math.abs(targetYear - rYear) / 5)) : 0.5;
      const popularityScore = typeof r.popularity === 'number' ? Math.min(1, r.popularity / 100) : 0.3;
      const exactTitleBoost = targetTitle === rTitle ? 0.2 : 0;
      const score = titleScore * 0.6 + yearScore * 0.3 + popularityScore * 0.1 + exactTitleBoost;
      return { r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) return null;

    // Basic threshold to avoid very poor matches
    if (best.score < 0.5) return null;
    return best.r;
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }
    return dp[m][n];
  }
}


