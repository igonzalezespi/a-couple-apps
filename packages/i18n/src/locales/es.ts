import { type CommonTranslationKey } from './en';

// Typed as Record<CommonTranslationKey, string> so a missing or extra key fails typecheck.
export const es: Record<CommonTranslationKey, string> = {
  appName: 'A Couple Apps',
  language: 'Idioma',
  english: 'Inglés',
  spanish: 'Español',
  movies: 'Películas',
  plans: 'Planes',
  add: 'Añadir',
  cancel: 'Cancelar',
  save: 'Guardar',
  remove: 'Quitar',
  back: 'Atrás',
  loading: 'Cargando...',
  whoAreYou: '¿Quién está usando esto?',
  switchPerson: 'Cambiar de persona',
  youArePerson: 'Eres {{name}}'
};
