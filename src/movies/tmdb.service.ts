import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
// Axios v1 headers type can be complex; use a simple record for compatibility
import { firstValueFrom } from 'rxjs';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

@Injectable()
export class TmdbService {
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private useBearer(): boolean {
    return Boolean(this.config.get<string>('TMDB_BEARER_TOKEN'));
  }

  hasAuthConfigured(): boolean {
    const bearer = this.config.get<string>('TMDB_BEARER_TOKEN');
    const apiKey = this.config.get<string>('TMDB_API_KEY');
    return Boolean((bearer && bearer.length > 0) || (apiKey && apiKey.length > 0));
  }

  private authHeaders(): Record<string, string> | undefined {
    const bearer = this.config.get<string>('TMDB_BEARER_TOKEN');
    return bearer ? { Authorization: `Bearer ${bearer}` } : undefined;
  }

  private withApiKey(path: string): string {
    const key = this.config.get<string>('TMDB_API_KEY') || '';
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}api_key=${key}`;
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const urlPath = this.useBearer() ? normalizedPath : this.withApiKey(normalizedPath);
    return `${this.baseUrl}${urlPath}`;
  }

  async request<T = any>(method: HttpMethod, path: string, params?: any, data?: any): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.authHeaders();
    const observable = this.http.request<T>({ method, url, headers: headers as any, params, data });
    const response = await firstValueFrom(observable);
    return response.data as T;
  }

  // Convenience helpers
  get<T = any>(path: string, params?: any) {
    return this.request<T>('get', path, params);
  }

  post<T = any>(path: string, data?: any, params?: any) {
    return this.request<T>('post', path, params, data);
  }

  // Common TMDB endpoints used around the app
  searchMovie(query: string, year?: number, page: number = 1) {
    const params: any = { query, page };
    if (year) params.year = year;
    return this.get('/search/movie', params);
  }

  getMovieDetails(tmdbId: number) {
    return this.get(`/movie/${tmdbId}`);
  }

  getTrending() {
    return this.get('/trending/movie/week');
  }

  getPopular(page: number = 1) {
    return this.get('/movie/popular', { page });
  }

  getTopRated(page: number = 1) {
    return this.get('/movie/top_rated', { page });
  }

  getNowPlaying(page: number = 1) {
    return this.get('/movie/now_playing', { page });
  }

  getUpcoming(page: number = 1) {
    return this.get('/movie/upcoming', { page });
  }

  getSimilar(tmdbId: number, page: number = 1) {
    return this.get(`/movie/${tmdbId}/similar`, { page });
  }
}


