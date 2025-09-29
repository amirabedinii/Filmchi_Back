import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ListsService } from '../lists/lists.service';
import { LLMService } from '../llm/services/llm.service';
import { TmdbService } from '../movies/tmdb.service';
import { filterMoviesWithPoster } from '../movies/utils/movie-filter.util';

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
    private readonly llmService: LLMService,
    private readonly tmdb: TmdbService,
  ) {}

  async getRecommendations(
    userId: string,
    userQuery: string,
    language?: string,
  ): Promise<EnrichedRecommendation[]> {
    Logger.debug({ userId, userQuery }, 'Recommendations: start');
    const watched = await this.listsService.getMoviesForList(
      userId,
      'watched',
      { page: 1, limit: 50, sort: 'desc' },
    );
    const watchlist = await this.listsService.getMoviesForList(
      userId,
      'watchlist',
      { page: 1, limit: 50, sort: 'desc' },
    );
    Logger.debug(
      { watchedCount: watched.length, watchlistCount: watchlist.length },
      'Recommendations: list counts',
    );

    const historyTitles = [
      ...watched.map((m: any) => m.title).filter(Boolean),
      ...watchlist.map((m: any) => m.title).filter(Boolean),
    ];

    // Use the new LLM service
    let rawRecs: RawRecommendation[] = [];
    try {
      const llmResponse = await this.llmService.generateMovieRecommendations({
        userQuery,
        userHistory: historyTitles,
        maxRecommendations: 7,
      });

      rawRecs = llmResponse.recommendations || [];
      Logger.debug(
        { rawCount: rawRecs.length },
        'Recommendations: raw recommendations received from LLM service',
      );
    } catch (error: any) {
      Logger.error(
        { err: error?.message },
        'Recommendations: LLM service request failed',
      );
      return [];
    }

    if (!Array.isArray(rawRecs) || rawRecs.length === 0) {
      Logger.warn(
        { userId, userQuery },
        'Recommendations: no raw recommendations from LLM service',
      );
      return [];
    }

    if (!this.tmdb.hasAuthConfigured()) {
      Logger.warn(
        'Recommendations: TMDB auth not set, returning raw items with tmdbId=0',
      );
      const minimal = rawRecs.map((rec) => ({
        ...rec,
        tmdbId: 0,
      })) as EnrichedRecommendation[];
      Logger.debug(
        { returnedCount: minimal.length },
        'Recommendations: returning minimal recommendations',
      );
      return minimal;
    }

    const enriched: EnrichedRecommendation[] = (
      await Promise.all(
        rawRecs.map(async (rec) => {
          try {
            const tmdb = await this.findOnTmdb(rec.title, rec.year, language);
            if (!tmdb) {
              Logger.debug(
                { title: rec.title, year: rec.year },
                'Recommendations: TMDB match not found',
              );
              return null;
            }
            return {
              ...rec,
              tmdbId: tmdb.id,
              posterPath: tmdb.poster_path,
              overview: tmdb.overview,
            } as EnrichedRecommendation;
          } catch (error: any) {
            Logger.warn(
              { err: error?.message, title: rec.title, year: rec.year },
              'TMDB enrichment failed',
            );
            return null;
          }
        }),
      )
    ).filter(Boolean) as EnrichedRecommendation[];

    Logger.debug(
      { enrichedCount: enriched.length },
      'Recommendations: enriched recommendations count',
    );

    // Filter out recommendations with null poster_path
    const filteredRecommendations = filterMoviesWithPoster(enriched);
    
    Logger.debug(
      { filteredCount: filteredRecommendations.length },
      'Recommendations: filtered recommendations count',
    );

    return filteredRecommendations;
  }

  private async findOnTmdb(title: string, year?: number, language?: string): Promise<any | null> {
    try {
      const searchResp = await this.tmdb.searchMovie(title, year, 1, language);
      const results = Array.isArray(searchResp?.results)
        ? searchResp.results
        : [];
      if (results.length === 0) {
        Logger.debug({ title, year }, 'TMDB search returned no results');
        return null;
      }

      const best = this.pickBestTmdbMatch(title, year, results);
      if (!best) return null;
      const detailsResp = await this.tmdb.getMovieDetails(best.id, language);
      return detailsResp;
    } catch (error: any) {
      Logger.error({ err: error?.message, title, year }, 'TMDB request failed');
      return null;
    }
  }

  private pickBestTmdbMatch(
    title: string,
    year: number | undefined,
    results: any[],
  ): any | null {
    if (results.length === 1) {
      return results[0];
    }
    const norm = (s: string) => s.toLowerCase().trim();
    const parseYear = (date?: string) =>
      date && date.length >= 4 ? Number(date.slice(0, 4)) : undefined;
    const targetTitle = norm(title);
    const targetYear = year;

    const scored = results.map((r) => {
      const rTitle = norm(r.title || r.original_title || '');
      const rYear = parseYear(r.release_date);
      const titleScore =
        1 -
        this.levenshteinDistance(targetTitle, rTitle) /
          Math.max(targetTitle.length || 1, rTitle.length || 1);
      const yearScore =
        targetYear && rYear
          ? Math.abs(targetYear - rYear) <= 1
            ? 1
            : Math.max(0, 1 - Math.abs(targetYear - rYear) / 5)
          : 0.5;
      const popularityScore =
        typeof r.popularity === 'number'
          ? Math.min(1, r.popularity / 100)
          : 0.3;
      const exactTitleBoost = targetTitle === rTitle ? 0.2 : 0;
      const score =
        titleScore * 0.6 +
        yearScore * 0.3 +
        popularityScore * 0.1 +
        exactTitleBoost;
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
