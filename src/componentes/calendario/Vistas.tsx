import { Plus } from 'lucide-react';
import { useState, type PointerEvent as EventoPonteiro } from 'react';
import {
  deISO,
  diasDaSemana,
  formatarData,
  formatarDiaSemana,
  gradeDoMes,
  hojeISO,
  mesmoMes,
  NOMES_DIAS_CURTOS,
  paraISO,
} from '../../lib/datas';
import { comTransparencia } from '../../lib/cores';
import { ChipItem, LinhaItem } from './ChipItem';
import { distribuirBlocos, posicaoHorizontal } from './grade';
import type { ItemCalendario } from './itens';

type PropsVista = {
  referencia: Date;
  porDia: Map<string, ItemCalendario[]>;
  aoAbrir: (item: ItemCalendario) => void;
  aoNovo: (data: string, hora?: string, horaFim?: string) => void;
  aoIrParaDia: (data: string) => void;
};

const MAXIMO_POR_CELULA = 3;

export function VistaMes({ referencia, porDia, aoAbrir, aoNovo, aoIrParaDia }: PropsVista) {
  const hoje = hojeISO();
  const dias = gradeDoMes(referencia);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-cartao">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80" aria-hidden>
        {NOMES_DIAS_CURTOS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div aria-label="Calendário do mês" role="region" className="grid grid-cols-7">
        {dias.map((dia, i) => {
          const itens = porDia.get(dia) ?? [];
          const foraDoMes = !mesmoMes(dia, referencia);
          const ehHoje = dia === hoje;
          const extras = itens.length - MAXIMO_POR_CELULA;
          return (
            <div
              key={dia}
              role="group"
              data-data={dia}
              aria-label={`${formatarData(dia, "EEEE, d 'de' MMMM")}${itens.length ? `, ${itens.length} compromisso(s)` : ''}`}
              className={`group relative min-h-16 border-stone-100 p-1 sm:min-h-28 sm:p-1.5 ${i % 7 !== 6 ? 'border-r' : ''} ${
                i < 35 ? 'border-b' : ''
              } ${foraDoMes ? 'bg-stone-50/60' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => aoIrParaDia(dia)}
                  aria-label={`Abrir ${formatarData(dia, "d 'de' MMMM")}`}
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    ehHoje
                      ? 'bg-vinho-600 text-white'
                      : foraDoMes
                        ? 'text-stone-500 hover:bg-stone-100'
                        : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {deISO(dia).getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => aoNovo(dia)}
                  aria-label={`Novo evento em ${formatarData(dia, "d 'de' MMMM")}`}
                  className="hidden size-6 items-center justify-center rounded-md text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 focus:opacity-100 sm:flex"
                >
                  <Plus aria-hidden className="size-3.5" />
                </button>
              </div>

              {/* Celular: pontos coloridos; toque abre o dia. */}
              {itens.length > 0 && (
                <button
                  type="button"
                  onClick={() => aoIrParaDia(dia)}
                  className="flex flex-wrap gap-0.5 px-0.5 sm:hidden"
                  aria-label={`${itens.length} compromisso(s) em ${formatarData(dia, "d 'de' MMMM")}`}
                >
                  {itens.slice(0, 4).map((item) => (
                    <span key={`${item.tipo}-${item.id}`} className="size-1.5 rounded-full" style={{ backgroundColor: item.cor }} />
                  ))}
                </button>
              )}

              <div className="hidden space-y-0.5 sm:block">
                {itens.slice(0, MAXIMO_POR_CELULA).map((item) => (
                  <ChipItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />
                ))}
                {extras > 0 && (
                  <button
                    type="button"
                    onClick={() => aoIrParaDia(dia)}
                    className="w-full rounded px-1.5 text-left text-[11px] font-medium text-stone-500 hover:text-stone-800"
                  >
                    +{extras} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VistaSemana({ referencia, porDia, aoAbrir, aoNovo, aoIrParaDia }: PropsVista) {
  const hoje = hojeISO();
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {diasDaSemana(referencia).map((dia) => {
        const itens = porDia.get(dia) ?? [];
        const ehHoje = dia === hoje;
        return (
          <section
            key={dia}
            aria-label={formatarData(dia, "EEEE, d 'de' MMMM")}
            data-data={dia}
            className={`flex flex-col rounded-2xl border bg-white p-2 shadow-cartao lg:min-h-80 ${
              ehHoje ? 'border-vinho-300' : 'border-stone-200'
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <button type="button" onClick={() => aoIrParaDia(dia)} className="flex items-baseline gap-2 rounded text-left lg:flex-col lg:gap-0">
                <span className={`text-[11px] font-semibold tracking-wide uppercase ${ehHoje ? 'text-vinho-700' : 'text-stone-500'}`}>
                  {formatarDiaSemana(dia)}
                </span>
                <span className={`font-serif text-xl font-semibold ${ehHoje ? 'text-vinho-700' : 'text-stone-800'}`}>
                  {formatarData(dia, 'd')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => aoNovo(dia)}
                aria-label={`Novo evento em ${formatarData(dia, "d 'de' MMMM")}`}
                className="flex size-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {itens.length ? (
                itens.map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />)
              ) : (
                <p className="px-1 pb-1 text-xs text-stone-500">Livre</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

type Selecao = { inicio: number; fim: number };

/** Faixas de 30 minutos: 0 = 00:00, 1 = 00:30 … 48 = fim do dia. */
function horarioDaFaixa(faixa: number): string {
  if (faixa >= 48) return '23:59';
  return `${String(Math.floor(faixa / 2)).padStart(2, '0')}:${faixa % 2 ? '30' : '00'}`;
}

function faixaNoPonto(x: number, y: number): number | null {
  const elemento = document.elementFromPoint?.(x, y)?.closest<HTMLElement>('[data-faixa]');
  return elemento ? Number(elemento.dataset.faixa) : null;
}

/** Altura de 1 hora na grade do dia, em pixels (30 minutos = metade). */
const ALTURA_HORA = 48;

export function VistaDia({ referencia, porDia, aoAbrir, aoNovo }: Omit<PropsVista, 'aoIrParaDia'>) {
  const data = paraISO(referencia);
  const itens = porDia.get(data) ?? [];
  const semHorario = itens.filter((i) => !i.hora);
  const blocos = distribuirBlocos(itens);
  const inicio = Math.min(7, ...blocos.map((b) => Math.floor(b.inicio / 60)));
  const fim = Math.min(23, Math.max(22, ...blocos.map((b) => Math.ceil(b.fim / 60) - 1)));
  const horas = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const menor = selecao ? Math.min(selecao.inicio, selecao.fim) : -1;
  const maior = selecao ? Math.max(selecao.inicio, selecao.fim) : -1;
  const ultimaSelecionada = menor === maior ? menor + 1 : maior;
  const topo = (minuto: number) => ((minuto - inicio * 60) / 60) * ALTURA_HORA;

  // Como no Google Agenda: clicar cria 1 hora; arrastar escolhe o intervalo.
  // No celular, arrastar rola a tela (pointercancel) e só o toque cria.
  function iniciarSelecao(e: EventoPonteiro, faixa: number) {
    if (e.button > 0) return;
    e.preventDefault();
    let atual = faixa;
    setSelecao({ inicio: faixa, fim: faixa });

    function mover(ev: PointerEvent) {
      const sob = faixaNoPonto(ev.clientX, ev.clientY);
      if (sob !== null && sob !== atual) {
        atual = sob;
        setSelecao({ inicio: faixa, fim: sob });
      }
    }
    function encerrar(ev: PointerEvent) {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', encerrar);
      window.removeEventListener('pointercancel', encerrar);
      setSelecao(null);
      if (ev.type === 'pointercancel') return;
      const de = Math.min(faixa, atual);
      const ate = atual === faixa ? faixa + 2 : Math.max(faixa, atual) + 1;
      aoNovo(data, horarioDaFaixa(de), horarioDaFaixa(ate));
    }
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', encerrar);
    window.addEventListener('pointercancel', encerrar);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-cartao">
      <div className="flex items-start gap-3 border-b border-stone-100 p-3">
        <span className="w-14 shrink-0 pt-2 text-right text-xs font-medium text-stone-500">Dia todo</span>
        <div className="flex-1 space-y-1.5">
          {semHorario.length ? (
            semHorario.map((item) => <LinhaItem key={`${item.tipo}-${item.id}`} item={item} aoAbrir={aoAbrir} />)
          ) : (
            <p className="pt-2 text-xs text-stone-500">Nenhum compromisso sem horário.</p>
          )}
        </div>
      </div>
      <div className="flex gap-3 px-3 py-3 select-none">
        <ol className="w-14 shrink-0" aria-hidden>
          {horas.map((hora) => (
            <li key={hora} className="text-right text-xs text-stone-500 tabular-nums" style={{ height: ALTURA_HORA }}>
              <span className="relative -top-2">{horarioDaFaixa(hora * 2)}</span>
            </li>
          ))}
        </ol>
        <div className="relative flex-1" style={{ height: horas.length * ALTURA_HORA }}>
          {horas.map((hora) =>
            [0, 1].map((meia) => {
              const faixa = hora * 2 + meia;
              return (
                <div
                  key={faixa}
                  aria-hidden
                  data-faixa={faixa}
                  onPointerDown={(e) => iniciarSelecao(e, faixa)}
                  className={`cursor-pointer hover:bg-stone-50 ${meia ? 'border-b border-stone-100' : 'border-b border-dashed border-stone-50'}`}
                  style={{ height: ALTURA_HORA / 2 }}
                />
              );
            }),
          )}

          {selecao && (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 rounded-md border border-vinho-300 bg-vinho-100/90 px-2 py-0.5 text-xs font-medium text-vinho-800 tabular-nums"
              style={{ top: topo(menor * 30), height: (ultimaSelecionada - menor + 1) * (ALTURA_HORA / 2) }}
            >
              {horarioDaFaixa(menor)} – {horarioDaFaixa(ultimaSelecionada + 1)}
            </div>
          )}

          <div className="pointer-events-none absolute inset-y-0 right-2 left-0">
            {blocos.map((bloco) => {
              const { esquerda, largura } = posicaoHorizontal(bloco);
              const altura = topo(bloco.fim) - topo(bloco.inicio);
              const { item } = bloco;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => aoAbrir(item)}
                  title={`${item.titulo} — ${item.detalhe}`}
                  aria-label={`${item.titulo}, ${item.detalhe}`}
                  className="pointer-events-auto absolute overflow-hidden rounded-lg px-2 py-1 text-left ring-1 ring-white transition-[filter] hover:brightness-95"
                  style={{
                    top: topo(bloco.inicio) + 1,
                    height: altura - 2,
                    left: `${esquerda * 100}%`,
                    width: `${largura * 100}%`,
                    zIndex: 10 + bloco.coluna,
                    // Fundo opaco: quando um evento cobre outro, o de baixo não aparece através.
                    backgroundColor: 'white',
                    backgroundImage: `linear-gradient(${comTransparencia(item.cor, 0.16)}, ${comTransparencia(item.cor, 0.16)})`,
                    boxShadow: `inset 3px 0 0 ${item.cor}`,
                  }}
                >
                  <span
                    className={`block truncate text-sm leading-5 font-medium text-stone-800 ${item.riscado ? 'line-through opacity-60' : ''}`}
                  >
                    {item.titulo}
                  </span>
                  {altura >= 44 && <span className="block truncate text-xs text-stone-500">{item.detalhe}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
