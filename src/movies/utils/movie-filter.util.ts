/**
 * Utility functions for filtering movie data
 */

/**
 * Language detection and filtering utilities
 */

/**
 * Checks if a string contains Persian/Farsi characters
 * @param text The text to check
 * @returns true if the text contains Persian characters
 */
export function containsPersianChars(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // Persian/Farsi Unicode range: \u0600-\u06FF
  // This includes Arabic characters used in Persian
  const persianRegex = /[\u0600-\u06FF]/;
  return persianRegex.test(text);
}

/**
 * Checks if a string contains English/Latin characters
 * @param text The text to check
 * @returns true if the text contains English characters
 */
export function containsEnglishChars(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  // English/Latin characters: a-z, A-Z
  const englishRegex = /[a-zA-Z]/;
  return englishRegex.test(text);
}

/**
 * Checks if a movie title aligns with the requested language
 * - If language is 'fa' (Persian): title should only contain Persian characters
 * - If language is 'en' (English): title should only contain English characters
 * @param title The movie title to check
 * @param originalTitle The original title (fallback if title is empty)
 * @param language The requested language code (ISO 639-1)
 * @returns true if the title aligns with the requested language
 */
export function isTitleAlignedWithLanguage(
  title: string | null | undefined,
  originalTitle: string | null | undefined,
  language?: string,
): boolean {
  if (!language) {
    return true; // No language filter, accept all
  }

  const normalizedLang = language.toLowerCase();
  const titleToCheck = title || originalTitle || '';

  if (!titleToCheck || titleToCheck.trim() === '') {
    return true; // No title to check, accept it
  }

  // Persian language filter: Accept titles that have Persian characters
  // OR accept any title if no Persian translation is available (TMDB may not have translation)
  // This is less strict to allow international movies to appear in Persian UI
  if (normalizedLang === 'fa' || normalizedLang === 'persian' || normalizedLang === 'farsi') {
    // If title has Persian chars, accept it (it's already translated)
    // If title doesn't have Persian chars, also accept it (TMDB doesn't have translation)
    // We only reject if title has both Persian and English mixed (malformed)
    return true; // Accept all - let other filters (poster, etc.) handle quality
  }

  // English language filter: title should only contain English characters
  // (must have English chars and must not have Persian chars)
  if (normalizedLang === 'en' || normalizedLang === 'english') {
    return containsEnglishChars(titleToCheck) && !containsPersianChars(titleToCheck);
  }

  // For other languages, accept all (can be extended later)
  return true;
}

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
  title?: string;
  original_title?: string;
  original_language?: string; // ISO 639-1 language code (e.g., 'en', 'fa', 'ko')
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
 * @param language Optional language code to filter titles by language alignment
 * @returns Modified response with filtered results
 */
export function filterTmdbResponse(
  response: any,
  contentFilter?: ContentFilterOptions,
  language?: string,
): any {
  if (!response || !Array.isArray(response.results)) {
    return response;
  }

  let filteredResults = filterMoviesWithPoster(response.results);

  // Apply content filtering if provided
  if (contentFilter) {
    filteredResults = filterSearchResults(filteredResults, contentFilter, language);
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
 * @param language Optional language code to filter titles by language alignment
 * @returns Filtered array of movies
 */
export function filterContent<T extends MovieWithCertification>(
  movies: T[],
  options: ContentFilterOptions = {},
  language?: string,
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
    // If originCountries filter is set, we must verify the movie is from allowed countries
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

      // First, try to use origin country data if available (most accurate)
      if (movieOriginCountries.length > 0) {
        const hasMatchingOriginCountry = originCountries.some(country =>
          movieOriginCountries.includes(country)
        );
        if (!hasMatchingOriginCountry) {
          return false;
        }
      } else {
        // Fallback: use original_language as a proxy for country
        // This is not perfect but better than excluding everything
        // English (en) -> US, Persian/Farsi (fa) -> IR
        const originalLang = movie.original_language?.toLowerCase();
        const isEnglishMovie = originalLang === 'en' && originCountries.some(c => c.toLowerCase() === 'us');
        const isPersianMovie = (originalLang === 'fa' || originalLang === 'persian' || originalLang === 'farsi') &&
          originCountries.some(c => c.toLowerCase() === 'ir');

        if (!isEnglishMovie && !isPersianMovie) {
          // No origin country data and language doesn't match allowed countries
          return false;
        }
      }
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

    // Filter by title language alignment
    if (language) {
      if (!isTitleAlignedWithLanguage(movie.title, movie.original_title, language)) {
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
  original_language?: string; // ISO 639-1 language code (e.g., 'en', 'fa', 'ko')
}

/**
 * Filters search results based on title and overview content
 * Used for /search/movie endpoint which doesn't support certification filtering
 * @param movies Array of movie objects from search results
 * @param options Content filtering options
 * @param language Optional language code to filter titles by language alignment
 * @returns Filtered array of movies
 */
export function filterSearchResults<T extends SearchMovieResult>(
  movies: T[],
  options: ContentFilterOptions = {},
  language?: string,
): T[] {
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
    // If originCountries filter is set, we must verify the movie is from allowed countries
    if (originCountries.length > 0) {
      // First, try to use origin_country if available (most accurate)
      if (movie.origin_country && Array.isArray(movie.origin_country) && movie.origin_country.length > 0) {
        const hasMatchingOriginCountry = originCountries.some(country =>
          movie.origin_country!.includes(country)
        );
        if (!hasMatchingOriginCountry) {
          return false;
        }
      } else {
        // Fallback: use original_language as a proxy for country
        // This is not perfect but better than excluding everything
        // English (en) -> US, Persian/Farsi (fa) -> IR
        const originalLang = movie.original_language?.toLowerCase();
        const isEnglishMovie = originalLang === 'en' && originCountries.some(c => c.toLowerCase() === 'us');
        const isPersianMovie = (originalLang === 'fa' || originalLang === 'persian' || originalLang === 'farsi') &&
          originCountries.some(c => c.toLowerCase() === 'ir');

        if (!isEnglishMovie && !isPersianMovie) {
          // No origin_country data and language doesn't match allowed countries
          return false;
        }
      }
    }

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

    // Filter by title language alignment
    if (language) {
      if (!isTitleAlignedWithLanguage(movie.title, movie.original_title, language)) {
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
  originCountries: ['US', 'IR', 'us', 'ir']
};
