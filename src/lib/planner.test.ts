import { describe, expect, it } from 'vitest';
import type { Tarefa } from '../tipos/dominio';
import { paraPlanejar, posicionar, tarefasPorDia } from './planner';

function tarefa(parcial: Partial<Tarefa>): Tarefa {
  return {
    id: crypto.randomUUID(),
    user_id: 'u',
    disciplina_id: null,
    titulo: 'Tarefa',
    descricao: null,
    prazo: null,
    planejada_para: null,
    ordem_planner: null,
    prioridade: 'media',
    status: 'pendente',
    concluida_em: null,
    created_at: '',
    updated_at: '',
    ...parcial,
  };
}

const SEMANA = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
const HOJE = '2026-11-03';

describe('planner semanal', () => {
  it('coloca cada tarefa no dia planejado, pendentes e mais prioritárias primeiro', () => {
    const mapa = tarefasPorDia(
      [
        tarefa({ titulo: 'Feita', planejada_para: '2026-11-03', status: 'concluida', prioridade: 'alta' }),
        tarefa({ titulo: 'Média', planejada_para: '2026-11-03' }),
        tarefa({ titulo: 'Alta', planejada_para: '2026-11-03', prioridade: 'alta' }),
        tarefa({ titulo: 'Outra semana', planejada_para: '2026-11-10' }),
        tarefa({ titulo: 'Sem dia' }),
      ],
      SEMANA,
    );
    expect(mapa.get('2026-11-03')!.map((t) => t.titulo)).toEqual(['Alta', 'Média', 'Feita']);
    expect([...mapa.values()].flat()).toHaveLength(3);
  });

  it('bandeja traz pendentes sem dia e as que ficaram para trás, nunca as concluídas', () => {
    const lista = paraPlanejar(
      [
        tarefa({ titulo: 'Sem dia' }),
        tarefa({ titulo: 'Ficou para trás', planejada_para: '2026-10-28' }),
        tarefa({ titulo: 'Concluída sem dia', status: 'concluida' }),
        tarefa({ titulo: 'Na semana', planejada_para: '2026-11-02' }),
        tarefa({ titulo: 'Futura', planejada_para: '2026-11-20' }),
      ],
      SEMANA,
      HOJE,
    );
    expect(lista.map((t) => t.titulo)).toEqual(['Ficou para trás', 'Sem dia']);
  });

  it('a ordem escolhida pelo aluno vem antes da ordem automática', () => {
    const mapa = tarefasPorDia(
      [
        tarefa({ titulo: 'Alta sem posição', planejada_para: '2026-11-04', prioridade: 'alta' }),
        tarefa({ titulo: 'Segunda', planejada_para: '2026-11-04', ordem_planner: 1 }),
        tarefa({ titulo: 'Primeira', planejada_para: '2026-11-04', ordem_planner: 0, prioridade: 'baixa' }),
      ],
      SEMANA,
    );
    expect(mapa.get('2026-11-04')!.map((t) => t.titulo)).toEqual(['Primeira', 'Segunda', 'Alta sem posição']);
  });

  it('posiciona uma tarefa no dia, vinda do mesmo dia ou de outro', () => {
    expect(posicionar(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(posicionar(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a']);
    expect(posicionar(['a', 'b'], 'x', 1)).toEqual(['a', 'x', 'b']);
    expect(posicionar(['a', 'b'], 'x', 99)).toEqual(['a', 'b', 'x']);
  });
});
