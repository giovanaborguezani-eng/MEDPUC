import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { SeletorStatus } from '../../../componentes/extracurriculares/CartaoAtividade';
import { DocumentosAtividade } from '../../../componentes/extracurriculares/DocumentosAtividade';
import { FormularioAtividade } from '../../../componentes/extracurriculares/FormularioAtividade';
import { EtiquetaCategoria, EtiquetaStatus, SeloCategoria } from '../../../componentes/extracurriculares/Visuais';
import { Botao } from '../../../componentes/ui/Botao';
import { Confirmacao } from '../../../componentes/ui/Confirmacao';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { CabecalhoCartao, Cartao, Etiqueta } from '../../../componentes/ui/Visuais';
import { useNotificacoes } from '../../../contextos/Notificacoes';
import { useAtividades, useExcluirAtividade, useMapaCategoriasExtra, useOportunidades } from '../../../hooks/useExtracurriculares';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { formatarDataCurta } from '../../../lib/datas';
import { traduzirErro } from '../../../lib/erros';
import { camposDaCategoria, descreverPeriodo, formatarHoras, lerDetalhes, textoDoCampo } from '../../../lib/extracurriculares';
import { rotuloPrioridade } from '../../../tipos/dominio';

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-sm text-stone-500">{rotulo}</dt>
      <dd className="text-sm break-words whitespace-pre-line text-stone-800">{children}</dd>
    </div>
  );
}

export default function PaginaAtividade() {
  const { id } = useParams();
  const navegar = useNavigate();
  const avisos = useNotificacoes();
  const { data: atividades, isPending, isError, error, refetch } = useAtividades();
  const { data: oportunidades = [] } = useOportunidades();
  const categorias = useMapaCategoriasExtra();
  const excluir = useExcluirAtividade();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const atividade = atividades?.find((a) => a.id === id);
  useTituloPagina(atividade?.titulo ?? 'Atividade');

  if (isPending) return <Carregando />;
  if (isError) return <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />;
  if (!atividade) {
    return (
      <EstadoVazio
        titulo="Atividade não encontrada"
        descricao="Ela pode ter sido excluída."
        acao={
          <Link to="/app/extracurriculares/atividades" className="text-sm font-medium text-vinho-700 hover:underline">
            Ver minhas atividades
          </Link>
        }
      />
    );
  }

  const categoria = categorias.get(atividade.categoria_id);
  const detalhes = lerDetalhes(atividade.detalhes);
  const especificos = camposDaCategoria(categoria)
    .map((campo) => ({ campo, texto: textoDoCampo(campo, detalhes[campo.chave]) }))
    .filter((x) => x.texto);
  const origem = atividade.oportunidade_id ? oportunidades.find((o) => o.id === atividade.oportunidade_id) : null;
  const periodo = descreverPeriodo(atividade);

  async function confirmarExclusao() {
    try {
      await excluir.mutateAsync(atividade!.id);
      avisos.sucesso('Atividade excluída.');
      navegar('/app/extracurriculares/atividades', { replace: true });
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/extracurriculares/atividades"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
      >
        <ArrowLeft aria-hidden className="size-4" /> Todas as atividades
      </Link>

      <header className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-cartao sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <SeloCategoria categoria={categoria} />
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">{atividade.titulo}</h2>
            {atividade.instituicao && <p className="mt-0.5 text-stone-500">{atividade.instituicao}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <EtiquetaCategoria categoria={categoria} />
              <EtiquetaStatus status={atividade.status} />
              <Etiqueta tom={atividade.prioridade === 'alta' ? 'vermelho' : atividade.prioridade === 'media' ? 'ambar' : 'neutro'}>
                Prioridade {rotuloPrioridade(atividade.prioridade).toLowerCase()}
              </Etiqueta>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SeletorStatus atividade={atividade} categoria={categoria} className="h-10 text-sm" />
            <Botao variante="secundario" icone={<Pencil aria-hidden className="size-4" />} onClick={() => setEditando(true)}>
              Editar
            </Botao>
            <Botao
              variante="fantasma"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              icone={<Trash2 aria-hidden className="size-4" />}
              onClick={() => setConfirmando(true)}
            >
              Excluir
            </Botao>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] *:min-w-0">
        <Cartao>
          <CabecalhoCartao titulo="Informações" />
          <dl className="divide-y divide-stone-100 px-5 pb-4">
            <Linha rotulo="Período">{periodo ?? 'Não informado'}</Linha>
            {atividade.area_interesse && <Linha rotulo="Área de interesse">{atividade.area_interesse}</Linha>}
            {atividade.descricao && <Linha rotulo="Descrição">{atividade.descricao}</Linha>}
            {especificos.map(({ campo, texto }) => (
              <Linha key={campo.chave} rotulo={campo.rotulo}>
                {campo.tipo === 'url' ? (
                  <a href={texto!} target="_blank" rel="noreferrer noopener" className="text-vinho-700 hover:underline">
                    {texto}
                  </a>
                ) : (
                  texto
                )}
              </Linha>
            ))}
            {atividade.link && (
              <Linha rotulo="Link externo">
                <a href={atividade.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-vinho-700 hover:underline">
                  {atividade.link.replace(/^https?:\/\//, '').slice(0, 60)}
                  <ExternalLink aria-hidden className="size-3.5" />
                </a>
              </Linha>
            )}
            {atividade.tags.length > 0 && <Linha rotulo="Tags">{atividade.tags.map((t) => `#${t}`).join('  ')}</Linha>}
            {atividade.observacoes && <Linha rotulo="Observações pessoais">{atividade.observacoes}</Linha>}
            {atividade.oportunidade_id && (
              <Linha rotulo="Origem">
                {origem ? (
                  <Link to="/app/extracurriculares/oportunidades" className="text-vinho-700 hover:underline">
                    Oportunidade "{origem.titulo}"
                  </Link>
                ) : (
                  'Criada a partir de uma oportunidade'
                )}
              </Linha>
            )}
            <Linha rotulo="Última atualização">{formatarDataCurta(atividade.updated_at.slice(0, 10))}</Linha>
          </dl>
        </Cartao>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Carga horária" />
            <dl className="grid grid-cols-3 gap-3 px-5 pb-5 text-center">
              {(
                [
                  ['Prevista', atividade.horas_previstas],
                  ['Realizada', atividade.horas_realizadas],
                  ['Aceita', atividade.horas_aceitas],
                ] as const
              ).map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl bg-stone-50 px-2 py-3">
                  <dt className="text-xs text-stone-500">{rotulo}</dt>
                  <dd className="mt-1 font-serif text-lg font-semibold text-stone-900">{valor === null ? '—' : formatarHoras(valor)}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-5 text-xs leading-5 text-stone-500">
              "Aceita" é a carga validada pela instituição. Fica em branco até você informar a validação.
            </p>
          </Cartao>
          <DocumentosAtividade atividadeId={atividade.id} />
        </div>
      </div>

      <FormularioAtividade aberto={editando} atividade={atividade} aoFechar={() => setEditando(false)} />
      <Confirmacao
        aberto={confirmando}
        titulo="Excluir atividade?"
        mensagem={`"${atividade.titulo}" e todos os documentos anexados a ela serão apagados. Esta ação não pode ser desfeita.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setConfirmando(false)}
      />
    </div>
  );
}
