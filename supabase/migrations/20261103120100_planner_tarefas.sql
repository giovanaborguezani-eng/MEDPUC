-- ============================================================================
-- 20261103120100_planner_tarefas.sql — Dia planejado das tarefas (planner).
--
-- `planejada_para` é o dia em que o aluno pretende fazer a tarefa; `prazo`
-- continua sendo a data-limite. Mover a tarefa no planner não muda o prazo.
-- As políticas RLS de `tarefas` já cobrem a coluna nova.
-- ============================================================================

alter table public.tarefas add column planejada_para date;

create index tarefas_planner_idx on public.tarefas (user_id, planejada_para)
  where planejada_para is not null;
