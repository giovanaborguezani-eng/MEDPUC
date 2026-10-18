import { describe, expect, it } from 'vitest';
import type { Evento } from '../../tipos/dominio';
import { distribuirBlocos, posicaoHorizontal } from './grade';
import type { ItemCalendario } from './itens';

function evento(id: string, inicio: string | null, fim: string | null = null): ItemCalendario {
  const ev = { id, data: '2026-10-18', hora_inicio: inicio, hora_fim: fim } as Evento;
  return { tipo: 'evento', id, data: ev.data, hora: inicio, titulo: id, detalhe: '', cor: '#8C1D40', riscado: false, evento: ev };
}

const resumo = (itens: ItemCalendario[]) =>
  Object.fromEntries(distribuirBlocos(itens).map((b) => [b.item.id, [b.inicio, b.fim, b.coluna, b.colunas]]));

describe('grade do dia', () => {
  it('usa a duração do evento; sem término, 1 hora; ignora itens sem horário', () => {
    expect(resumo([evento('a', '11:30:00', '13:30:00'), evento('b', '15:00:00'), evento('c', null)])).toEqual({
      a: [690, 810, 0, 1],
      b: [900, 960, 0, 1],
    });
  });

  it('eventos que se cruzam dividem a largura e se sobrepõem', () => {
    const r = resumo([evento('a', '11:30:00', '13:30:00'), evento('b', '12:00:00', '13:30:00')]);
    expect(r.a.slice(2)).toEqual([0, 2]);
    expect(r.b.slice(2)).toEqual([1, 2]);
    expect(posicaoHorizontal({ coluna: 0, colunas: 2 })).toEqual({ esquerda: 0, largura: 0.85 });
    expect(posicaoHorizontal({ coluna: 1, colunas: 2 })).toEqual({ esquerda: 0.5, largura: 0.5 });
  });

  it('reaproveita a coluna livre e separa grupos que não se cruzam', () => {
    const r = resumo([
      evento('a', '08:00:00', '10:00:00'),
      evento('b', '08:30:00', '09:00:00'),
      evento('c', '09:00:00', '09:30:00'),
      evento('d', '10:00:00', '11:00:00'),
    ]);
    expect(r.b.slice(2)).toEqual([1, 2]);
    expect(r.c.slice(2)).toEqual([1, 2]);
    expect(r.d.slice(2)).toEqual([0, 1]);
  });
});
