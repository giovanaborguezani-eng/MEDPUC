-- ============================================================================
-- extracurriculares.test.sql — Isolamento e regras do módulo extracurricular.
--
-- Mesmo método de rls.test.sql: troca o papel para `authenticated`/`anon` e
-- preenche request.jwt.claims, como o PostgREST e o Storage fazem.
-- Rodar com: npx supabase test db
-- ============================================================================

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(48);

create function pg_temp.entrar_como(p_user uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.sair() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

create function pg_temp.afetadas(p_sql text) returns integer language plpgsql as $$
declare n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@teste.dev', '{"nome": "Ana"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bruno@teste.dev', '{"nome": "Bruno"}', 'authenticated', 'authenticated');

-- ── Estrutura ───────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'todas as tabelas de public continuam com RLS habilitado');
select is((select public from storage.buckets where id = 'documentos-extracurriculares'), false, 'bucket de documentos é privado');
select is((select file_size_limit from storage.buckets where id = 'documentos-extracurriculares'), 10485760::bigint, 'bucket limita arquivos a 10 MB');
select is((select count(*)::int from categorias_extracurriculares), 15, 'catálogo traz as 15 categorias');

-- ── Ana cadastra seus dados ─────────────────────────────────────────────────

select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');

select is((select count(*)::int from categorias_extracurriculares), 15, 'aluno lê o catálogo de categorias');

insert into atividades_extracurriculares (id, categoria_id, titulo, status, horas_realizadas, tags)
values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'liga', 'Liga de Cardiologia', 'em_andamento', 20, '{cardio}');
insert into oportunidades_extracurriculares (id, categoria_id, titulo, data_encerramento, status_inscricao, requisitos)
values ('aaaaaaaa-0000-0000-0000-0000000000b1', 'congresso', 'Congresso de Neurologia', current_date + 10, 'acompanhando', 'Estar no 3º período');
insert into documentos_extracurriculares (id, atividade_id, tipo, nome_arquivo, caminho, tipo_mime, tamanho)
values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'certificado', 'certificado.pdf',
        '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-0000000000a1/x-certificado.pdf', 'application/pdf', 1000);
insert into metas_extracurriculares (meta_horas) values (200);

select is((select user_id from atividades_extracurriculares where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'user_id da atividade preenchido com auth.uid()');

-- Status precisa combinar com a categoria.
select throws_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, status) values ('publicacao', 'Artigo', 'inscricao_realizada') $$,
  '23514', null, 'publicação não aceita status de inscrição');
select throws_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, status) values ('liga', 'Liga', 'publicado') $$,
  '23514', null, 'liga não aceita status "Publicado"');
select lives_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, status) values ('publicacao', 'Artigo sobre AVC', 'submetido') $$,
  'publicação aceita "Submetido"');
select throws_ok(
  $$ update atividades_extracurriculares set categoria_id = 'publicacao' where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'trocar a categoria revalida o status');
select throws_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, tags) values ('liga', 'X', array['']) $$,
  '23514', null, 'tag vazia é recusada');
select throws_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, horas_realizadas) values ('liga', 'X', -1) $$,
  '23514', null, 'horas negativas são recusadas');
select throws_ok(
  $$ insert into atividades_extracurriculares (categoria_id, titulo, data_inicio, data_fim) values ('liga', 'X', '2026-05-01', '2026-04-01') $$,
  '23514', null, 'término antes do início é recusado');
select throws_ok(
  $$ insert into metas_extracurriculares (user_id, exigencia_horas) values ('11111111-1111-1111-1111-111111111111', 100)
     on conflict (user_id) do update set exigencia_horas = 100, exigencia_fonte = null $$,
  '23514', null, 'exigência institucional sem fonte é recusada');

-- Converter oportunidade não duplica.
select is(
  (select oportunidade_id from converter_oportunidade('aaaaaaaa-0000-0000-0000-0000000000b1')),
  'aaaaaaaa-0000-0000-0000-0000000000b1'::uuid, 'oportunidade convertida em atividade vinculada');
select is(
  (select count(*)::int from converter_oportunidade('aaaaaaaa-0000-0000-0000-0000000000b1')), 1,
  'converter de novo devolve a mesma atividade');
select is(
  (select count(*)::int from atividades_extracurriculares where oportunidade_id = 'aaaaaaaa-0000-0000-0000-0000000000b1'), 1,
  'só existe uma atividade para a oportunidade');
select is(
  (select status::text from atividades_extracurriculares where oportunidade_id = 'aaaaaaaa-0000-0000-0000-0000000000b1'),
  'inscricao_aberta', 'status inicial reflete inscrições abertas');
select ok(
  (select observacoes like 'Requisitos: Estar no 3º período%' from atividades_extracurriculares
    where oportunidade_id = 'aaaaaaaa-0000-0000-0000-0000000000b1'),
  'requisitos da oportunidade preservados na atividade');

-- Storage: Ana envia para a própria pasta.
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documentos-extracurriculares', '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-0000000000a1/x-certificado.pdf') $$,
  'Ana envia arquivo para a própria pasta');

-- ── Bruno não enxerga nem altera nada da Ana ────────────────────────────────

select pg_temp.entrar_como('22222222-2222-2222-2222-222222222222');

select is((select count(*)::int from atividades_extracurriculares), 0, 'Bruno não lê atividades da Ana');
select is((select count(*)::int from oportunidades_extracurriculares), 0, 'Bruno não lê oportunidades da Ana');
select is((select count(*)::int from documentos_extracurriculares), 0, 'Bruno não lê documentos da Ana');
select is((select count(*)::int from metas_extracurriculares), 0, 'Bruno não lê a meta da Ana');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'documentos-extracurriculares'), 0,
  'Bruno não lista arquivos da Ana no Storage');

select is(pg_temp.afetadas($$ update atividades_extracurriculares set titulo = 'invadido' $$), 0, 'Bruno não altera atividades da Ana');
select is(pg_temp.afetadas($$ update oportunidades_extracurriculares set titulo = 'invadido' $$), 0, 'Bruno não altera oportunidades da Ana');
select is(pg_temp.afetadas($$ update metas_extracurriculares set meta_horas = 1 $$), 0, 'Bruno não altera a meta da Ana');
select is(pg_temp.afetadas($$ delete from atividades_extracurriculares $$), 0, 'Bruno não exclui atividades da Ana');
select is(pg_temp.afetadas($$ delete from oportunidades_extracurriculares $$), 0, 'Bruno não exclui oportunidades da Ana');
select is(pg_temp.afetadas($$ delete from documentos_extracurriculares $$), 0, 'Bruno não exclui documentos da Ana');

select throws_ok(
  $$ insert into atividades_extracurriculares (user_id, categoria_id, titulo) values ('11111111-1111-1111-1111-111111111111', 'liga', 'plantada') $$,
  '42501', null, 'Bruno não grava atividade em nome da Ana');
select throws_ok(
  $$ insert into documentos_extracurriculares (atividade_id, nome_arquivo, caminho, tipo_mime, tamanho)
     values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'x.pdf',
             '22222222-2222-2222-2222-222222222222/aaaaaaaa-0000-0000-0000-0000000000a1/x.pdf', 'application/pdf', 10) $$,
  '23503', null, 'Bruno não anexa documento à atividade da Ana');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documentos-extracurriculares', '11111111-1111-1111-1111-111111111111/plantado.pdf') $$,
  '42501', null, 'Bruno não envia arquivo para a pasta da Ana');
select throws_ok(
  $$ select converter_oportunidade('aaaaaaaa-0000-0000-0000-0000000000b1') $$,
  'P0002', null, 'Bruno não converte oportunidade da Ana');
select throws_ok(
  $$ insert into categorias_extracurriculares (id, nome, cor) values ('invasao', 'Invasão', '#000000') $$,
  '42501', null, 'aluno não cria categorias');

-- Bruno cria os próprios registros normalmente.
insert into atividades_extracurriculares (id, categoria_id, titulo)
values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'voluntariado', 'Voluntariado no hospital');
select throws_ok(
  $$ insert into documentos_extracurriculares (atividade_id, nome_arquivo, caminho, tipo_mime, tamanho)
     values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'x.pdf',
             '11111111-1111-1111-1111-111111111111/bbbbbbbb-0000-0000-0000-0000000000a1/x.pdf', 'application/pdf', 10) $$,
  '23514', null, 'documento precisa apontar para a pasta do próprio dono');
select throws_ok(
  $$ insert into documentos_extracurriculares (atividade_id, nome_arquivo, caminho, tipo_mime, tamanho)
     values ('bbbbbbbb-0000-0000-0000-0000000000a1', 'x.html',
             '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-0000000000a1/x.html', 'text/html', 10) $$,
  '23514', null, 'tipo de arquivo não permitido é recusado');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('documentos-extracurriculares', '22222222-2222-2222-2222-222222222222/bbbbbbbb-0000-0000-0000-0000000000a1/x.pdf') $$,
  'Bruno envia arquivo para a própria pasta');
select is((select count(*)::int from storage.objects where bucket_id = 'documentos-extracurriculares'), 1, 'Bruno vê só o próprio arquivo');

-- ── Visitante sem login ─────────────────────────────────────────────────────

select pg_temp.sair();
select set_config('role', 'anon', true);
select throws_ok($$ select count(*) from atividades_extracurriculares $$, '42501', null, 'visitante não lê atividades');
select throws_ok($$ select count(*) from categorias_extracurriculares $$, '42501', null, 'visitante não lê o catálogo de categorias');
select is((select count(*)::int from storage.objects where bucket_id = 'documentos-extracurriculares'), 0, 'visitante não lista arquivos');

-- ── Dados da Ana intactos e limite do plano ─────────────────────────────────

select pg_temp.sair();
select is((select titulo from atividades_extracurriculares where id = 'aaaaaaaa-0000-0000-0000-0000000000a1'), 'Liga de Cardiologia', 'atividade da Ana intacta');
select is((select count(*)::int from documentos_extracurriculares where user_id = '11111111-1111-1111-1111-111111111111'), 1, 'documento da Ana intacto');

update planos set limites = limites || '{"documentos_extracurriculares": 1}' where id = 'gratuito';
select pg_temp.entrar_como('11111111-1111-1111-1111-111111111111');
select throws_ok(
  $$ insert into documentos_extracurriculares (atividade_id, nome_arquivo, caminho, tipo_mime, tamanho)
     values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'y.pdf',
             '11111111-1111-1111-1111-111111111111/aaaaaaaa-0000-0000-0000-0000000000a1/y.pdf', 'application/pdf', 10) $$,
  'MP001', null, 'limite de documentos do plano é aplicado no banco');

-- Excluir a atividade remove os documentos em cascata.
select is(pg_temp.afetadas($$ delete from atividades_extracurriculares where id = 'aaaaaaaa-0000-0000-0000-0000000000a1' $$), 1, 'Ana exclui a própria atividade');
select is((select count(*)::int from documentos_extracurriculares), 0, 'documentos da atividade saem em cascata');

select * from finish();
rollback;
