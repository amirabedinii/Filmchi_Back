/**
 * Utility functions for filtering movie data
 */

export interface MovieWithPoster {
  poster_path?: string | null;
  [key: string]: any;
}

export interface ContentFilterOptions {
  includeAdult?: boolean;
  maxCertification?: string;
  certificationCountry?: string;
  excludeGenres?: number[];
  excludeKeywords?: string[];
}

export interface MovieWithCertification extends MovieWithPoster {
  adult?: boolean;
  certification?: string;
  genres?: Array<{ id: number; name: string }>;
  keywords?: Array<{ id: number; name: string }>;
}

/**
 * Filters out movies that have null or undefined poster_path
 * @param movies Array of movie objects
 * @returns Filtered array with only movies that have a valid poster_path
 */
export function filterMoviesWithPoster<T extends MovieWithPoster>(movies: T[]): T[] {
  if (!Array.isArray(movies)) {
    return [];
  }
  
  return movies.filter(movie => {
    return movie.poster_path !== null && movie.poster_path !== undefined && movie.poster_path !== '';
  });
}

/**
 * Filters a TMDB API response to remove movies without poster_path
 * @param response TMDB API response with results array
 * @returns Modified response with filtered results
 */
export function filterTmdbResponse(response: any): any {
  if (!response || !Array.isArray(response.results)) {
    return response;
  }
  
  return {
    ...response,
    results: filterMoviesWithPoster(response.results)
  };
}

/**
 * Filters a single movie object, returns null if no poster_path
 * @param movie Movie object
 * @returns Movie object if it has poster_path, null otherwise
 */
export function filterSingleMovie<T extends MovieWithPoster>(movie: T | null): T | null {
  if (!movie || movie.poster_path === null || movie.poster_path === undefined || movie.poster_path === '') {
    return null;
  }
  return movie;
}

/**
 * Filters movies based on content rating and adult content
 * @param movies Array of movie objects
 * @param options Content filtering options
 * @returns Filtered array of movies
 */
export function filterContent<T extends MovieWithCertification>(
  movies: T[],
  options: ContentFilterOptions = {}
): T[] {
  if (!Array.isArray(movies)) {
    return [];
  }

  const {
    includeAdult = false,
    maxCertification,
    certificationCountry = 'US',
    excludeGenres = [],
    excludeKeywords = []
  } = options;

  return movies.filter(movie => {
    // Filter adult content
    if (!includeAdult && movie.adult === true) {
      return false;
    }

    // Filter by certification (if available)
    if (maxCertification && movie.certification) {
      const certificationOrder = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
      const movieCertIndex = certificationOrder.indexOf(movie.certification);
      const maxCertIndex = certificationOrder.indexOf(maxCertification);
      
      if (movieCertIndex > maxCertIndex) {
        return false;
      }
    }

    // Filter by genres
    if (excludeGenres.length > 0 && movie.genres) {
      const movieGenreIds = movie.genres.map(genre => genre.id);
      const hasExcludedGenre = excludeGenres.some(genreId => movieGenreIds.includes(genreId));
      if (hasExcludedGenre) {
        return false;
      }
    }

    // Filter by keywords
    if (excludeKeywords.length > 0 && movie.keywords) {
      const movieKeywords = movie.keywords.map(keyword => keyword.name.toLowerCase());
      const hasExcludedKeyword = excludeKeywords.some(keyword => 
        movieKeywords.some(movieKeyword => movieKeyword.includes(keyword.toLowerCase()))
      );
      if (hasExcludedKeyword) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Creates TMDB API parameters for content filtering
 * @param options Content filtering options
 * @returns TMDB API parameters object
 */
export function createTmdbFilterParams(options: ContentFilterOptions = {}): Record<string, any> {
  const params: Record<string, any> = {};

  const {
    includeAdult = false,
    maxCertification,
    certificationCountry = 'US',
    excludeGenres = []
  } = options;

  // Adult content filter
  params.include_adult = includeAdult;

  // Certification filter
  if (maxCertification) {
    params.certification_country = certificationCountry;
    params.certification_lte = maxCertification;
  }

  // Genre exclusion
  if (excludeGenres.length > 0) {
    params.without_genres = excludeGenres.join(',');
  }

  return params;
}

/**
 * Default content filter for Iranian audiences
 * Only filters by certification (PG-13 and below), no genre exclusions
 */
export const IRANIAN_CONTENT_FILTER: ContentFilterOptions = {
  includeAdult: false,
  maxCertification: 'PG-13',
  certificationCountry: 'US'
};
