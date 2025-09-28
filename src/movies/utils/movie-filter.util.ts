/**
 * Utility functions for filtering movie data
 */

export interface MovieWithPoster {
  poster_path?: string | null;
  [key: string]: any;
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
