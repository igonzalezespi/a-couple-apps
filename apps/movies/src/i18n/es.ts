import { type MoviesTranslationKey } from './en';

// Typed as Record<MoviesTranslationKey, string> so a missing or extra key fails typecheck.
export const es: Record<MoviesTranslationKey, string> = {
  search: 'Buscar',
  searchPlaceholder: 'Buscar películas',
  searchPrompt: 'Busca una película.',
  noResults: 'Sin resultados.',
  searchError: 'Algo salió mal. Inténtalo de nuevo.',
  watchlist: 'Lista',
  watched: 'Vista',
  markWatched: 'Marcar vista',
  watchlistEmpty: 'Aún no hay nada. Añade una película para ver juntos.',
  added: 'En la lista',
  alreadyOnWatchlist: 'Ya está en tu lista.',
  poster: 'Póster de {{title}}',
  toWatch: 'Por ver',
  addedByYou: 'Añadida por ti',
  addedByPartner: 'Añadida por tu pareja',
  addedByName: 'Añadida por {{name}}',
  addFirstMovie: 'Buscar una película',
  pickForTonight: 'Elegir para esta noche',
  tonightsPick: 'Elección de esta noche',
  clearPick: 'Quitar elección',
  pickedByYou: 'Elegida por ti',
  pickedByName: 'Elegida por {{name}}'
};
