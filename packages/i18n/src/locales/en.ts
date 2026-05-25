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
  signIn: 'Sign in',
  signInPrompt: 'Enter your email to get a sign-in code.',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Send code',
  codePrompt: 'Enter the code we sent to {{email}}.',
  code: 'Code',
  codePlaceholder: '123456',
  verify: 'Verify',
  back: 'Back',
  signOut: 'Sign out',
  loading: 'Loading...',
  search: 'Search',
  searchPlaceholder: 'Search movies',
  searchPrompt: 'Search for a movie.',
  noResults: 'No results.',
  searchError: 'Something went wrong. Try again.'
} as const;

/** The translation keys every locale must provide. */
export type TranslationKey = keyof typeof en;
