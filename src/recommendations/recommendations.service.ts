import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ListsService } from '../lists/lists.service';
import { LLMService } from '../llm/services/llm.service';
import { TmdbService } from '../movies/tmdb.service';
import { filterMoviesWithPoster, filterContent, ContentFilterOptions, IRANIAN_CONTENT_FILTER } from '../movies/utils/movie-filter.util';

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
    contentFilter?: ContentFilterOptions,
  ): Promise<EnrichedRecommendation[]> {
    Logger.debug({ userId, userQuery }, 'Recommendations: start');
    const watchedResponse = await this.listsService.getMoviesForList(
      userId,
      'watched',
      { page: 1, limit: 50, sort: 'desc' },
    );
    const watchlistResponse = await this.listsService.getMoviesForList(
      userId,
      'watchlist',
      { page: 1, limit: 50, sort: 'desc' },
    );
    Logger.debug(
      { watchedCount: watchedResponse.items.length, watchlistCount: watchlistResponse.items.length },
      'Recommendations: list counts',
    );

    const historyTitles = [
      ...watchedResponse.items.map((m: any) => m.title).filter(Boolean),
      ...watchlistResponse.items.map((m: any) => m.title).filter(Boolean),
    ];

    // Use the new LLM service
    let rawRecs: RawRecommendation[] = [];
    try {
      const llmResponse = await this.llmService.generateMovieRecommendations({
        userQuery,
        userHistory: historyTitles,
        maxRecommendations: 7,
        language,
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

    // Process TMDB enrichment with timeout and concurrency limit
    const enriched: EnrichedRecommendation[] = [];
    const concurrencyLimit = 3; // Limit concurrent TMDB requests
    
    for (let i = 0; i < rawRecs.length; i += concurrencyLimit) {
      const batch = rawRecs.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (rec) => {
        try {
          const tmdb = await this.findOnTmdb(rec.title, rec.year, language, contentFilter);
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
      });
      
      const batchResults = await Promise.all(batchPromises);
      enriched.push(...batchResults.filter(Boolean) as EnrichedRecommendation[]);
    }

    Logger.debug(
      { enrichedCount: enriched.length },
      'Recommendations: enriched recommendations count',
    );

    // Debug: show poster_path values before filtering
    Logger.debug(
      { posterPaths: enriched.map(r => r.posterPath) },
      'Recommendations: poster_path values before filtering',
    );

    // Debug: show full movie objects before filtering
    Logger.debug(
      { enrichedMovies: enriched },
      'Recommendations: full movie objects before filtering',
    );

    // Debug: check what properties are actually present
    Logger.debug(
      { properties: enriched.map(r => Object.keys(r)) },
      'Recommendations: object properties before filtering',
    );

    // Filter out recommendations with null poster_path
    // Note: The filter function expects 'poster_path' but we have 'posterPath'
    // Temporarily map the property for debugging
    const moviesForFiltering = enriched.map(movie => ({
      ...movie,
      poster_path: movie.posterPath
    }));
    
    const filteredRecommendations = filterMoviesWithPoster(moviesForFiltering);
    
    // Map back to the original structure
    const finalRecommendations = filteredRecommendations.map(movie => ({
      ...movie,
      posterPath: movie.poster_path,
      poster_path: undefined // remove the temporary property
    }));
    
    Logger.debug(
      { filteredCount: finalRecommendations.length },
      'Recommendations: filtered recommendations count',
    );

    return finalRecommendations;
  }

  private async findOnTmdb(title: string, year?: number, language?: string, contentFilter?: ContentFilterOptions): Promise<any | null> {
    try {
      // Add timeout wrapper for TMDB requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TMDB request timeout')), 8000)
      );
      
      const searchPromise = this.tmdb.searchMovie(title, year, 1, language, contentFilter);
      const searchResp = await Promise.race([searchPromise, timeoutPromise]) as any;
      
      const results = Array.isArray(searchResp?.results)
        ? searchResp.results
        : [];
      if (results.length === 0) {
        Logger.debug({ title, year }, 'TMDB search returned no results');
        return null;
      }

      const best = this.pickBestTmdbMatch(title, year, results);
      if (!best) return null;
      
      const detailsPromise = this.tmdb.getMovieDetails(best.id, language);
      const detailsResp = await Promise.race([detailsPromise, timeoutPromise]) as any;
      
      // Apply additional content filtering on the movie details if needed
      if (contentFilter && detailsResp) {
        const filteredResults = filterContent([detailsResp], contentFilter, language);
        if (filteredResults.length === 0) {
          Logger.debug({ title, year }, 'Movie filtered out by content filter');
          return null;
        }
        return filteredResults[0];
      }
      
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
