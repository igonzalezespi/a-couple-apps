-- Shared schema: cross-app data for the couple. There is no auth -- identity is a local
-- person choice (see couple.config), and a build's anon key is the boundary -- so this schema
-- has no tables yet and no `profiles`. Per-app schemas (movies, plans) are added by their own
-- app changes; a future shared table grants `anon` and joins the realtime publication then.

create schema if not exists shared;
