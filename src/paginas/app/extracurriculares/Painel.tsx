import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CircleCheck,
  Clock,
  Hourglass,
  Megaphone,
  Plus,
  Target,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { EtiquetaStatus, Indicador, SeloCategoria } from '../../../componentes/extracurriculares/Visuais';
import { Botao } from '../../../componentes/ui/Botao';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { BarraProgresso, CabecalhoCartao, Cartao } from '../../../componentes/ui/Visuais';
import {
  useAtividades,
  useDocumentosExtra,
  useMapaCategoriasExtra,
  useOportunidades,
} from '../../../hooks/useExtracurriculares';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { descreverDistancia, diasAte, formatarData, hojeISO } from '../../../lib/datas';
import { formatarHoras, resumoExtra } from '../../../lib/extracurriculares';
import { useNovaAtividade } from './Layout';

export default function PainelExtracurriculares() {
  useTituloPagina('Extracurriculares');
  const novaAtividade = useNovaAtividade();
  const atividades = useAtividades();
  const oportunidades = useOportunidades();
  const documentos = useDocumentosExtra();
  const categorias = useMapaCategoriasExtra();
  const hoje = hojeISO();

  const resumo = useMemo(
    () => resumoExtra(atividades.data ?? [], oportunidades.data ?? [], documentos.data ?? [], hoje),
    [atividades.data, oportunidades.data, documentos.data, hoje],
  );

  const consultas = [atividades, oportunidades, documentos];
  if (consultas.some((c) => c.isPending)) return <Carregando />;
  const falha = consultas.find((c) => c.isError);
  if (falha) return <MensagemErro erro={falha.error} aoTentarNovamente={() => consultas.forEach((c) => c.refetch())} />;

  if (resumo.total === 0 && (oportunidades.data ?? []).length === 0) {
    return (
      <EstadoVazio
        icone={<BriefcaseBusiness aria-hidden className="size-5" />}
        titulo="Sua trajetória começa aqui"
        descricao="Registre a liga em que você entrou, o congresso que quer ir ou o projeto de pesquisa que está começando. Com o tempo, o MedPUC monta seu histórico, suas horas e seu portfólio."
        acao={
          <div className="flex flex-wrap justify-center gap-2">
            <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => novaAtividade()}>
              Adicionar primeira atividade
            </Botao>
            <Link to="oportunidades" className="inline-flex h-10 items-center px-3 text-sm font-medium text-vinho-700 hover:underline">
              Acompanhar uma oportunidade
            </Link>
          </div>
        }
      />
    );
  }

  const maiorCategoria = Math.max(1, ...resumo.porCategoria.map((c) => c.quantidade));

  return (
    <div className="space-y-6">
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador rotulo="Atividades" valor={resumo.total} icone={<BriefcaseBusiness aria-hidden className="size-4" />} />
        <Indicador rotulo="Em andamento" valor={resumo.andamento} icone={<Hourglass aria-hidden className="size-4" />} />
        <Indicador rotulo="Concluídas" valor={resumo.concluidas} icone={<CircleCheck aria-hidden className="size-4" />} />
        <Indicador
          rotulo="Inscrições abertas"
          valor={resumo.oportunidadesAbertas}
          icone={<Megaphone aria-hidden className="size-4" />}
          detalhe="Oportunidades que você acompanha"
          destaque={resumo.oportunidadesAbertas > 0}
        />
        <Indicador rotulo="Horas realizadas" valor={formatarHoras(resumo.horas.realizadas)} icone={<Clock aria-hidden className="size-4" />} />
        <Indicador rotulo="Horas previstas" valor={formatarHoras(resumo.horas.previstas)} icone={<Target aria-hidden className="size-4" />} />
        <Indicador rotulo="Certificados anexados" valor={resumo.certificados} icone={<BadgeCheck aria-hidden className="size-4" />} />
        <Indicador
          rotulo="Próximos prazos"
          valor={resumo.prazos.length}
          icone={<CalendarClock aria-hidden className="size-4" />}
          detalhe={resumo.prazos[0] ? `O próximo é ${descreverDistancia(resumo.prazos[0].data)}` : 'Nenhum prazo cadastrado'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2 *:min-w-0">
        <Cartao>
          <CabecalhoCartao
            titulo="Próximos prazos"
            icone={<CalendarClock aria-hidden className="size-4" />}
            acao={
              <Link to="oportunidades" className="text-sm font-medium text-vinho-700 hover:underline">
                Oportunidades
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {resumo.prazos.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhum prazo futuro. Cadastre oportunidades com as datas de inscrição para acompanhar aqui.</p>
            ) : (
              <ul className="space-y-2">
                {resumo.prazos.slice(0, 6).map((p) => {
                  const dias = diasAte(p.data);
                  return (
                    <li key={p.chave}>
                      <Link
                        to={p.origem === 'atividade' ? `atividades/${p.id}` : 'oportunidades'}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-stone-50"
                      >
                        <span
                          className={`flex w-12 shrink-0 flex-col items-center rounded-lg py-1 text-center ${
                            dias <= 2 ? 'bg-red-50 text-red-700' : dias <= 7 ? 'bg-amber-50 text-amber-800' : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          <span className="text-[10px] font-semibold uppercase">{formatarData(p.data, 'MMM')}</span>
                          <span className="font-serif text-lg leading-5 font-semibold">{formatarData(p.data, 'd')}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-800">{p.titulo}</span>
                          <span className="block text-xs text-stone-500">
                            {p.rotulo} · {descreverDistancia(p.data)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Por categoria" icone={<BriefcaseBusiness aria-hidden className="size-4" />} />
          <div className="px-5 pb-5">
            {resumo.porCategoria.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhuma atividade cadastrada ainda.</p>
            ) : (
              <ul className="space-y-3">
                {resumo.porCategoria.map(({ categoriaId, quantidade }) => {
                  const categoria = categorias.get(categoriaId);
                  return (
                    <li key={categoriaId}>
                      <Link to={`atividades?categoria=${categoriaId}`} className="block rounded-lg hover:bg-stone-50">
                        <div className="mb-1 flex items-center gap-2 text-sm">
                          <SeloCategoria categoria={categoria} tamanho="sm" />
                          <span className="flex-1 truncate text-stone-700">{categoria?.nome ?? categoriaId}</span>
                          <span className="font-medium text-stone-900 tabular-nums">{quantidade}</span>
                        </div>
                        <BarraProgresso
                          percentual={(quantidade / maiorCategoria) * 100}
                          cor={categoria?.cor}
                          rotulo={`${categoria?.nome ?? categoriaId}: ${quantidade}`}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Cartao>
      </div>

      <Cartao>
        <CabecalhoCartao
          titulo="Atividades recentes"
          icone={<Clock aria-hidden className="size-4" />}
          acao={
            <Link to="atividades" className="inline-flex items-center gap-1 text-sm font-medium text-vinho-700 hover:underline">
              Ver todas <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          }
        />
        <ul className="divide-y divide-stone-100 px-2 pb-2">
          {resumo.recentes.map((a) => (
            <li key={a.id}>
              <Link to={`atividades/${a.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-stone-50">
                <SeloCategoria categoria={categorias.get(a.categoria_id)} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-800">{a.titulo}</span>
                  <span className="block truncate text-xs text-stone-500">{categorias.get(a.categoria_id)?.nome}</span>
                </span>
                <EtiquetaStatus status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
