-- ============================================================================
-- 20261103120200_ordem_planner.sql — Ordem das tarefas dentro do dia (planner).
--
-- `ordem_planner` guarda a posição escolhida pelo aluno no dia planejado.
-- `planejar_tarefas` grava o dia e a ordem de várias tarefas de uma vez
-- (arrastar dentro do dia ou para outro dia). É `security invoker`: só
-- altera tarefas do próprio aluno, como o RLS já exige.
-- ============================================================================

alter table public.tarefas
  add column ordem_planner integer check (ordem_planner >= 0);

create or replace function public.planejar_tarefas(p_dia date, p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.tarefas t
     set planejada_para = p_dia,
         ordem_planner = (x.posicao - 1)::integer
    from unnest(p_ids) with ordinality as x(id, posicao)
   where t.id = x.id
     and t.user_id = (select auth.uid());
$$;

revoke execute on function public.planejar_tarefas(date, uuid[]) from public, anon;
grant execute on function public.planejar_tarefas(date, uuid[]) to authenticated;
