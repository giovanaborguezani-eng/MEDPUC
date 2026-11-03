/**
 * planner.ts — planner semanal de tarefas.
 *
 * `planejada_para` é o dia em que o aluno pretende fazer a tarefa; o prazo
 * (data-limite) é outra coisa e não muda quando a tarefa é movida.
 */

import type { Tarefa } from '../tipos/dominio';

const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 } as const;

/** Pendentes primeiro, depois por prioridade, prazo e título. */
export function ordenarDoDia(a: Tarefa, b: Tarefa): number {
  const concluidaA = a.status === 'concluida' ? 1 : 0;
  const concluidaB = b.status === 'concluida' ? 1 : 0;
  return (
    concluidaA - concluidaB ||
    PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
    (a.prazo ?? '9999-12-31').localeCompare(b.prazo ?? '9999-12-31') ||
    a.titulo.localeCompare(b.titulo, 'pt-BR')
  );
}

/** Tarefas de cada dia da semana exibida (inclusive as concluídas). */
export function tarefasPorDia(tarefas: Tarefa[], dias: string[]): Map<string, Tarefa[]> {
  const mapa = new Map(dias.map((d) => [d, [] as Tarefa[]]));
  for (const t of tarefas) {
    if (t.planejada_para && mapa.has(t.planejada_para)) mapa.get(t.planejada_para)!.push(t);
  }
  for (const lista of mapa.values()) lista.sort(ordenarDoDia);
  return mapa;
}

/**
 * Bandeja "Para planejar": pendentes sem dia e pendentes que ficaram para
 * trás (planejadas para antes de hoje), exceto as que já aparecem na semana.
 */
export function paraPlanejar(tarefas: Tarefa[], dias: string[], hoje: string): Tarefa[] {
  const naSemana = new Set(dias);
  return tarefas
    .filter(
      (t) =>
        t.status !== 'concluida' &&
        (!t.planejada_para || (t.planejada_para < hoje && !naSemana.has(t.planejada_para))),
    )
    .sort((a, b) => (a.planejada_para ? 0 : 1) - (b.planejada_para ? 0 : 1) || ordenarDoDia(a, b));
}
