import { ArrowRight, CalendarClock, ExternalLink, Info, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FormularioOportunidade } from '../../../componentes/extracurriculares/FormularioOportunidade';
import { EtiquetaCategoria, SeloCategoria } from '../../../componentes/extracurriculares/Visuais';
import { Botao, BotaoIcone } from '../../../componentes/ui/Botao';
import { SelecaoCompacta } from '../../../componentes/ui/Campos';
import { Confirmacao } from '../../../componentes/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { Etiqueta } from '../../../componentes/ui/Visuais';
import { useNotificacoes } from '../../../contextos/Notificacoes';
import {
  useAtividades,
  useCategoriasExtra,
  useConverterOportunidade,
  useExcluirOportunidade,
  useMapaCategoriasExtra,
  useOportunidades,
} from '../../../hooks/useExtracurriculares';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { formatarData, hojeISO } from '../../../lib/datas';
import { traduzirErro } from '../../../lib/erros';
import { rotuloStatusOportunidade, situacaoOportunidade } from '../../../lib/extracurriculares';
import type { Oportunidade } from '../../../tipos/dominio';

type Filtro = 'ativas' | 'abertas' | 'encerradas' | 'todas';

const FILTROS: [Filtro, string][] = [
  ['ativas', 'Acompanhando'],
  ['abertas', 'Inscrições abertas'],
  ['encerradas', 'Encerradas'],
  ['todas', 'Todas'],
];

export default function OportunidadesExtracurriculares() {
  useTituloPagina('Oportunidades e prazos');
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const { data: oportunidades, isPending, isError, error, refetch } = useOportunidades();
  const { data: atividades = [] } = useAtividades();
  const { data: listaCategorias = [] } = useCategoriasExtra();
  const categorias = useMapaCategoriasExtra();
  const converter = useConverterOportunidade();
  const excluir = useExcluirOportunidade();
  const [filtro, setFiltro] = useState<Filtro>('ativas');
  const [categoria, setCategoria] = useState('');
  const [formulario, setFormulario] = useState<{ aberto: boolean; oportunidade: Oportunidade | null }>({ aberto: false, oportunidade: null });
  const [excluindo, setExcluindo] = useState<Oportunidade | null>(null);
  const [convertendo, setConvertendo] = useState<string | null>(null);
  const hoje = hojeISO();

  const atividadePorOportunidade = useMemo(
    () => new Map(atividades.filter((a) => a.oportunidade_id).map((a) => [a.oportunidade_id!, a])),
    [atividades],
  );

  const visiveis = useMemo(() => {
    const ordem = { encerrando: 0, aberta: 1, abre_em_breve: 2, sem_datas: 3, encerrada: 4 };
    return (oportunidades ?? [])
      .map((op) => ({ op, situacao: situacaoOportunidade(op, hoje) }))
      .filter(({ op, situacao }) => {
        if (categoria && op.categoria_id !== categoria) return false;
        const pendente = op.status_inscricao === 'acompanhando' || op.status_inscricao === 'preparando';
        if (filtro === 'ativas') return situacao.chave !== 'encerrada' && op.status_inscricao !== 'desistiu' && op.status_inscricao !== 'nao_aprovado';
        if (filtro === 'abertas') return pendente && (situacao.chave === 'aberta' || situacao.chave === 'encerrando');
        if (filtro === 'encerradas') return situacao.chave === 'encerrada';
        return true;
      })
      .sort(
        (a, b) =>
          ordem[a.situacao.chave] - ordem[b.situacao.chave] ||
          (a.op.data_encerramento ?? '9999').localeCompare(b.op.data_encerramento ?? '9999') ||
          a.op.titulo.localeCompare(b.op.titulo, 'pt-BR'),
      );
  }, [oportunidades, filtro, categoria, hoje]);

  async function acompanhar(op: Oportunidade) {
    if (convertendo) return;
    setConvertendo(op.id);
    try {
      const jaExistia = atividadePorOportunidade.has(op.id);
      const atividade = await converter.mutateAsync(op.id);
      avisos.sucesso(jaExistia ? 'Esta oportunidade já virou uma atividade.' : 'Atividade criada a partir da oportunidade.');
      navegar(`/app/extracurriculares/atividades/${atividade.id}`);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    } finally {
      setConvertendo(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      avisos.sucesso('Oportunidade excluída.');
      setExcluindo(null);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  if (isPending) return <Carregando />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filtrar oportunidades" className="inline-flex flex-wrap rounded-lg bg-stone-100 p-1">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filtro === valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <SelecaoCompacta rotulo="Filtrar por categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {listaCategorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </SelecaoCompacta>
        <Botao className="ml-auto" icone={<Plus aria-hidden className="size-4" />} onClick={() => setFormulario({ aberto: true, oportunidade: null })}>
          Nova oportunidade
        </Botao>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-xl bg-stone-100/70 px-3 py-2 text-xs leading-5 text-stone-600">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Você cadastra as oportunidades e as datas; os alertas aparecem aqui e no painel. Não há aviso por e-mail ou celular nesta versão.
      </p>

      {visiveis.length === 0 ? (
        <EstadoVazio
          icone={<Megaphone aria-hidden className="size-5" />}
          titulo={oportunidades.length ? 'Nada neste filtro' : 'Nenhuma oportunidade cadastrada'}
          descricao={
            oportunidades.length
              ? 'Tente outro filtro.'
              : 'Viu o edital de uma liga, a chamada de resumos de um congresso ou uma bolsa? Cadastre aqui com as datas para não perder o prazo.'
          }
          acao={
            !oportunidades.length && (
              <Botao variante="suave" onClick={() => setFormulario({ aberto: true, oportunidade: null })}>
                Cadastrar oportunidade
              </Botao>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visiveis.map(({ op, situacao }) => {
            const cat = categorias.get(op.categoria_id);
            const atividade = atividadePorOportunidade.get(op.id);
            return (
              <li key={op.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-cartao">
                <div className="flex items-start gap-3">
                  <SeloCategoria categoria={cat} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-stone-900">{op.titulo}</h3>
                    {op.instituicao && <p className="text-sm text-stone-500">{op.instituicao}</p>}
                  </div>
                  <BotaoIcone rotulo={`Editar ${op.titulo}`} onClick={() => setFormulario({ aberto: true, oportunidade: op })}>
                    <Pencil aria-hidden className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone rotulo={`Excluir ${op.titulo}`} onClick={() => setExcluindo(op)} className="hover:text-red-600">
                    <Trash2 aria-hidden className="size-4" />
                  </BotaoIcone>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Etiqueta tom={situacao.tom}>{situacao.rotulo}</Etiqueta>
                  <EtiquetaCategoria categoria={cat} />
                  <Etiqueta>{rotuloStatusOportunidade(op.status_inscricao)}</Etiqueta>
                </div>
                {(op.data_abertura || op.data_encerramento) && (
                  <p className="inline-flex items-center gap-1.5 text-sm text-stone-600">
                    <CalendarClock aria-hidden className="size-4 text-stone-400" />
                    {op.data_abertura && `De ${formatarData(op.data_abertura, "d 'de' MMM")}`}
                    {op.data_abertura && op.data_encerramento && ' '}
                    {op.data_encerramento && `${op.data_abertura ? 'até' : 'Até'} ${formatarData(op.data_encerramento, "d 'de' MMM 'de' yyyy")}`}
                  </p>
                )}
                {(op.requisitos || op.documentos_necessarios) && (
                  <details className="text-sm text-stone-600">
                    <summary className="cursor-pointer font-medium text-stone-700">Requisitos e documentos</summary>
                    {op.requisitos && <p className="mt-2 whitespace-pre-line"><strong className="font-medium">Requisitos:</strong> {op.requisitos}</p>}
                    {op.documentos_necessarios && (
                      <p className="mt-2 whitespace-pre-line">
                        <strong className="font-medium">Documentos:</strong> {op.documentos_necessarios}
                      </p>
                    )}
                  </details>
                )}
                {op.observacoes && <p className="text-sm whitespace-pre-line text-stone-500">{op.observacoes}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                  {op.link && (
                    <a href={op.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900">
                      Link oficial <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  )}
                  {atividade ? (
                    <Link to={`/app/extracurriculares/atividades/${atividade.id}`} className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-vinho-700 hover:underline">
                      Ver atividade <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  ) : (
                    <Botao variante="suave" tamanho="sm" className="ml-auto" carregando={convertendo === op.id} onClick={() => acompanhar(op)}>
                      Acompanhar como atividade
                    </Botao>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormularioOportunidade
        aberto={formulario.aberto}
        oportunidade={formulario.oportunidade}
        aoFechar={() => setFormulario({ aberto: false, oportunidade: null })}
      />
      <Confirmacao
        aberto={!!excluindo}
        titulo="Excluir oportunidade?"
        mensagem={`"${excluindo?.titulo ?? ''}" será removida. Se ela já virou uma atividade, a atividade continua.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
