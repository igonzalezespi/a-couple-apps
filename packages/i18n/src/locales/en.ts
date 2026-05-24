export const en = {
  appName: 'A Couple Apps',
  language: 'Language',
  english: 'English',
  spanish: 'Spanish',
  movies: 'Movies',
  plans: 'Plans',
  add: 'Add',
  cancel: 'Cancel',
  save: 'Save',
  remove: 'Remove'
} as const;

/** The translation keys every locale must provide. */
export type TranslationKey = keyof typeof en;
