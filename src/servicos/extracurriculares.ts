import { supabase } from '../lib/supabase';
import type {
  Atividade,
  CategoriaExtra,
  DadosAtividade,
  DadosMetaExtra,
  DadosOportunidade,
  MetaExtra,
  Oportunidade,
} from '../tipos/dominio';
import { ouNulo, resolver } from './base';
import { removerArquivos } from './documentos';

// ── Categorias ──────────────────────────────────────────────────────────────

export async function listarCategoriasExtra(): Promise<CategoriaExtra[]> {
  return resolver(supabase().from('categorias_extracurriculares').select('*').order('ordem').order('nome'));
}

// ── Atividades ──────────────────────────────────────────────────────────────

function normalizarAtividade(dados: Partial<DadosAtividade>) {
  return {
    ...dados,
    ...(dados.titulo !== undefined && { titulo: dados.titulo.trim() }),
    ...(dados.instituicao !== undefined && { instituicao: ouNulo(dados.instituicao?.trim()) }),
    ...(dados.descricao !== undefined && { descricao: ouNulo(dados.descricao?.trim()) }),
    ...(dados.area_interesse !== undefined && { area_interesse: ouNulo(dados.area_interesse?.trim()) }),
    ...(dados.data_inicio !== undefined && { data_inicio: ouNulo(dados.data_inicio) }),
    ...(dados.data_fim !== undefined && { data_fim: ouNulo(dados.data_fim) }),
    ...(dados.link !== undefined && { link: ouNulo(dados.link?.trim()) }),
    ...(dados.observacoes !== undefined && { observacoes: ouNulo(dados.observacoes?.trim()) }),
  };
}

export async function listarAtividades(): Promise<Atividade[]> {
  return resolver(supabase().from('atividades_extracurriculares').select('*').order('updated_at', { ascending: false }));
}

export async function criarAtividade(dados: DadosAtividade): Promise<Atividade> {
  return resolver(
    supabase()
      .from('atividades_extracurriculares')
      .insert({ ...normalizarAtividade(dados), titulo: dados.titulo.trim(), categoria_id: dados.categoria_id })
      .select('*')
      .single(),
  );
}

export async function atualizarAtividade(id: string, dados: Partial<DadosAtividade>): Promise<Atividade> {
  return resolver(supabase().from('atividades_extracurriculares').update(normalizarAtividade(dados)).eq('id', id).select('*').single());
}

/**
 * Exclui a atividade e os arquivos dela. O banco não apaga objetos do
 * Storage, então os arquivos saem primeiro; os registros de documentos saem
 * em cascata com a atividade. Se algo falhar no meio, repetir a exclusão
 * termina o trabalho (remover um arquivo que já não existe não é erro).
 */
export async function excluirAtividade(id: string): Promise<void> {
  const documentos = await resolver(
    supabase().from('documentos_extracurriculares').select('caminho').eq('atividade_id', id),
  );
  await removerArquivos(documentos.map((d) => d.caminho));
  await resolver(supabase().from('atividades_extracurriculares').delete().eq('id', id));
}

// ── Oportunidades ───────────────────────────────────────────────────────────

function normalizarOportunidade(dados: Partial<DadosOportunidade>) {
  return {
    ...dados,
    ...(dados.titulo !== undefined && { titulo: dados.titulo.trim() }),
    ...(dados.instituicao !== undefined && { instituicao: ouNulo(dados.instituicao?.trim()) }),
    ...(dados.link !== undefined && { link: ouNulo(dados.link?.trim()) }),
    ...(dados.data_abertura !== undefined && { data_abertura: ouNulo(dados.data_abertura) }),
    ...(dados.data_encerramento !== undefined && { data_encerramento: ouNulo(dados.data_encerramento) }),
    ...(dados.requisitos !== undefined && { requisitos: ouNulo(dados.requisitos?.trim()) }),
    ...(dados.documentos_necessarios !== undefined && { documentos_necessarios: ouNulo(dados.documentos_necessarios?.trim()) }),
    ...(dados.observacoes !== undefined && { observacoes: ouNulo(dados.observacoes?.trim()) }),
  };
}

export async function listarOportunidades(): Promise<Oportunidade[]> {
  return resolver(
    supabase()
      .from('oportunidades_extracurriculares')
      .select('*')
      .order('data_encerramento', { nullsFirst: false })
      .order('created_at', { ascending: false }),
  );
}

export async function criarOportunidade(dados: DadosOportunidade): Promise<Oportunidade> {
  return resolver(
    supabase()
      .from('oportunidades_extracurriculares')
      .insert({ ...normalizarOportunidade(dados), titulo: dados.titulo.trim(), categoria_id: dados.categoria_id })
      .select('*')
      .single(),
  );
}

export async function atualizarOportunidade(id: string, dados: Partial<DadosOportunidade>): Promise<Oportunidade> {
  return resolver(supabase().from('oportunidades_extracurriculares').update(normalizarOportunidade(dados)).eq('id', id).select('*').single());
}

export async function excluirOportunidade(id: string): Promise<void> {
  await resolver(supabase().from('oportunidades_extracurriculares').delete().eq('id', id));
}

/** Cria (ou devolve, se já existir) a atividade acompanhada a partir da oportunidade. */
export async function converterOportunidade(id: string): Promise<Atividade> {
  const atividades = await resolver(supabase().rpc('converter_oportunidade', { p_oportunidade: id }));
  return atividades[0];
}

// ── Meta de horas ───────────────────────────────────────────────────────────

export async function obterMetaExtra(): Promise<MetaExtra | null> {
  return resolver(supabase().from('metas_extracurriculares').select('*').maybeSingle());
}

export async function salvarMetaExtra(dados: DadosMetaExtra): Promise<MetaExtra> {
  return resolver(
    supabase()
      .from('metas_extracurriculares')
      .upsert({ ...dados, exigencia_fonte: ouNulo(dados.exigencia_fonte?.trim()) }, { onConflict: 'user_id' })
      .select('*')
      .single(),
  );
}
