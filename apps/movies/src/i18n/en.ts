export const en = {
  search: 'Search',
  searchPlaceholder: 'Search movies',
  searchPrompt: 'Search for a movie.',
  noResults: 'No results.',
  searchError: 'Something went wrong. Try again.',
  watchlist: 'Watchlist',
  watched: 'Watched',
  markWatched: 'Mark watched',
  watchlistEmpty: "Nothing here yet. Add a movie you'd like to watch together.",
  added: 'Added',
  alreadyOnWatchlist: 'Already on your watchlist.',
  poster: '{{title}} poster',
  toWatch: 'To watch',
  addedByYou: 'Added by you',
  addedByPartner: 'Added by your partner',
  addedByName: 'Added by {{name}}',
  addFirstMovie: 'Search for a movie',
  pickForTonight: 'Pick for tonight',
  tonightsPick: "Tonight's pick",
  clearPick: 'Clear pick',
  pickedByYou: 'Chosen by you',
  pickedByName: 'Chosen by {{name}}'
} as const;

/** The movies-namespace translation keys every locale must provide. */
export type MoviesTranslationKey = keyof typeof en;
