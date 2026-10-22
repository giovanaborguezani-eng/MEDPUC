import { BriefcaseBusiness, CalendarRange, LayoutGrid, ListFilter, Plus, Rows3, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CartaoAtividade } from '../../../componentes/extracurriculares/CartaoAtividade';
import { EtiquetaStatus, SeloCategoria } from '../../../componentes/extracurriculares/Visuais';
import { Botao } from '../../../componentes/ui/Botao';
import { Campo, SelecaoCompacta } from '../../../componentes/ui/Campos';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import {
  useAtividades,
  useCategoriasExtra,
  useDocumentosExtra,
  useMapaCategoriasExtra,
} from '../../../hooks/useExtracurriculares';
import { useDebounce, useTituloPagina } from '../../../hooks/useUtilitarios';
import { formatarData, hojeISO } from '../../../lib/datas';
import {
  descreverPeriodo,
  filtrarAtividades,
  filtrosAtivos,
  FILTROS_VAZIOS,
  linhaDoTempo,
  ORDENS,
  ordenarAtividades,
  ROTULOS_STATUS,
  STATUS_PADRAO,
  STATUS_PUBLICACAO,
  valoresDistintos,
  type FiltrosAtividades,
  type OrdemAtividades,
} from '../../../lib/extracurriculares';
import type { Atividade, CategoriaExtra, StatusAtividade } from '../../../tipos/dominio';
import { useNovaAtividade } from './Layout';

type Modo = 'todos' | 'categoria' | 'linha';

const MODOS: { valor: Modo; rotulo: string; icone: typeof LayoutGrid }[] = [
  { valor: 'todos', rotulo: 'Todos', icone: LayoutGrid },
  { valor: 'categoria', rotulo: 'Por categoria', icone: Rows3 },
  { valor: 'linha', rotulo: 'Linha do tempo', icone: CalendarRange },
];

const TODOS_STATUS = [...new Set([...STATUS_PADRAO, ...STATUS_PUBLICACAO])];

export default function AtividadesExtracurriculares() {
  useTituloPagina('Atividades extracurriculares');
  const novaAtividade = useNovaAtividade();
  const [parametros, setParametros] = useSearchParams();
  const modo = (MODOS.find((m) => m.valor === parametros.get('modo'))?.valor ?? 'todos') as Modo;
  const { data: atividades, isPending, isError, error, refetch } = useAtividades();
  const { data: listaCategorias = [] } = useCategoriasExtra();
  const categorias = useMapaCategoriasExtra();
  const { data: documentos = [] } = useDocumentosExtra();
  const [filtros, setFiltros] = useState<FiltrosAtividades>(() => ({ ...FILTROS_VAZIOS, categoria: parametros.get('categoria') ?? '' }));
  const [ordem, setOrdem] = useState<OrdemAtividades>('atualizacao');
  const [mostrarFiltros, setMostrarFiltros] = useState(Boolean(parametros.get('categoria')));
  const busca = useDebounce(filtros.busca, 200);
  const hoje = hojeISO();

  const visiveis = useMemo(
    () => ordenarAtividades(filtrarAtividades(atividades ?? [], { ...filtros, busca }), ordem, hoje),
    [atividades, filtros, busca, ordem, hoje],
  );
  const docsPorAtividade = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of documentos) mapa.set(d.atividade_id, (mapa.get(d.atividade_id) ?? 0) + 1);
    return mapa;
  }, [documentos]);

  function mudar<K extends keyof FiltrosAtividades>(campo: K, valor: FiltrosAtividades[K]) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  function mudarModo(valor: Modo) {
    const proximos = new URLSearchParams(parametros);
    proximos.set('modo', valor);
    setParametros(proximos, { replace: true });
  }

  if (isPending) return <Carregando />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  if (!atividades.length) {
    return (
      <EstadoVazio
        icone={<BriefcaseBusiness aria-hidden className="size-5" />}
        titulo="Nenhuma atividade cadastrada"
        descricao="Comece pela atividade em que você está agora: uma liga, uma monitoria, um projeto de extensão."
        acao={
          <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => novaAtividade()}>
            Adicionar atividade
          </Botao>
        }
      />
    );
  }

  const ativos = filtrosAtivos(filtros);
  const instituicoes = valoresDistintos(atividades, 'instituicao');
  const areas = valoresDistintos(atividades, 'area_interesse');

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            aria-label="Pesquisar atividades"
            placeholder="Pesquisar nome, instituição, descrição, tag"
            value={filtros.busca}
            onChange={(e) => mudar('busca', e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-300 bg-white pr-3 pl-9 text-sm shadow-sm placeholder:text-stone-400 focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Modo de visualização" className="inline-flex rounded-lg bg-stone-100 p-1">
            {MODOS.map(({ valor, rotulo, icone: Icone }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={modo === valor}
                onClick={() => mudarModo(valor)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  modo === valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icone aria-hidden className="size-4" />
                <span className="hidden sm:inline">{rotulo}</span>
                <span className="sr-only sm:hidden">{rotulo}</span>
              </button>
            ))}
          </div>
          <SelecaoCompacta rotulo="Ordenar por" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemAtividades)}>
            {ORDENS.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </SelecaoCompacta>
          <Botao
            variante="secundario"
            onClick={() => setMostrarFiltros((m) => !m)}
            aria-expanded={mostrarFiltros}
            aria-controls="filtros-extra"
            icone={<ListFilter aria-hidden className="size-4" />}
          >
            Filtros{ativos ? ` (${ativos})` : ''}
          </Botao>
        </div>
      </div>

      {mostrarFiltros && (
        <div id="filtros-extra" className="mb-4 grid animate-surgir gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-cartao sm:grid-cols-2 lg:grid-cols-4">
          <SelecaoCompacta rotulo="Categoria" value={filtros.categoria} onChange={(e) => mudar('categoria', e.target.value)}>
            <option value="">Todas as categorias</option>
            {listaCategorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </SelecaoCompacta>
          <SelecaoCompacta rotulo="Status" value={filtros.status} onChange={(e) => mudar('status', e.target.value as StatusAtividade | '')}>
            <option value="">Qualquer status</option>
            {TODOS_STATUS.map((s) => (
              <option key={s} value={s}>
                {ROTULOS_STATUS[s]}
              </option>
            ))}
          </SelecaoCompacta>
          <SelecaoCompacta rotulo="Instituição" value={filtros.instituicao} onChange={(e) => mudar('instituicao', e.target.value)}>
            <option value="">Todas as instituições</option>
            {instituicoes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </SelecaoCompacta>
          <SelecaoCompacta rotulo="Área de interesse" value={filtros.area} onChange={(e) => mudar('area', e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </SelecaoCompacta>
          <div role="group" aria-label="Situação" className="inline-flex w-fit rounded-lg bg-stone-100 p-1">
            {(
              [
                ['todas', 'Todas'],
                ['andamento', 'Em andamento'],
                ['concluidas', 'Concluídas'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={filtros.situacao === valor}
                onClick={() => mudar('situacao', valor)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${filtros.situacao === valor ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <Campo rotulo="Período: de" type="date" value={filtros.de} onChange={(e) => mudar('de', e.target.value)} />
          <Campo rotulo="Período: até" type="date" value={filtros.ate} onChange={(e) => mudar('ate', e.target.value)} />
          {ativos > 0 && (
            <button
              type="button"
              onClick={() => setFiltros({ ...FILTROS_VAZIOS, busca: filtros.busca })}
              className="self-end justify-self-start pb-2 text-sm font-medium text-vinho-700 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <p className="mb-3 text-sm text-stone-500" aria-live="polite">
        {visiveis.length === atividades.length
          ? `${atividades.length} ${atividades.length === 1 ? 'atividade' : 'atividades'}`
          : `${visiveis.length} de ${atividades.length} atividades`}
      </p>

      {visiveis.length === 0 ? (
        <EstadoVazio compacto titulo="Nenhuma atividade encontrada" descricao="Ajuste a pesquisa ou os filtros." />
      ) : modo === 'categoria' ? (
        <PorCategoria atividades={visiveis} categorias={listaCategorias} documentos={docsPorAtividade} />
      ) : modo === 'linha' ? (
        <LinhaDoTempo atividades={visiveis} categorias={categorias} />
      ) : (
        <Grade atividades={visiveis} categorias={categorias} documentos={docsPorAtividade} />
      )}
    </div>
  );
}

function Grade({
  atividades,
  categorias,
  documentos,
}: {
  atividades: Atividade[];
  categorias: Map<string, CategoriaExtra>;
  documentos: Map<string, number>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {atividades.map((a) => (
        <CartaoAtividade key={a.id} atividade={a} categoria={categorias.get(a.categoria_id)} documentos={documentos.get(a.id)} />
      ))}
    </div>
  );
}

function PorCategoria({
  atividades,
  categorias,
  documentos,
}: {
  atividades: Atividade[];
  categorias: CategoriaExtra[];
  documentos: Map<string, number>;
}) {
  const mapa = new Map(categorias.map((c) => [c.id, c]));
  const grupos = categorias
    .map((categoria) => ({ categoria, itens: atividades.filter((a) => a.categoria_id === categoria.id) }))
    .filter((g) => g.itens.length);
  return (
    <div className="space-y-8">
      {grupos.map(({ categoria, itens }) => (
        <section key={categoria.id} aria-labelledby={`grupo-${categoria.id}`}>
          <h2 id={`grupo-${categoria.id}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-stone-800">
            <SeloCategoria categoria={categoria} tamanho="sm" />
            {categoria.nome}
            <span className="text-sm font-normal text-stone-500">({itens.length})</span>
          </h2>
          <Grade atividades={itens} categorias={mapa} documentos={documentos} />
        </section>
      ))}
    </div>
  );
}

function LinhaDoTempo({ atividades, categorias }: { atividades: Atividade[]; categorias: Map<string, CategoriaExtra> }) {
  const grupos = linhaDoTempo(atividades);
  return (
    <div className="space-y-8">
      {grupos.map((grupo) => (
        <section key={grupo.ano} aria-labelledby={`ano-${grupo.ano}`}>
          <h2 id={`ano-${grupo.ano}`} className="mb-3 font-serif text-xl font-semibold text-stone-900">
            {grupo.ano}
          </h2>
          <ol className="relative ml-3 space-y-4 border-l-2 border-stone-200 pl-6">
            {grupo.itens.map(({ atividade, data, informada }) => {
              const categoria = categorias.get(atividade.categoria_id);
              const periodo = descreverPeriodo(atividade);
              return (
                <li key={atividade.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-3 -left-[33px] size-4 rounded-full border-4 border-papel"
                    style={{ backgroundColor: categoria?.cor ?? '#78716C' }}
                  />
                  <Link
                    to={`/app/extracurriculares/atividades/${atividade.id}`}
                    className="block rounded-2xl border border-stone-200/80 bg-white p-4 shadow-cartao transition-shadow hover:shadow-flutuante"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <time dateTime={data}>{informada ? formatarData(data, "MMM 'de' yyyy") : 'Data não informada'}</time>
                      <span aria-hidden>·</span>
                      <span>{categoria?.nome}</span>
                    </div>
                    <p className="mt-1 font-semibold text-stone-900">{atividade.titulo}</p>
                    {(atividade.instituicao || periodo) && (
                      <p className="mt-0.5 text-sm text-stone-500">{[atividade.instituicao, periodo].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="mt-2">
                      <EtiquetaStatus status={atividade.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
