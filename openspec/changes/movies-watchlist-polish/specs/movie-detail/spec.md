## ADDED Requirements

### Requirement: Movie detail view

The app SHALL provide a detail screen at `/movie/[id]` showing the movie's title, year, rating, poster, and overview from TMDB in the configured language. It SHALL be reachable from both search results and watchlist items.

#### Scenario: Open from a result or row

- **GIVEN** a search result or a watchlist item
- **WHEN** the user opens it
- **THEN** the detail screen SHALL show the title, year, rating, and overview
- **AND** a back action SHALL return to the previous screen

#### Scenario: Localized details

- **GIVEN** the configured language is Spanish
- **WHEN** the detail screen loads a movie
- **THEN** the TMDB details request SHALL use the resolved external language
