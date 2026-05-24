import { type TranslationKey } from './en';

// Typed as Record<TranslationKey, string> so a missing or extra key fails typecheck.
export const es: Record<TranslationKey, string> = {
  appName: 'A Couple Apps',
  language: 'Idioma',
  english: 'Inglés',
  spanish: 'Español',
  movies: 'Películas',
  plans: 'Planes',
  add: 'Añadir',
  cancel: 'Cancelar',
  save: 'Guardar',
  remove: 'Quitar'
};
