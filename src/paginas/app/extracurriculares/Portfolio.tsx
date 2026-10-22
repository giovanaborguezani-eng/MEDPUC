import { GraduationCap, Info, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Botao } from '../../../componentes/ui/Botao';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { usePerfil } from '../../../hooks/useConta';
import { useAtividades, useCategoriasExtra, useMapaCategoriasExtra } from '../../../hooks/useExtracurriculares';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { formatarData, hojeISO } from '../../../lib/datas';
import { camposDaCategoria, descreverPeriodo, formatarHoras, lerDetalhes, montarPortfolio, textoDoCampo } from '../../../lib/extracurriculares';
import type { Atividade, CategoriaExtra } from '../../../tipos/dominio';

/** Campos de acompanhamento que não fazem sentido num currículo. */
const FORA_DO_PORTFOLIO = new Set([
  'prazo_inscricao',
  'prazo_submissao',
  'status_inscricao',
  'certificado_recebido',
  'processo_seletivo',
  'marcos',
  'link_documentos',
  'data_submissao',
]);

export default function Portfolio() {
  useTituloPagina('Meu portfólio');
  const { data: perfil } = usePerfil();
  const { data: atividades, isPending, isError, error, refetch } = useAtividades();
  const categorias = useMapaCategoriasExtra();
  const { isPending: carregandoCategorias } = useCategoriasExtra();
  const [mostrarHoras, setMostrarHoras] = useState(true);
  const [mostrarDescricoes, setMostrarDescricoes] = useState(false);
  const secoes = useMemo(() => montarPortfolio(atividades ?? [], categorias), [atividades, categorias]);

  if (isPending || carregandoCategorias) return <Carregando />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;

  const emAndamento = (atividades ?? []).length - secoes.reduce((n, s) => n + s.itens.length, 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-cartao sm:flex-row sm:items-center print:hidden">
        <div className="flex flex-1 flex-wrap gap-4 text-sm text-stone-700">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-vinho-600" checked={mostrarHoras} onChange={(e) => setMostrarHoras(e.target.checked)} />
            Mostrar carga horária
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-vinho-600" checked={mostrarDescricoes} onChange={(e) => setMostrarDescricoes(e.target.checked)} />
            Incluir descrições
          </label>
        </div>
        <Botao icone={<Printer aria-hidden className="size-4" />} onClick={() => window.print()} disabled={!secoes.length}>
          Imprimir ou salvar em PDF
        </Botao>
      </div>

      <p className="mb-6 flex items-start gap-2 text-xs leading-5 text-stone-500 print:hidden">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Entram só atividades com status "Concluído" e publicações "Publicadas"
        {emAndamento > 0 && ` (${emAndamento} ${emAndamento === 1 ? 'atividade ainda não concluída fica' : 'atividades ainda não concluídas ficam'} de fora)`}.
        Observações pessoais, tags e documentos nunca aparecem aqui.
      </p>

      {secoes.length === 0 ? (
        <EstadoVazio
          icone={<GraduationCap aria-hidden className="size-5" />}
          titulo="Seu portfólio ainda está vazio"
          descricao='Quando você marcar uma atividade como "Concluído" (ou uma publicação como "Publicado"), ela aparece aqui, organizada por tipo.'
        />
      ) : (
        <article className="rounded-2xl border border-stone-200/80 bg-white px-6 py-8 shadow-cartao sm:px-10 print:border-0 print:p-0 print:shadow-none">
          <header className="mb-8 border-b-2 border-vinho-600 pb-4">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-stone-900">{perfil?.nome}</h2>
            <p className="mt-1 text-stone-600">
              {[perfil?.curso, perfil?.instituicao, perfil?.periodo ? `${perfil.periodo}º período` : null].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1 text-xs text-stone-400">Portfólio de atividades extracurriculares · {formatarData(hojeISO(), "MMMM 'de' yyyy")}</p>
          </header>
          <div className="space-y-8">
            {secoes.map((secao) => (
              <section key={secao.chave} aria-labelledby={`secao-${secao.chave}`} className="break-inside-avoid-page">
                <h3 id={`secao-${secao.chave}`} className="mb-3 font-serif text-xl font-semibold text-vinho-700">
                  {secao.titulo}
                </h3>
                <ul className="space-y-4">
                  {secao.itens.map((a) => (
                    <ItemPortfolio
                      key={a.id}
                      atividade={a}
                      categoria={categorias.get(a.categoria_id)}
                      mostrarHoras={mostrarHoras}
                      mostrarDescricao={mostrarDescricoes}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      )}
    </div>
  );
}

function ItemPortfolio({
  atividade,
  categoria,
  mostrarHoras,
  mostrarDescricao,
}: {
  atividade: Atividade;
  categoria?: CategoriaExtra;
  mostrarHoras: boolean;
  mostrarDescricao: boolean;
}) {
  const detalhes = lerDetalhes(atividade.detalhes);
  const extras = camposDaCategoria(categoria)
    .filter((c) => !FORA_DO_PORTFOLIO.has(c.chave))
    .map((c) => ({ rotulo: c.rotulo, texto: textoDoCampo(c, detalhes[c.chave]) }))
    .filter((x) => x.texto);
  const periodo = descreverPeriodo(atividade);
  const horas = Number(atividade.horas_realizadas) || 0;

  return (
    <li className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="font-semibold text-stone-900">{atividade.titulo}</p>
        {periodo && <p className="text-sm text-stone-500">{periodo}</p>}
      </div>
      {atividade.instituicao && <p className="text-sm text-stone-600">{atividade.instituicao}</p>}
      {extras.length > 0 && (
        <p className="mt-0.5 text-sm text-stone-600">
          {extras.map((x, i) => (
            <span key={x.rotulo}>
              {i > 0 && ' · '}
              <span className="text-stone-500">{x.rotulo}:</span> {x.texto}
            </span>
          ))}
        </p>
      )}
      {mostrarHoras && horas > 0 && <p className="text-sm text-stone-600">Carga horária realizada: {formatarHoras(horas)}</p>}
      {mostrarDescricao && atividade.descricao && <p className="mt-1 text-sm leading-6 whitespace-pre-line text-stone-700">{atividade.descricao}</p>}
    </li>
  );
}
