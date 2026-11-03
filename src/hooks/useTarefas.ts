import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atualizarTarefa, criarTarefa, excluirTarefa, listarTarefas, planejarTarefas } from '../servicos/tarefas';
import type { DadosTarefa, Tarefa } from '../tipos/dominio';
import { chaves } from './chaves';

export function useTarefas() {
  return useQuery({ queryKey: chaves.tarefas, queryFn: listarTarefas });
}

export function useSalvarTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id?: string; dados: DadosTarefa }) =>
      id ? atualizarTarefa(id, dados) : criarTarefa(dados),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.tarefas });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

export function useConcluirTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, concluida }: { id: string; concluida: boolean }) =>
      atualizarTarefa(id, { status: concluida ? 'concluida' : 'pendente' }),
    onMutate: async ({ id, concluida }) => {
      await cliente.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = cliente.getQueryData<Tarefa[]>(chaves.tarefas);
      cliente.setQueryData<Tarefa[]>(chaves.tarefas, (lista) =>
        lista?.map((t) => (t.id === id ? { ...t, status: concluida ? 'concluida' : 'pendente' } : t)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.tarefas, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.tarefas }),
  });
}

export function useExcluirTarefa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirTarefa(id),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.tarefas });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}

/** Planner: tira a tarefa dos dias (volta para "Para planejar"). */
export function useTirarDoPlanner() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => atualizarTarefa(id, { planejada_para: null, ordem_planner: null }),
    onMutate: async (id) => {
      await cliente.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = cliente.getQueryData<Tarefa[]>(chaves.tarefas);
      cliente.setQueryData<Tarefa[]>(chaves.tarefas, (lista) =>
        lista?.map((t) => (t.id === id ? { ...t, planejada_para: null, ordem_planner: null } : t)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.tarefas, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.tarefas }),
  });
}

/** Planner: grava o dia e a ordem das tarefas de um dia, com atualização otimista. */
export function usePlanejarTarefas() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ dia, ids }: { dia: string; ids: string[] }) => planejarTarefas(dia, ids),
    onMutate: async ({ dia, ids }) => {
      await cliente.cancelQueries({ queryKey: chaves.tarefas });
      const anterior = cliente.getQueryData<Tarefa[]>(chaves.tarefas);
      const posicao = new Map(ids.map((id, i) => [id, i]));
      cliente.setQueryData<Tarefa[]>(chaves.tarefas, (lista) =>
        lista?.map((t) => (posicao.has(t.id) ? { ...t, planejada_para: dia, ordem_planner: posicao.get(t.id)! } : t)),
      );
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.tarefas, contexto.anterior);
    },
    onSettled: () => cliente.invalidateQueries({ queryKey: chaves.tarefas }),
  });
}
