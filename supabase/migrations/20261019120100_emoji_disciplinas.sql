-- ============================================================================
-- 20261019120100_emoji_disciplinas.sql — Emoji opcional para cada disciplina.
--
-- Aparece no lugar da letra inicial no cartão e no cabeçalho da disciplina.
-- As políticas RLS de `disciplinas` já cobrem a coluna nova.
-- ============================================================================

alter table public.disciplinas
  add column emoji text
  check (emoji is null or (char_length(emoji) between 1 and 16 and emoji !~ '[[:alnum:][:space:]<>&"'']'));
