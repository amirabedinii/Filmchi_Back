// Genre translations for languages not supported by TMDB
export const GENRE_TRANSLATIONS = {
  fa: {
    28: 'اکشن',
    12: 'ماجراجویی',
    16: 'انیمیشن',
    35: 'کمدی',
    80: 'جنایی',
    99: 'مستند',
    18: 'درام',
    10751: 'خانوادگی',
    14: 'فانتزی',
    36: 'تاریخی',
    27: 'ترسناک',
    10402: 'موزیک',
    9648: 'معمایی',
    10749: 'عاشقانه',
    878: 'علمی-تخیلی',
    10770: 'فیلم تلویزیونی',
    53: 'هیجان‌انگیز',
    10752: 'جنگی',
    37: 'وسترن',
  },
} as const;

export type SupportedLanguage = keyof typeof GENRE_TRANSLATIONS;

export function getGenreTranslation(
  genreId: number,
  language: string,
): string | null {
  const lang = language as SupportedLanguage;
  if (!GENRE_TRANSLATIONS[lang]) {
    return null;
  }
  return GENRE_TRANSLATIONS[lang][genreId] || null;
}

export function hasGenreTranslations(language: string): boolean {
  return language in GENRE_TRANSLATIONS;
}
