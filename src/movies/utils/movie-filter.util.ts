/**
 * Utility functions for filtering movie data
 */

export interface MovieWithPoster {
  poster_path?: string | null;
  backdrop_path?: string | null;
  [key: string]: any;
}

/**
 * Builds a TMDB image URL with the specified size
 * @param imagePath The image path from TMDB (e.g., "/f89q3dFQbQ5XxHh4XJeH2hFgLD0.jpg")
 * @param size The image size (e.g., "w300", "w780", "w1280", "original")
 * @returns Full TMDB image URL or null if imagePath is invalid
 */
export function buildTmdbImageUrl(imagePath: string | null | undefined, size: string = 'original'): string | null {
  if (!imagePath || imagePath === '') {
    return null;
  }
  // Ensure the path starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `https://image.tmdb.org/t/p/${size}${normalizedPath}`;
}

/**
 * Adds mobile-friendly backdrop path to a movie object
 * @param movie Movie object with backdrop_path
 * @returns Movie object with backdrop_path_mobile added
 */
export function addMobileBackdrop<T extends MovieWithPoster>(movie: T): T & { backdrop_path_mobile?: string | null } {
  if (!movie) {
    return movie as T & { backdrop_path_mobile?: string | null };
  }
  
  return {
    ...movie,
    backdrop_path_mobile: movie.backdrop_path ? buildTmdbImageUrl(movie.backdrop_path, 'w780') : null,
  };
}

export interface ContentFilterOptions {
  includeAdult?: boolean;
  maxCertification?: string;
  certificationCountry?: string;
  excludeGenres?: number[];
  excludeKeywords?: string[];
  originCountries?: string[]; // ISO 3166-1 alpha-2 codes (e.g., ['US', 'IR'])
}

export interface MovieWithCertification extends MovieWithPoster {
  adult?: boolean;
  certification?: string;
  genres?: Array<{ id: number; name: string }>;
  keywords?: Array<{ id: number; name: string }>;
  origin_country?: string[]; // ISO 3166-1 alpha-2 codes
  production_countries?: Array<{ iso_3166_1: string; name: string }>; // Alternative format from TMDB details
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
 * and optionally apply content filtering
 * @param response TMDB API response with results array
 * @param contentFilter Optional content filtering options
 * @returns Modified response with filtered results
 */
export function filterTmdbResponse(response: any, contentFilter?: ContentFilterOptions): any {
  if (!response || !Array.isArray(response.results)) {
    return response;
  }
  
  let filteredResults = filterMoviesWithPoster(response.results);
  
  // Apply content filtering if provided
  if (contentFilter) {
    filteredResults = filterSearchResults(filteredResults, contentFilter);
  }
  
  // Add mobile backdrop paths to all results
  filteredResults = filteredResults.map((movie: any) => addMobileBackdrop(movie));
  
  return {
    ...response,
    results: filteredResults,
    total_results: filteredResults.length
  };
}

/**
 * Filters a single movie object, returns null if no poster_path
 * @param movie Movie object
 * @returns Movie object if it has poster_path, null otherwise, with mobile backdrop added
 */
export function filterSingleMovie<T extends MovieWithPoster>(movie: T | null): (T & { backdrop_path_mobile?: string | null }) | null {
  if (!movie || movie.poster_path === null || movie.poster_path === undefined || movie.poster_path === '') {
    return null;
  }
  return addMobileBackdrop(movie);
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
    excludeKeywords = [],
    originCountries = []
  } = options;

  return movies.filter(movie => {
    // Filter adult content
    if (!includeAdult && movie.adult === true) {
      return false;
    }

    // Filter by origin countries
    // Only filter if origin country data is available in the response
    // If origin country data is not available, we can't filter, so keep the movie
    if (originCountries.length > 0) {
      let movieOriginCountries: string[] = [];
      
      // Check origin_country array (from search/list endpoints)
      if (movie.origin_country && Array.isArray(movie.origin_country)) {
        movieOriginCountries = movie.origin_country;
      }
      // Check production_countries array (from details endpoint)
      else if (movie.production_countries && Array.isArray(movie.production_countries)) {
        movieOriginCountries = movie.production_countries.map(country => country.iso_3166_1);
      }
      
      // Only filter if we have origin country data
      if (movieOriginCountries.length > 0) {
        const hasMatchingOriginCountry = originCountries.some(country => 
          movieOriginCountries.includes(country)
        );
        if (!hasMatchingOriginCountry) {
          return false;
        }
      }
      // If origin country data is not available, we keep the movie (can't filter what we don't have)
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

export interface SearchMovieResult extends MovieWithPoster {
  title?: string;
  original_title?: string;
  overview?: string;
  adult?: boolean;
  genre_ids?: number[];
  origin_country?: string[]; // ISO 3166-1 alpha-2 codes
}

/**
 * Filters search results based on title and overview content
 * Used for /search/movie endpoint which doesn't support certification filtering
 * @param movies Array of movie objects from search results
 * @param options Content filtering options
 * @returns Filtered array of movies
 */
export function filterSearchResults<T extends SearchMovieResult>(movies: T[], options: ContentFilterOptions = {}): T[] {
  if (!Array.isArray(movies)) {
    return [];
  }

  const {
    includeAdult = false,
    excludeGenres = [],
    excludeKeywords = [],
    originCountries = []
  } = options;

  return movies.filter(movie => {
    // Filter adult content
    if (!includeAdult && movie.adult === true) {
      return false;
    }

    // Filter by origin countries
    // Only filter if origin_country data is available in the response
    // If origin_country is not available, we can't filter, so keep the movie
    if (originCountries.length > 0 && movie.origin_country && Array.isArray(movie.origin_country) && movie.origin_country.length > 0) {
      const hasMatchingOriginCountry = originCountries.some(country => 
        movie.origin_country!.includes(country)
      );
      if (!hasMatchingOriginCountry) {
        return false;
      }
    }
    // If origin_country is not available, we keep the movie (can't filter what we don't have)

    // Filter by genres (using genre_ids from search results)
    if (excludeGenres.length > 0 && movie.genre_ids) {
      const hasExcludedGenre = excludeGenres.some(genreId => movie.genre_ids!.includes(genreId));
      if (hasExcludedGenre) {
        return false;
      }
    }

    // Filter by keywords in title and overview
    if (excludeKeywords.length > 0) {
      const title = (movie.title || '').toLowerCase();
      const originalTitle = (movie.original_title || '').toLowerCase();
      const overview = (movie.overview || '').toLowerCase();
      
      const hasExcludedKeyword = excludeKeywords.some(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        return title.includes(lowerKeyword) || 
               originalTitle.includes(lowerKeyword) || 
               overview.includes(lowerKeyword);
      });
      
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
    excludeGenres = [],
    originCountries = []
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

  if (originCountries.length > 0) {
    params.with_origin_country = originCountries.join(',');
  }

  return params;
}


export const IRANIAN_CONTENT_FILTER: ContentFilterOptions = {
  includeAdult: false,
  maxCertification: 'PG-13',
  certificationCountry: 'US',
  excludeGenres: [],
  excludeKeywords: ['sex', 'porn', 'erotic', 'xxx', 'adult'],
  originCountries: ['US', 'IR' , 'us' , 'ir']
};
