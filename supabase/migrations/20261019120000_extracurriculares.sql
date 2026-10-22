-- ============================================================================
-- 20261019120000_extracurriculares.sql — Módulo de atividades extracurriculares.
--
-- Atividades, oportunidades, documentos (arquivos no Storage, bucket privado)
-- e a meta pessoal de horas. Tudo pertence ao aluno e é protegido por RLS com
-- auth.uid(), como as demais tabelas do aluno.
--
-- As categorias são um catálogo editável (tabela, não enum): administradores
-- podem incluir novas sem migration. Cada categoria aponta para um conjunto
-- de status ('padrao' ou 'publicacao') e para um modelo de campos específicos,
-- guardados em `detalhes` (jsonb).
--
-- Nenhuma tabela existente tem políticas alteradas aqui.
-- ============================================================================

-- ── Tipos ───────────────────────────────────────────────────────────────────

create type public.status_atividade as enum (
  -- conjunto 'padrao'
  'quero_participar', 'planejando', 'inscricao_aberta', 'inscricao_realizada',
  'em_andamento', 'aguardando_resultado', 'concluido',
  -- conjunto 'publicacao'
  'ideia', 'em_elaboracao', 'submetido', 'em_revisao', 'aceito', 'publicado',
  -- ambos
  'cancelado'
);

create type public.status_oportunidade as enum (
  'acompanhando', 'preparando', 'inscrito', 'aprovado', 'nao_aprovado', 'desistiu'
);

create type public.tipo_documento_extracurricular as enum (
  'certificado', 'declaracao', 'comprovante_inscricao', 'resumo', 'artigo', 'edital', 'outro'
);

-- ── Categorias (catálogo) ───────────────────────────────────────────────────

create table public.categorias_extracurriculares (
  id                text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  nome              text not null check (char_length(btrim(nome)) between 1 and 80),
  descricao         text check (char_length(descricao) <= 300),
  icone             text not null default 'folder' check (icone ~ '^[a-z0-9-]{1,40}$'),
  cor               text not null check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  -- Campos específicos exibidos no formulário (null = só os gerais).
  modelo_campos     text check (modelo_campos ~ '^[a-z_]{1,40}$'),
  conjunto_status   text not null default 'padrao' check (conjunto_status in ('padrao', 'publicacao')),
  -- Seção do portfólio onde as atividades concluídas aparecem.
  secao_portfolio   text not null default 'outras' check (secao_portfolio ~ '^[a-z_]{1,40}$'),
  ordem             integer not null default 0,
  ativa             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Oportunidades ───────────────────────────────────────────────────────────

create table public.oportunidades_extracurriculares (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id            text not null references public.categorias_extracurriculares (id),
  titulo                  text not null check (char_length(btrim(titulo)) between 1 and 200),
  instituicao             text check (char_length(instituicao) <= 200),
  link                    text check (char_length(link) <= 1000 and link ~* '^https?://'),
  data_abertura           date,
  data_encerramento       date,
  requisitos              text check (char_length(requisitos) <= 4000),
  documentos_necessarios  text check (char_length(documentos_necessarios) <= 4000),
  status_inscricao        public.status_oportunidade not null default 'acompanhando',
  observacoes             text check (char_length(observacoes) <= 4000),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (id, user_id),
  check (data_encerramento is null or data_abertura is null or data_encerramento >= data_abertura)
);

create index oportunidades_extra_user_idx on public.oportunidades_extracurriculares (user_id, data_encerramento);

-- ── Atividades ──────────────────────────────────────────────────────────────

create table public.atividades_extracurriculares (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id      text not null references public.categorias_extracurriculares (id),
  -- Oportunidade de origem. Única por aluno: converter de novo não duplica.
  oportunidade_id   uuid,
  titulo            text not null check (char_length(btrim(titulo)) between 1 and 200),
  instituicao       text check (char_length(instituicao) <= 200),
  descricao         text check (char_length(descricao) <= 4000),
  area_interesse    text check (char_length(area_interesse) <= 120),
  data_inicio       date,
  data_fim          date,
  -- Carga horária: prevista, realizada e a efetivamente aceita pela
  -- instituição (null = ainda não validada). Nunca presumimos aceitação.
  horas_previstas   numeric(7, 2) check (horas_previstas >= 0 and horas_previstas <= 10000),
  horas_realizadas  numeric(7, 2) not null default 0 check (horas_realizadas >= 0 and horas_realizadas <= 10000),
  horas_aceitas     numeric(7, 2) check (horas_aceitas >= 0 and horas_aceitas <= 10000),
  status            public.status_atividade not null default 'planejando',
  prioridade        public.prioridade_tarefa not null default 'media',
  link              text check (char_length(link) <= 1000 and link ~* '^https?://'),
  observacoes       text check (char_length(observacoes) <= 4000),
  tags              text[] not null default '{}' check (cardinality(tags) <= 20),
  detalhes          jsonb not null default '{}'::jsonb
                    check (jsonb_typeof(detalhes) = 'object' and octet_length(detalhes::text) <= 20000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, oportunidade_id),
  foreign key (oportunidade_id, user_id)
    references public.oportunidades_extracurriculares (id, user_id) on delete set null (oportunidade_id),
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create index atividades_extra_user_idx on public.atividades_extracurriculares (user_id, updated_at desc);
create index atividades_extra_categoria_idx on public.atividades_extracurriculares (user_id, categoria_id);

-- O status precisa pertencer ao conjunto da categoria ("Publicado" só vale
-- para publicações, "Inscrição realizada" não vale para artigos etc.).
-- Também valida as tags: até 20 (check da tabela), cada uma com 1 a 40 caracteres.
create or replace function privado.validar_atividade() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_conjunto text;
begin
  if exists (select 1 from unnest(new.tags) as t where char_length(btrim(t)) not between 1 and 40) then
    raise exception 'Tag inválida' using errcode = '23514';
  end if;

  select c.conjunto_status into v_conjunto
    from public.categorias_extracurriculares c where c.id = new.categoria_id;

  if v_conjunto = 'publicacao' then
    if new.status not in ('ideia', 'em_elaboracao', 'submetido', 'em_revisao', 'aceito', 'publicado', 'cancelado') then
      raise exception 'Status % não se aplica a esta categoria', new.status using errcode = '23514';
    end if;
  elsif new.status in ('ideia', 'em_elaboracao', 'submetido', 'em_revisao', 'aceito', 'publicado') then
    raise exception 'Status % não se aplica a esta categoria', new.status using errcode = '23514';
  end if;
  return new;
end $$;

create trigger atividades_extra_validacao before insert or update of status, categoria_id, tags
  on public.atividades_extracurriculares
  for each row execute function privado.validar_atividade();

-- ── Documentos (metadados; o arquivo fica no Storage) ───────────────────────
-- Caminho no bucket: <user_id>/<atividade_id>/<nome>. A primeira pasta é o
-- dono, e é ela que as políticas do Storage conferem.

create table public.documentos_extracurriculares (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  atividade_id  uuid not null,
  tipo          public.tipo_documento_extracurricular not null default 'certificado',
  nome_arquivo  text not null check (char_length(btrim(nome_arquivo)) between 1 and 200),
  caminho       text not null unique check (char_length(caminho) <= 500),
  tipo_mime     text not null check (tipo_mime in (
                  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  tamanho       bigint not null check (tamanho > 0 and tamanho <= 10485760),
  created_at    timestamptz not null default now(),
  foreign key (atividade_id, user_id)
    references public.atividades_extracurriculares (id, user_id) on delete cascade,
  check (split_part(caminho, '/', 1) = user_id::text and split_part(caminho, '/', 2) = atividade_id::text)
);

create index documentos_extra_atividade_idx on public.documentos_extracurriculares (atividade_id, created_at);
create index documentos_extra_user_idx on public.documentos_extracurriculares (user_id);

-- ── Meta pessoal de horas ───────────────────────────────────────────────────
-- A exigência institucional só existe se o aluno a cadastrar, com a fonte; e
-- só aparece como verificada se ele marcar que conferiu no regulamento.

create table public.metas_extracurriculares (
  user_id                  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  meta_horas               numeric(7, 2) check (meta_horas > 0 and meta_horas <= 10000),
  exigencia_horas          numeric(7, 2) check (exigencia_horas > 0 and exigencia_horas <= 10000),
  exigencia_fonte          text check (char_length(exigencia_fonte) <= 500),
  exigencia_verificada_em  date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (exigencia_horas is null or char_length(btrim(coalesce(exigencia_fonte, ''))) > 0),
  check (exigencia_verificada_em is null or exigencia_horas is not null)
);

-- ── updated_at e limites do plano ───────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'categorias_extracurriculares', 'oportunidades_extracurriculares',
    'atividades_extracurriculares', 'metas_extracurriculares'
  ]
  loop
    execute format(
      'create trigger %1$s_atualizado_em before update on public.%1$I
         for each row execute function privado.definir_atualizado_em()', t);
  end loop;

  foreach t in array array[
    'oportunidades_extracurriculares', 'atividades_extracurriculares', 'documentos_extracurriculares'
  ]
  loop
    execute format(
      'create trigger %1$s_limite_plano before insert on public.%1$I
         for each row execute function privado.verificar_limite_plano()', t);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.categorias_extracurriculares    enable row level security;
alter table public.oportunidades_extracurriculares enable row level security;
alter table public.atividades_extracurriculares    enable row level security;
alter table public.documentos_extracurriculares    enable row level security;
alter table public.metas_extracurriculares         enable row level security;

revoke all on table
  public.categorias_extracurriculares, public.oportunidades_extracurriculares,
  public.atividades_extracurriculares, public.documentos_extracurriculares,
  public.metas_extracurriculares
from anon, authenticated;

grant select, insert, update, delete on table
  public.categorias_extracurriculares, public.oportunidades_extracurriculares,
  public.atividades_extracurriculares, public.metas_extracurriculares
to authenticated;
-- Documento não é editado: troca-se excluindo e enviando de novo.
grant select, insert, delete on table public.documentos_extracurriculares to authenticated;

create policy categorias_extra_leitura on public.categorias_extracurriculares for select
  to authenticated using (ativa or (select public.eh_admin()));
create policy categorias_extra_admin_insere on public.categorias_extracurriculares for insert
  to authenticated with check ((select public.eh_admin()));
create policy categorias_extra_admin_edita on public.categorias_extracurriculares for update
  to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy categorias_extra_admin_exclui on public.categorias_extracurriculares for delete
  to authenticated using ((select public.eh_admin()));

do $$
declare t text;
begin
  foreach t in array array[
    'oportunidades_extracurriculares', 'atividades_extracurriculares', 'metas_extracurriculares'
  ]
  loop
    execute format($f$
      create policy %1$s_leitura on public.%1$I for select
        to authenticated using ((select auth.uid()) = user_id);
      create policy %1$s_insercao on public.%1$I for insert
        to authenticated with check ((select auth.uid()) = user_id);
      create policy %1$s_edicao on public.%1$I for update
        to authenticated using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id);
      create policy %1$s_exclusao on public.%1$I for delete
        to authenticated using ((select auth.uid()) = user_id);
    $f$, t);
  end loop;
end $$;

create policy documentos_extracurriculares_leitura on public.documentos_extracurriculares for select
  to authenticated using ((select auth.uid()) = user_id);
create policy documentos_extracurriculares_insercao on public.documentos_extracurriculares for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy documentos_extracurriculares_exclusao on public.documentos_extracurriculares for delete
  to authenticated using ((select auth.uid()) = user_id);

-- ── Storage: bucket privado e acesso só à própria pasta ─────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-extracurriculares', 'documentos-extracurriculares', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy documentos_extra_storage_leitura on storage.objects for select
  to authenticated using (
    bucket_id = 'documentos-extracurriculares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy documentos_extra_storage_envio on storage.objects for insert
  to authenticated with check (
    bucket_id = 'documentos-extracurriculares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy documentos_extra_storage_exclusao on storage.objects for delete
  to authenticated using (
    bucket_id = 'documentos-extracurriculares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── Converter oportunidade em atividade ─────────────────────────────────────
-- Copia os dados relevantes e liga a atividade à oportunidade. Se ela já foi
-- convertida, devolve a atividade existente em vez de criar outra.
-- `security invoker`: só enxerga e grava o que o RLS permite a quem chama.

create or replace function public.converter_oportunidade(p_oportunidade uuid)
returns setof public.atividades_extracurriculares
language plpgsql security invoker set search_path = '' as $$
declare
  v_user  uuid := (select auth.uid());
  v_op    public.oportunidades_extracurriculares;
  v_conj  text;
  v_status public.status_atividade;
  v_obs   text;
begin
  if v_user is null then
    raise exception 'Sessão expirada' using errcode = '42501';
  end if;

  select * into v_op from public.oportunidades_extracurriculares
   where id = p_oportunidade and user_id = v_user;
  if not found then
    raise exception 'Oportunidade não encontrada' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.atividades_extracurriculares
              where user_id = v_user and oportunidade_id = p_oportunidade) then
    return query select a.* from public.atividades_extracurriculares a
                  where a.user_id = v_user and a.oportunidade_id = p_oportunidade;
    return;
  end if;

  select c.conjunto_status into v_conj from public.categorias_extracurriculares c where c.id = v_op.categoria_id;

  v_status := case
    when v_conj = 'publicacao' then
      case when v_op.status_inscricao in ('nao_aprovado', 'desistiu') then 'cancelado' else 'em_elaboracao' end
    when v_op.status_inscricao = 'inscrito' then 'aguardando_resultado'
    when v_op.status_inscricao = 'aprovado' then 'em_andamento'
    when v_op.status_inscricao in ('nao_aprovado', 'desistiu') then 'cancelado'
    when v_op.data_encerramento is not null and v_op.data_encerramento >= current_date
         and (v_op.data_abertura is null or v_op.data_abertura <= current_date) then 'inscricao_aberta'
    else 'quero_participar'
  end::public.status_atividade;

  v_obs := nullif(concat_ws(e'\n\n',
    case when v_op.requisitos is not null then 'Requisitos: ' || v_op.requisitos end,
    case when v_op.documentos_necessarios is not null then 'Documentos necessários: ' || v_op.documentos_necessarios end,
    v_op.observacoes), '');

  return query
    with nova as (
    insert into public.atividades_extracurriculares (
      user_id, categoria_id, oportunidade_id, titulo, instituicao, link, status, observacoes, detalhes
    )
    values (
      v_user, v_op.categoria_id, v_op.id, v_op.titulo, v_op.instituicao, v_op.link, v_status,
      left(v_obs, 4000),
      jsonb_strip_nulls(jsonb_build_object('prazo_inscricao', v_op.data_encerramento))
    )
    returning *
    )
    select * from nova;
end $$;

revoke execute on function privado.validar_atividade() from public, anon, authenticated;
revoke execute on function public.converter_oportunidade(uuid) from public, anon;
grant execute on function public.converter_oportunidade(uuid) to authenticated;

-- ── Catálogo inicial de categorias ──────────────────────────────────────────

insert into public.categorias_extracurriculares
  (id, nome, icone, cor, modelo_campos, conjunto_status, secao_portfolio, ordem)
values
  ('extensao',          'Projetos de extensão',                         'hand-heart',       '#0F766E', 'extensao',     'padrao',     'extensao',     1),
  ('liga',              'Ligas acadêmicas',                             'users',            '#8C1D40', 'liga',         'padrao',     'ligas',        2),
  ('congresso',         'Congressos e eventos científicos',             'presentation',     '#2F5D8A', 'evento',       'padrao',     'congressos',   3),
  ('curso',             'Cursos e workshops',                           'book-open',        '#6B4E9B', 'evento',       'padrao',     'outras',       4),
  ('publicacao',        'Artigos científicos e publicações',            'file-text',        '#B4234F', 'publicacao',   'publicacao', 'publicacoes',  5),
  ('pesquisa',          'Projetos de pesquisa',                         'flask-conical',    '#0E7490', 'pesquisa',     'padrao',     'pesquisa',     6),
  ('iniciacao',         'Iniciação científica',                         'microscope',       '#5B7B2A', 'pesquisa',     'padrao',     'pesquisa',     7),
  ('monitoria',         'Monitorias',                                   'graduation-cap',   '#B45309', 'monitoria',    'padrao',     'monitorias',   8),
  ('voluntariado',      'Voluntariado',                                 'heart-handshake',  '#C2410C', 'voluntariado', 'padrao',     'voluntariado', 9),
  ('estagio',           'Estágios e observerships',                     'stethoscope',      '#475569', 'estagio',      'padrao',     'outras',       10),
  ('intercambio',       'Intercâmbios acadêmicos',                      'plane',            '#A3367D', 'intercambio',  'padrao',     'intercambios', 11),
  ('representacao',     'Organizações estudantis e representações',     'landmark',         '#78716C', 'extensao',     'padrao',     'outras',       12),
  ('competicao',        'Hackathons, competições e inovação',           'trophy',           '#B45309', 'evento',       'padrao',     'outras',       13),
  ('apresentacao',      'Apresentações de trabalhos científicos',       'megaphone',        '#2F5D8A', 'apresentacao', 'padrao',     'congressos',   14),
  ('outra',             'Outras atividades',                            'folder',           '#78716C', null,           'padrao',     'outras',       15)
on conflict (id) do nothing;

-- Plano gratuito: até 100 documentos (10 MB cada). Atividades e oportunidades
-- sem limite. Ajustável em public.planos.limites.
update public.planos
   set limites = limites || '{"documentos_extracurriculares": 100}'::jsonb
 where id = 'gratuito' and not (limites ? 'documentos_extracurriculares');
