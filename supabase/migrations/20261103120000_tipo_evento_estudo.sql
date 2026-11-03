-- ============================================================================
-- 20261103120000_tipo_evento_estudo.sql — Tipo de evento "Estudo".
--
-- Para blocos de estudo no calendário. Não conta como avaliação (não entra
-- na aba "Avaliações e datas" nem na contagem da próxima prova).
-- ============================================================================

alter type public.tipo_evento add value if not exists 'estudo' after 'revisao';
