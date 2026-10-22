import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUsuario } from '../contextos/Autenticacao';
import { enviarDocumento, excluirDocumento, listarDocumentos } from '../servicos/documentos';
import {
  atualizarAtividade,
  atualizarOportunidade,
  converterOportunidade,
  criarAtividade,
  criarOportunidade,
  excluirAtividade,
  excluirOportunidade,
  listarAtividades,
  listarCategoriasExtra,
  listarOportunidades,
  obterMetaExtra,
  salvarMetaExtra,
} from '../servicos/extracurriculares';
import type {
  Atividade,
  CategoriaExtra,
  DadosAtividade,
  DadosMetaExtra,
  DadosOportunidade,
  DocumentoAtividade,
  StatusAtividade,
  TipoDocumento,
} from '../tipos/dominio';
import { chaves } from './chaves';

// ── Leitura ─────────────────────────────────────────────────────────────────

export function useCategoriasExtra() {
  return useQuery({ queryKey: chaves.categoriasExtra, queryFn: listarCategoriasExtra, staleTime: 10 * 60_000 });
}

export function useMapaCategoriasExtra(): Map<string, CategoriaExtra> {
  const { data } = useCategoriasExtra();
  return useMemo(() => new Map((data ?? []).map((c) => [c.id, c])), [data]);
}

export function useAtividades() {
  return useQuery({ queryKey: chaves.atividadesExtra, queryFn: listarAtividades });
}

export function useOportunidades() {
  return useQuery({ queryKey: chaves.oportunidadesExtra, queryFn: listarOportunidades });
}

export function useDocumentosExtra() {
  return useQuery({ queryKey: chaves.documentosExtra, queryFn: listarDocumentos });
}

export function useMetaExtra() {
  return useQuery({ queryKey: chaves.metaExtra, queryFn: obterMetaExtra });
}

// ── Atividades ──────────────────────────────────────────────────────────────

export function useSalvarAtividade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosAtividade }) => (id ? atualizarAtividade(id, dados) : criarAtividade(dados)),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.atividadesExtra });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

/** Troca de status com atualização otimista (cartão e página de detalhes). */
export function useAtualizarStatusAtividade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAtividade }) => atualizarAtividade(id, { status }),
    onMutate: async ({ id, status }) => {
      await cliente.cancelQueries({ queryKey: chaves.atividadesExtra });
      const anterior = cliente.getQueryData<Atividade[]>(chaves.atividadesExtra);
      cliente.setQueryData<Atividade[]>(chaves.atividadesExtra, (lista) => lista?.map((a) => (a.id === id ? { ...a, status } : a)));
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.atividadesExtra, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.atividadesExtra }),
  });
}

export function useExcluirAtividade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirAtividade(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['extra'] });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

// ── Oportunidades ───────────────────────────────────────────────────────────

export function useSalvarOportunidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosOportunidade }) =>
      id ? atualizarOportunidade(id, dados) : criarOportunidade(dados),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.oportunidadesExtra });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useExcluirOportunidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirOportunidade(id),
    onSuccess: () => {
      // A atividade convertida perde o vínculo (on delete set null).
      cliente.invalidateQueries({ queryKey: ['extra'] });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useConverterOportunidade() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => converterOportunidade(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.atividadesExtra });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

// ── Documentos ──────────────────────────────────────────────────────────────

export function useEnviarDocumento() {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ atividadeId, tipo, arquivo }: { atividadeId: string; tipo: TipoDocumento; arquivo: File }) =>
      enviarDocumento({ userId: usuario.id, atividadeId, tipo, arquivo }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.documentosExtra });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useExcluirDocumento() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (documento: Pick<DocumentoAtividade, 'id' | 'caminho'>) => excluirDocumento(documento),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.documentosExtra });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

// ── Meta ────────────────────────────────────────────────────────────────────

export function useSalvarMetaExtra() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosMetaExtra) => salvarMetaExtra(dados),
    onSuccess: (meta) => cliente.setQueryData(chaves.metaExtra, meta),
  });
}
