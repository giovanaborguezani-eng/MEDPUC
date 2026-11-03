/**
 * Planner semanal: as tarefas distribuídas pelos dias em que o aluno pretende
 * fazê-las. Arrastar entre os dias (computador) ou escolher o dia no seletor
 * do cartão (teclado e celular). O prazo da tarefa não muda.
 */

import { CalendarClock, Check, ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useMapaDisciplinas } from '../../hooks/useDisciplinas';
import { useConcluirTarefa, useMoverTarefa, useTarefas } from '../../hooks/useTarefas';
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
import { paraPlanejar, tarefasPorDia } from '../../lib/planner';
import { tarefaAtrasada } from '../../lib/resumo';
import type { Disciplina, Tarefa } from '../../tipos/dominio';
import { BotaoIcone } from '../ui/Botao';
import { EsqueletoLista, MensagemErro } from '../ui/Estados';
import { FormularioTarefa } from './FormularioTarefa';

const SEM_DIA = 'sem-dia';
const COR_SEM_DISCIPLINA = '#78716C';

export function PlannerSemanal() {
  const avisos = useNotificacoes();
  const [parametros, setParametros] = useSearchParams();
  const { data: tarefas, isPending, isError, error, refetch } = useTarefas();
  const disciplinas = useMapaDisciplinas();
  const mover = useMoverTarefa();
  const concluir = useConcluirTarefa();
  const [formulario, setFormulario] = useState<{ aberto: boolean; tarefa: Tarefa | null; dia?: string }>({ aberto: false, tarefa: null });
  const [alvo, setAlvo] = useState<string | null>(null);

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

  async function moverPara(tarefa: Tarefa, dia: string | null) {
    if ((tarefa.planejada_para ?? null) === dia) return;
    try {
      await mover.mutateAsync({ id: tarefa.id, dia });
      avisos.sucesso(dia ? `"${tarefa.titulo}" planejada para ${formatarData(dia, "EEEE, d 'de' MMM")}.` : `"${tarefa.titulo}" ficou sem dia.`);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
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

  // Arrastar e soltar (mouse). Cada coluna e a bandeja recebem a tarefa.
  function soltar(e: DragEvent, dia: string | null) {
    e.preventDefault();
    setAlvo(null);
    const id = e.dataTransfer.getData('text/plain');
    const tarefa = tarefas?.find((t) => t.id === id);
    if (tarefa) moverPara(tarefa, dia);
  }
  const alvoProps = (chave: string, dia: string | null) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes('text/plain')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (alvo !== chave) setAlvo(chave);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo((a) => (a === chave ? null : a));
    },
    onDrop: (e: DragEvent) => soltar(e, dia),
  });

  if (isPending) return <EsqueletoLista />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  const cartao = (tarefa: Tarefa) => (
    <CartaoPlanner
      key={tarefa.id}
      tarefa={tarefa}
      disciplina={tarefa.disciplina_id ? disciplinas.get(tarefa.disciplina_id) : null}
      dias={dias}
      hoje={hoje}
      aoAbrir={(t) => setFormulario({ aberto: true, tarefa: t })}
      aoAlternar={alternar}
      aoMover={moverPara}
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
          alvo === SEM_DIA ? 'border-vinho-400 bg-vinho-50/60' : 'border-stone-300 bg-white/60'
        }`}
      >
        <div className="mb-2 flex items-center gap-2 px-1">
          <Inbox aria-hidden className="size-4 text-stone-400" />
          <h3 id="titulo-bandeja" className="text-sm font-semibold text-stone-700">
            Para planejar
          </h3>
          <span className="text-xs text-stone-500">
            {bandeja.length ? `${bandeja.length} pendente${bandeja.length === 1 ? '' : 's'} sem dia nesta semana` : 'Tudo planejado'}
          </span>
          <span className="ml-auto hidden text-xs text-stone-400 lg:inline">Arraste para um dia ou escolha no cartão</span>
        </div>
        {bandeja.length > 0 && <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{bandeja.map(cartao)}</div>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:gap-2">
        {dias.map((dia) => {
          const itens = porDia.get(dia) ?? [];
          const ehHoje = dia === hoje;
          return (
            <section
              key={dia}
              aria-label={formatarData(dia, "EEEE, d 'de' MMMM")}
              data-data={dia}
              {...alvoProps(dia, dia)}
              className={`flex flex-col rounded-2xl border bg-white p-2 shadow-cartao transition-colors xl:min-h-80 ${
                alvo === dia ? 'border-vinho-400 bg-vinho-50/40' : ehHoje ? 'border-vinho-300' : 'border-stone-200'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-baseline gap-2 xl:flex-col xl:gap-0">
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
              <div className="flex-1 space-y-1.5">
                {itens.length ? itens.map(cartao) : <p className="px-1 pb-1 text-xs text-stone-500">Livre</p>}
              </div>
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
  aoAbrir: (tarefa: Tarefa) => void;
  aoAlternar: (tarefa: Tarefa) => void;
  aoMover: (tarefa: Tarefa, dia: string | null) => void;
};

function CartaoPlanner({ tarefa, disciplina, dias, hoje, aoAbrir, aoAlternar, aoMover }: PropsCartao) {
  const [arrastando, setArrastando] = useState(false);
  const cor = disciplina?.cor ?? COR_SEM_DISCIPLINA;
  const concluida = tarefa.status === 'concluida';
  const atrasada = tarefaAtrasada(tarefa, hoje);
  const ficouParaTras = !concluida && !!tarefa.planejada_para && tarefa.planejada_para < hoje && !dias.includes(tarefa.planejada_para);
  const detalhe = [disciplina?.nome, tarefa.prioridade === 'alta' && !concluida ? 'Prioridade alta' : null].filter(Boolean).join(' · ');
  // O seletor oferece os dias da semana exibida, mais o dia atual se for de outra semana.
  const opcoes = tarefa.planejada_para && !dias.includes(tarefa.planejada_para) ? [tarefa.planejada_para, ...dias] : dias;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', tarefa.id);
        e.dataTransfer.effectAllowed = 'move';
        setArrastando(true);
      }}
      onDragEnd={() => setArrastando(false)}
      className={`group flex items-start gap-2 rounded-lg px-2 py-2 transition-[filter,opacity] hover:brightness-95 lg:cursor-grab ${
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
          <span className={`block text-sm leading-5 font-medium break-words ${concluida ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
            {tarefa.titulo}
          </span>
          {detalhe && <span className="block text-xs text-stone-500 [overflow-wrap:anywhere]">{detalhe}</span>}
          {tarefa.prazo && !concluida && (
            <span className={`mt-0.5 inline-flex items-center gap-1 text-xs ${atrasada ? 'font-medium text-red-600' : 'text-stone-500'}`}>
              <CalendarClock aria-hidden className="size-3" />
              Prazo {formatarData(tarefa.prazo)}
              {atrasada && ' · atrasada'}
            </span>
          )}
          {ficouParaTras && (
            <span className="mt-0.5 block text-xs text-amber-700">Planejada para {formatarData(tarefa.planejada_para!)}</span>
          )}
        </button>
        <select
          aria-label={`Dia planejado de ${tarefa.titulo}`}
          value={tarefa.planejada_para ?? SEM_DIA}
          onChange={(e) => aoMover(tarefa, e.target.value === SEM_DIA ? null : e.target.value)}
          className="mt-1.5 h-7 w-full max-w-44 rounded-md border border-stone-200 bg-white/80 px-1.5 text-xs text-stone-600 focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none lg:hidden lg:group-focus-within:block lg:group-hover:block"
        >
          <option value={SEM_DIA}>Sem dia</option>
          {opcoes.map((d) => (
            <option key={d} value={d}>
              {formatarData(d, "EEE, d 'de' MMM")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
