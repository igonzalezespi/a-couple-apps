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
  remove: 'Remove',
  back: 'Back',
  loading: 'Loading...',
  whoAreYou: 'Who is using this?',
  switchPerson: 'Switch person',
  youArePerson: 'You are {{name}}'
} as const;

/** The common (shared/shell) translation keys every locale must provide. */
export type CommonTranslationKey = keyof typeof en;
