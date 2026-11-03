/**
 * Planner semanal: as tarefas distribuídas pelos dias em que o aluno pretende
 * fazê-las, na ordem que ele escolher. Arrastar entre os dias ou dentro do
 * dia (mouse), ou usar o seletor de dia e os botões subir/descer (teclado,
 * tablet e celular). O prazo da tarefa não muda.
 */

import { ArrowDown, ArrowUp, CalendarClock, Check, ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useMapaDisciplinas } from '../../hooks/useDisciplinas';
import { useConcluirTarefa, usePlanejarTarefas, useTarefas, useTirarDoPlanner } from '../../hooks/useTarefas';
import { comTransparencia } from '../../lib/cores';
import {
  deISO,
  diasDaSemana,
  formatarData,
  formatarDiaSemana,
  hojeISO,
  isoValida,
  navegar,
  paraISO,
  tituloDaVista,
} from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { paraPlanejar, posicionar, tarefasPorDia } from '../../lib/planner';
import { tarefaAtrasada } from '../../lib/resumo';
import type { Disciplina, Tarefa } from '../../tipos/dominio';
import { BotaoIcone } from '../ui/Botao';
import { EsqueletoLista, MensagemErro } from '../ui/Estados';
import { FormularioTarefa } from './FormularioTarefa';

const SEM_DIA = 'sem-dia';
const COR_SEM_DISCIPLINA = '#78716C';

/** Onde a tarefa arrastada vai cair: coluna e posição (sem contar a própria tarefa). */
type Alvo = { chave: string; indice: number };

export function PlannerSemanal() {
  const avisos = useNotificacoes();
  const [parametros, setParametros] = useSearchParams();
  const { data: tarefas, isPending, isError, error, refetch } = useTarefas();
  const disciplinas = useMapaDisciplinas();
  const planejar = usePlanejarTarefas();
  const tirar = useTirarDoPlanner();
  const concluir = useConcluirTarefa();
  const [formulario, setFormulario] = useState<{ aberto: boolean; tarefa: Tarefa | null; dia?: string }>({ aberto: false, tarefa: null });
  const [arrastada, setArrastada] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  const hoje = hojeISO();
  const semanaParam = parametros.get('semana');
  const referencia = useMemo(() => deISO(isoValida(semanaParam) ? semanaParam : hoje), [semanaParam, hoje]);
  const dias = diasDaSemana(referencia);
  const porDia = useMemo(() => tarefasPorDia(tarefas ?? [], dias), [tarefas, dias.join()]);
  const bandeja = useMemo(() => paraPlanejar(tarefas ?? [], dias, hoje), [tarefas, dias.join(), hoje]);

  function irPara(data: Date) {
    const proximos = new URLSearchParams(parametros);
    proximos.set('semana', paraISO(data));
    setParametros(proximos, { replace: true });
  }

  /** Lista de ids do dia, inclusive de dias fora da semana exibida. */
  function idsDoDia(dia: string): string[] {
    const lista = porDia.get(dia) ?? tarefasPorDia(tarefas ?? [], [dia]).get(dia) ?? [];
    return lista.map((t) => t.id);
  }

  /** Coloca a tarefa no dia, na posição indicada (padrão: no fim). */
  async function colocar(tarefa: Tarefa, dia: string, indice = Number.MAX_SAFE_INTEGER) {
    const atuais = idsDoDia(dia);
    const ids = posicionar(atuais, tarefa.id, indice);
    const mesmoDia = tarefa.planejada_para === dia;
    if (mesmoDia && ids.join() === atuais.join()) return;
    try {
      await planejar.mutateAsync({ dia, ids });
      if (!mesmoDia) avisos.sucesso(`"${tarefa.titulo}" planejada para ${formatarData(dia, "EEEE, d 'de' MMM")}.`);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  async function semDia(tarefa: Tarefa) {
    if (!tarefa.planejada_para) return;
    try {
      await tirar.mutateAsync(tarefa.id);
      avisos.sucesso(`"${tarefa.titulo}" voltou para "Para planejar".`);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  function moverNoDia(tarefa: Tarefa, passo: -1 | 1) {
    if (!tarefa.planejada_para) return;
    const atual = idsDoDia(tarefa.planejada_para).indexOf(tarefa.id);
    colocar(tarefa, tarefa.planejada_para, atual + passo);
  }

  async function alternar(tarefa: Tarefa) {
    const concluida = tarefa.status !== 'concluida';
    try {
      await concluir.mutateAsync({ id: tarefa.id, concluida });
      avisos.sucesso(concluida ? 'Tarefa concluída.' : 'Tarefa reaberta.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  // ── Arrastar e soltar (mouse) ─────────────────────────────────────────────
  // A posição é calculada pela altura do ponteiro em relação aos cartões da
  // coluna (sem contar o cartão arrastado).
  function indiceNoPonto(coluna: HTMLElement, y: number): number {
    const cartoes = [...coluna.querySelectorAll<HTMLElement>('[data-cartao]')].filter((c) => c.dataset.cartao !== arrastada);
    const i = cartoes.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    return i === -1 ? cartoes.length : i;
  }

  const alvoProps = (chave: string, dia: string | null) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!e.dataTransfer.types.includes('text/plain')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const indice = dia ? indiceNoPonto(e.currentTarget, e.clientY) : 0;
      if (alvo?.chave !== chave || alvo.indice !== indice) setAlvo({ chave, indice });
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo((a) => (a?.chave === chave ? null : a));
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      const indice = dia ? indiceNoPonto(e.currentTarget, e.clientY) : 0;
      setAlvo(null);
      setArrastada(null);
      const tarefa = tarefas?.find((t) => t.id === e.dataTransfer.getData('text/plain'));
      if (!tarefa) return;
      if (dia) colocar(tarefa, dia, indice);
      else semDia(tarefa);
    },
  });

  if (isPending) return <EsqueletoLista />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  const marcador = <div aria-hidden className="h-0.5 rounded-full bg-vinho-500" />;

  const cartao = (tarefa: Tarefa, posicao?: { indice: number; total: number }) => (
    <CartaoPlanner
      key={tarefa.id}
      tarefa={tarefa}
      disciplina={tarefa.disciplina_id ? disciplinas.get(tarefa.disciplina_id) : null}
      dias={dias}
      hoje={hoje}
      posicao={posicao}
      arrastando={arrastada === tarefa.id}
      aoComecarArrastar={() => setArrastada(tarefa.id)}
      aoTerminarArrastar={() => {
        setArrastada(null);
        setAlvo(null);
      }}
      aoAbrir={(t) => setFormulario({ aberto: true, tarefa: t })}
      aoAlternar={alternar}
      aoEscolherDia={(t, dia) => (dia ? colocar(t, dia) : semDia(t))}
      aoMoverNoDia={moverNoDia}
    />
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl" aria-live="polite">
          {tituloDaVista('semana', referencia)}
        </h2>
        <div className="flex items-center rounded-lg border border-stone-300 bg-white shadow-sm sm:ml-auto">
          <BotaoIcone rotulo="Semana anterior" onClick={() => irPara(navegar('semana', referencia, -1))}>
            <ChevronLeft aria-hidden className="size-4" />
          </BotaoIcone>
          <button
            type="button"
            onClick={() => irPara(new Date())}
            className="h-9 border-x border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Esta semana
          </button>
          <BotaoIcone rotulo="Próxima semana" onClick={() => irPara(navegar('semana', referencia, 1))}>
            <ChevronRight aria-hidden className="size-4" />
          </BotaoIcone>
        </div>
      </div>

      <section
        aria-labelledby="titulo-bandeja"
        {...alvoProps(SEM_DIA, null)}
        className={`mb-4 rounded-2xl border border-dashed p-3 transition-colors ${
          alvo?.chave === SEM_DIA ? 'border-vinho-400 bg-vinho-50/60' : 'border-stone-300 bg-white/60'
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
          <Inbox aria-hidden className="size-4 text-stone-400" />
          <h3 id="titulo-bandeja" className="text-sm font-semibold text-stone-700">
            Para planejar
          </h3>
          <span className="text-xs text-stone-500">
            {bandeja.length ? `${bandeja.length} pendente${bandeja.length === 1 ? '' : 's'} sem dia nesta semana` : 'Tudo planejado'}
          </span>
          <span className="ml-auto hidden text-xs text-stone-400 pointer-fine:inline">Arraste para um dia e para a posição que quiser</span>
        </div>
        {bandeja.length > 0 && <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{bandeja.map((t) => cartao(t))}</div>}
      </section>

      {/* Tablet e notebook: as 7 colunas lado a lado. Celular: dias empilhados. */}
      <div className="grid gap-3 md:grid-cols-7 md:gap-1.5 lg:gap-2">
        {dias.map((dia) => {
          const itens = porDia.get(dia) ?? [];
          const ehHoje = dia === hoje;
          const aqui = alvo?.chave === dia;
          // O cartão arrastado continua na tela (esmaecido); o marcador conta as posições sem ele.
          const semArrastada = itens.filter((t) => t.id !== arrastada);
          return (
            <section
              key={dia}
              aria-label={formatarData(dia, "EEEE, d 'de' MMMM")}
              data-data={dia}
              {...alvoProps(dia, dia)}
              className={`flex min-w-0 flex-col rounded-2xl border bg-white p-2 shadow-cartao transition-colors md:min-h-80 md:p-1 lg:p-2 ${
                aqui ? 'border-vinho-400 bg-vinho-50/40' : ehHoje ? 'border-vinho-300' : 'border-stone-200'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-baseline gap-2 md:flex-col md:gap-0">
                  <span className={`text-[11px] font-semibold tracking-wide uppercase ${ehHoje ? 'text-vinho-700' : 'text-stone-500'}`}>
                    {formatarDiaSemana(dia)}
                  </span>
                  <span className={`font-serif text-xl font-semibold ${ehHoje ? 'text-vinho-700' : 'text-stone-800'}`}>{formatarData(dia, 'd')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFormulario({ aberto: true, tarefa: null, dia })}
                  aria-label={`Nova tarefa em ${formatarData(dia, "d 'de' MMMM")}`}
                  className="flex size-7 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <Plus aria-hidden className="size-4" />
                </button>
              </div>
              <ol className="flex-1 space-y-1.5" aria-label={`Tarefas de ${formatarData(dia, "d 'de' MMMM")}, na ordem escolhida`}>
                {itens.map((t, i) => (
                  <li key={t.id} className="space-y-1.5">
                    {aqui && t.id !== arrastada && semArrastada.indexOf(t) === alvo.indice && marcador}
                    {cartao(t, { indice: i, total: itens.length })}
                  </li>
                ))}
                {aqui && alvo.indice >= semArrastada.length && <li aria-hidden>{marcador}</li>}
                {!itens.length && !aqui && <li className="px-1 pb-1 text-xs text-stone-500">Livre</li>}
              </ol>
            </section>
          );
        })}
      </div>

      <FormularioTarefa
        aberto={formulario.aberto}
        tarefa={formulario.tarefa}
        diaPlanejado={formulario.dia}
        aoFechar={() => setFormulario({ aberto: false, tarefa: null })}
      />
    </div>
  );
}

type PropsCartao = {
  tarefa: Tarefa;
  disciplina?: Disciplina | null;
  dias: string[];
  hoje: string;
  /** Posição no dia (só para tarefas que já estão num dia da semana). */
  posicao?: { indice: number; total: number };
  arrastando: boolean;
  aoComecarArrastar: () => void;
  aoTerminarArrastar: () => void;
  aoAbrir: (tarefa: Tarefa) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoEscolherDia: (tarefa: Tarefa, dia: string | null) => void;
  aoMoverNoDia: (tarefa: Tarefa, passo: -1 | 1) => void;
};

function CartaoPlanner({
  tarefa,
  disciplina,
  dias,
  hoje,
  posicao,
  arrastando,
  aoComecarArrastar,
  aoTerminarArrastar,
  aoAbrir,
  aoAlternar,
  aoEscolherDia,
  aoMoverNoDia,
}: PropsCartao) {
  const cor = disciplina?.cor ?? COR_SEM_DISCIPLINA;
  const concluida = tarefa.status === 'concluida';
  const atrasada = tarefaAtrasada(tarefa, hoje);
  const ficouParaTras = !concluida && !!tarefa.planejada_para && tarefa.planejada_para < hoje && !dias.includes(tarefa.planejada_para);
  const detalhe = [disciplina?.nome, tarefa.prioridade === 'alta' && !concluida ? 'Prioridade alta' : null].filter(Boolean).join(' · ');
  // O seletor oferece os dias da semana exibida, mais o dia atual se for de outra semana.
  const opcoes = tarefa.planejada_para && !dias.includes(tarefa.planejada_para) ? [tarefa.planejada_para, ...dias] : dias;
  // Com mouse, os controles aparecem ao passar por cima ou focar; no toque, ficam sempre visíveis.
  const controles = 'pointer-fine:hidden pointer-fine:group-hover:flex pointer-fine:group-focus-within:flex';

  return (
    <div
      data-cartao={tarefa.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', tarefa.id);
        e.dataTransfer.effectAllowed = 'move';
        aoComecarArrastar();
      }}
      onDragEnd={aoTerminarArrastar}
      className={`group flex items-start gap-2 rounded-lg px-2 py-2 transition-[filter,opacity] hover:brightness-95 pointer-fine:cursor-grab md:gap-1 md:px-1 md:py-1.5 lg:gap-2 lg:px-2 lg:py-2 ${
        arrastando ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: comTransparencia(cor, concluida ? 0.06 : 0.12), boxShadow: `inset 3px 0 0 ${cor}` }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={concluida}
        aria-label={concluida ? `Reabrir "${tarefa.titulo}"` : `Concluir "${tarefa.titulo}"`}
        onClick={() => aoAlternar(tarefa)}
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          concluida ? 'border-vinho-600 bg-vinho-600 text-white' : 'border-stone-300 bg-white hover:border-vinho-500'
        }`}
      >
        {concluida && <Check aria-hidden className="size-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => aoAbrir(tarefa)} className="block w-full text-left">
          <span
            className={`block text-sm leading-5 font-medium break-words hyphens-auto md:text-xs md:leading-4 lg:text-sm lg:leading-5 ${
              concluida ? 'text-stone-400 line-through' : 'text-stone-800'
            }`}
          >
            {tarefa.titulo}
          </span>
          {detalhe && <span className="block text-xs break-words text-stone-500 hyphens-auto md:text-[11px] lg:text-xs">{detalhe}</span>}
          {tarefa.prazo && !concluida && (
            <span className={`mt-0.5 inline-flex items-center gap-1 text-xs ${atrasada ? 'font-medium text-red-600' : 'text-stone-500'}`}>
              <CalendarClock aria-hidden className="size-3 shrink-0" />
              Prazo {formatarData(tarefa.prazo)}
              {atrasada && ' · atrasada'}
            </span>
          )}
          {ficouParaTras && <span className="mt-0.5 block text-xs text-amber-700">Planejada para {formatarData(tarefa.planejada_para!)}</span>}
        </button>
        <div className={`mt-1.5 flex flex-wrap items-center gap-1 ${controles}`}>
          <select
            aria-label={`Dia planejado de ${tarefa.titulo}`}
            value={tarefa.planejada_para ?? SEM_DIA}
            onChange={(e) => aoEscolherDia(tarefa, e.target.value === SEM_DIA ? null : e.target.value)}
            className="h-7 min-w-0 flex-1 basis-24 rounded-md border border-stone-200 bg-white/80 px-1 text-xs text-stone-600 focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none"
          >
            <option value={SEM_DIA}>Sem dia</option>
            {opcoes.map((d) => (
              <option key={d} value={d}>
                {formatarData(d, "EEE, d 'de' MMM")}
              </option>
            ))}
          </select>
          {posicao && posicao.total > 1 && (
            <span className="flex">
              <button
                type="button"
                onClick={() => aoMoverNoDia(tarefa, -1)}
                disabled={posicao.indice === 0}
                aria-label={`Subir "${tarefa.titulo}" no dia`}
                title="Subir"
                className="flex size-7 items-center justify-center rounded-md text-stone-500 hover:bg-white/80 hover:text-stone-800 disabled:opacity-30"
              >
                <ArrowUp aria-hidden className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aoMoverNoDia(tarefa, 1)}
                disabled={posicao.indice === posicao.total - 1}
                aria-label={`Descer "${tarefa.titulo}" no dia`}
                title="Descer"
                className="flex size-7 items-center justify-center rounded-md text-stone-500 hover:bg-white/80 hover:text-stone-800 disabled:opacity-30"
              >
                <ArrowDown aria-hidden className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
