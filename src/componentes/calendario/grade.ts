/**
 * Posição dos eventos com horário na grade do dia, como no Google Agenda:
 * cada evento ocupa a altura da sua duração e os que se cruzam dividem a
 * largura em colunas.
 */

import type { ItemCalendario } from './itens';

type ItemEvento = Extract<ItemCalendario, { tipo: 'evento' }>;

export type Bloco = {
  item: ItemEvento;
  /** Minutos desde 00:00. */
  inicio: number;
  fim: number;
  coluna: number;
  colunas: number;
};

/** Sem término, o evento aparece com 1 hora; nunca menos de 30 minutos. */
const DURACAO_PADRAO = 60;
const DURACAO_MINIMA = 30;

export function minutos(hora: string): number {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
}

export function distribuirBlocos(itens: ItemCalendario[]): Bloco[] {
  const blocos: Bloco[] = itens
    .filter((i): i is ItemEvento => i.tipo === 'evento' && !!i.hora)
    .map((item) => {
      const inicio = minutos(item.hora!);
      const fim = item.evento.hora_fim ? minutos(item.evento.hora_fim) : inicio + DURACAO_PADRAO;
      return { item, inicio, fim: Math.min(24 * 60, Math.max(fim, inicio + DURACAO_MINIMA)), coluna: 0, colunas: 1 };
    })
    .sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);

  // Grupos de eventos que se cruzam (direta ou indiretamente); dentro de cada
  // grupo, cada evento vai para a primeira coluna livre.
  let grupo: Bloco[] = [];
  let fimDoGrupo = -1;
  let fimDasColunas: number[] = [];
  const fecharGrupo = () => {
    for (const bloco of grupo) bloco.colunas = fimDasColunas.length;
    grupo = [];
    fimDasColunas = [];
  };

  for (const bloco of blocos) {
    if (grupo.length && bloco.inicio >= fimDoGrupo) fecharGrupo();
    let coluna = fimDasColunas.findIndex((fim) => fim <= bloco.inicio);
    if (coluna === -1) coluna = fimDasColunas.length;
    fimDasColunas[coluna] = bloco.fim;
    bloco.coluna = coluna;
    grupo.push(bloco);
    fimDoGrupo = grupo.length === 1 ? bloco.fim : Math.max(fimDoGrupo, bloco.fim);
  }
  fecharGrupo();
  return blocos;
}

/**
 * Posição horizontal em frações da largura. Como no Google Agenda, cada
 * coluna avança sobre a seguinte, que fica por cima.
 */
export function posicaoHorizontal(bloco: Pick<Bloco, 'coluna' | 'colunas'>): { esquerda: number; largura: number } {
  const esquerda = bloco.coluna / bloco.colunas;
  const ultima = bloco.coluna === bloco.colunas - 1;
  return { esquerda, largura: ultima ? 1 - esquerda : Math.min(1 - esquerda, 1.7 / bloco.colunas) };
}
