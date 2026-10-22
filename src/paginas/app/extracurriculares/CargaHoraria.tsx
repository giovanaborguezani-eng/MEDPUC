import { BadgeCheck, Clock, FileWarning, Info, Landmark, Target } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { lerHoras } from '../../../componentes/extracurriculares/FormularioAtividade';
import { Indicador, SeloCategoria } from '../../../componentes/extracurriculares/Visuais';
import { Botao } from '../../../componentes/ui/Botao';
import { AreaTexto, Campo } from '../../../componentes/ui/Campos';
import { Carregando, EstadoVazio, MensagemErro } from '../../../componentes/ui/Estados';
import { BarraProgresso, CabecalhoCartao, Cartao, Etiqueta } from '../../../componentes/ui/Visuais';
import { useNotificacoes } from '../../../contextos/Notificacoes';
import {
  useAtividades,
  useDocumentosExtra,
  useMapaCategoriasExtra,
  useMetaExtra,
  useSalvarMetaExtra,
} from '../../../hooks/useExtracurriculares';
import { useTituloPagina } from '../../../hooks/useUtilitarios';
import { formatarDataCurta, hojeISO } from '../../../lib/datas';
import { traduzirErro } from '../../../lib/erros';
import { atividadesComprovadas, formatarHoras, resumoHoras } from '../../../lib/extracurriculares';
import { tamanhoMaximo } from '../../../lib/validacao';
import type { MetaExtra } from '../../../tipos/dominio';

export default function CargaHoraria() {
  useTituloPagina('Carga horária');
  const atividades = useAtividades();
  const documentos = useDocumentosExtra();
  const meta = useMetaExtra();
  const categorias = useMapaCategoriasExtra();

  const resumo = useMemo(() => resumoHoras(atividades.data ?? [], documentos.data ?? []), [atividades.data, documentos.data]);
  const comprovadas = useMemo(() => atividadesComprovadas(documentos.data ?? []), [documentos.data]);

  const consultas = [atividades, documentos, meta];
  if (consultas.some((c) => c.isPending)) return <Carregando />;
  const falha = consultas.find((c) => c.isError);
  if (falha) return <MensagemErro erro={falha.error} aoTentarNovamente={() => consultas.forEach((c) => c.refetch())} />;

  const comHoras = (atividades.data ?? []).filter(
    (a) => a.status !== 'cancelado' && (Number(a.horas_realizadas) > 0 || Number(a.horas_previstas) > 0 || a.horas_aceitas !== null),
  );
  const maior = Math.max(1, ...resumo.porCategoria.map((c) => Math.max(c.realizadas, c.previstas)));

  return (
    <div className="space-y-6">
      <section aria-label="Totais de horas" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Indicador rotulo="Previstas" valor={formatarHoras(resumo.previstas)} icone={<Target aria-hidden className="size-4" />} />
        <Indicador rotulo="Realizadas" valor={formatarHoras(resumo.realizadas)} icone={<Clock aria-hidden className="size-4" />} />
        <Indicador
          rotulo="Comprovadas"
          valor={formatarHoras(resumo.comprovadas)}
          icone={<BadgeCheck aria-hidden className="size-4" />}
          detalhe="Com certificado ou declaração anexados"
        />
        <Indicador
          rotulo="Sem comprovante"
          valor={formatarHoras(resumo.pendentes)}
          icone={<FileWarning aria-hidden className="size-4" />}
          detalhe="Realizadas, ainda sem documento"
          destaque={resumo.pendentes > 0}
        />
        <Indicador
          rotulo="Aceitas pela instituição"
          valor={formatarHoras(resumo.aceitas)}
          icone={<Landmark aria-hidden className="size-4" />}
          detalhe="Informadas por você após validação"
        />
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <Info aria-hidden className="mt-1 size-4 shrink-0" />
        A aceitação de certificados e horas como atividades complementares depende das regras da sua instituição e do seu curso. Horas realizadas
        ou comprovadas aqui não significam horas aceitas: confira o regulamento e registre como "aceitas" só o que for validado.
      </p>

      <FormularioMeta meta={meta.data ?? null} realizadas={resumo.realizadas} aceitas={resumo.aceitas} />

      <Cartao>
        <CabecalhoCartao titulo="Distribuição por categoria" />
        <div className="px-5 pb-5">
          {resumo.porCategoria.length === 0 ? (
            <p className="text-sm text-stone-500">Nenhuma hora registrada ainda.</p>
          ) : (
            <ul className="space-y-4">
              {resumo.porCategoria.map((g) => {
                const categoria = categorias.get(g.categoriaId);
                return (
                  <li key={g.categoriaId}>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
                      <SeloCategoria categoria={categoria} tamanho="sm" />
                      <span className="flex-1 text-stone-700">{categoria?.nome ?? g.categoriaId}</span>
                      <span className="text-stone-500 tabular-nums">
                        {formatarHoras(g.realizadas)} realizadas · {formatarHoras(g.comprovadas)} comprovadas
                        {g.previstas > 0 && ` · ${formatarHoras(g.previstas)} previstas`}
                      </span>
                    </div>
                    <BarraProgresso
                      percentual={(g.realizadas / maior) * 100}
                      cor={categoria?.cor}
                      rotulo={`${categoria?.nome ?? g.categoriaId}: ${formatarHoras(g.realizadas)} realizadas`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Horas por atividade" />
        {comHoras.length === 0 ? (
          <div className="px-5 pb-5">
            <EstadoVazio compacto titulo="Nenhuma atividade com horas" descricao="Informe as horas previstas e realizadas no cadastro de cada atividade." />
          </div>
        ) : (
          <div className="overflow-x-auto px-2 pb-3">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Carga horária de cada atividade</caption>
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th scope="col" className="px-3 py-2 font-medium">Atividade</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Prevista</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Realizada</th>
                  <th scope="col" className="px-3 py-2 font-medium">Comprovante</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Aceita</th>
                </tr>
              </thead>
              <tbody>
                {comHoras.map((a) => (
                  <tr key={a.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2">
                      <Link to={`/app/extracurriculares/atividades/${a.id}`} className="font-medium text-stone-800 hover:text-vinho-700">
                        {a.titulo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.horas_previstas === null ? '—' : formatarHoras(a.horas_previstas)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatarHoras(a.horas_realizadas)}</td>
                    <td className="px-3 py-2">
                      {comprovadas.has(a.id) ? <Etiqueta tom="verde">Anexado</Etiqueta> : <Etiqueta tom="ambar">Pendente</Etiqueta>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{a.horas_aceitas === null ? 'Não validada' : formatarHoras(a.horas_aceitas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}

function FormularioMeta({ meta, realizadas, aceitas }: { meta: MetaExtra | null; realizadas: number; aceitas: number }) {
  const avisos = useNotificacoes();
  const salvar = useSalvarMetaExtra();
  const [metaHoras, setMetaHoras] = useState('');
  const [exigencia, setExigencia] = useState('');
  const [fonte, setFonte] = useState('');
  const [verificada, setVerificada] = useState(false);
  const [erros, setErros] = useState<{ meta?: string; exigencia?: string; fonte?: string }>({});

  useEffect(() => {
    setMetaHoras(meta?.meta_horas ? String(meta.meta_horas) : '');
    setExigencia(meta?.exigencia_horas ? String(meta.exigencia_horas) : '');
    setFonte(meta?.exigencia_fonte ?? '');
    setVerificada(Boolean(meta?.exigencia_verificada_em));
  }, [meta]);

  const validarPositivo = (valor: string) => {
    const n = lerHoras(valor);
    if (n === null) return undefined;
    if (Number.isNaN(n) || n <= 0 || n > 10000) return 'Use um número entre 1 e 10.000.';
    return undefined;
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (salvar.isPending) return;
    const temExigencia = lerHoras(exigencia) !== null;
    const novos = {
      meta: validarPositivo(metaHoras),
      exigencia: validarPositivo(exigencia),
      fonte: temExigencia && !fonte.trim() ? 'Informe de onde vem a regra (regulamento, edital, coordenação).' : tamanhoMaximo(fonte, 500),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    try {
      await salvar.mutateAsync({
        meta_horas: lerHoras(metaHoras),
        exigencia_horas: temExigencia ? lerHoras(exigencia) : null,
        exigencia_fonte: temExigencia ? fonte : null,
        exigencia_verificada_em: temExigencia && verificada ? (meta?.exigencia_verificada_em ?? hojeISO()) : null,
      });
      avisos.sucesso('Metas salvas.');
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  const metaNum = Number(meta?.meta_horas) || 0;
  const exigenciaNum = Number(meta?.exigencia_horas) || 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cartao>
        <CabecalhoCartao titulo="Meta pessoal" icone={<Target aria-hidden className="size-4" />} />
        <div className="space-y-3 px-5 pb-5">
          {metaNum > 0 ? (
            <>
              <p className="text-sm text-stone-600">
                <strong className="font-serif text-xl text-stone-900">{formatarHoras(realizadas)}</strong> de {formatarHoras(metaNum)} realizadas
              </p>
              <BarraProgresso percentual={(realizadas / metaNum) * 100} rotulo="Progresso da meta pessoal de horas" />
            </>
          ) : (
            <p className="text-sm text-stone-500">Defina quantas horas extracurriculares você quer alcançar.</p>
          )}
        </div>
      </Cartao>
      <Cartao>
        <CabecalhoCartao titulo="Exigência institucional" icone={<Landmark aria-hidden className="size-4" />} />
        <div className="space-y-3 px-5 pb-5">
          {exigenciaNum > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Etiqueta tom="azul">Regra cadastrada por você</Etiqueta>
                {meta?.exigencia_verificada_em ? (
                  <Etiqueta tom="verde">Verificada em {formatarDataCurta(meta.exigencia_verificada_em)}</Etiqueta>
                ) : (
                  <Etiqueta tom="ambar">Não verificada</Etiqueta>
                )}
              </div>
              <p className="text-sm text-stone-600">
                <strong className="font-serif text-xl text-stone-900">{formatarHoras(aceitas)}</strong> aceitas de {formatarHoras(exigenciaNum)} exigidas
              </p>
              <BarraProgresso percentual={(aceitas / exigenciaNum) * 100} rotulo="Horas aceitas em relação à exigência cadastrada" />
              <p className="text-xs text-stone-500">Fonte: {meta?.exigencia_fonte}</p>
            </>
          ) : (
            <p className="text-sm text-stone-500">
              Nenhuma exigência cadastrada. O MedPUC não presume regras de horas complementares: se o seu curso tiver uma, cadastre abaixo com a fonte.
            </p>
          )}
        </div>
      </Cartao>

      <form onSubmit={enviar} noValidate className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-cartao lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold tracking-wide text-stone-500 uppercase">Configurar metas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Meta pessoal de horas" inputMode="decimal" value={metaHoras} onChange={(e) => setMetaHoras(e.target.value)} erro={erros.meta} opcional />
          <Campo
            rotulo="Horas exigidas pela instituição"
            inputMode="decimal"
            value={exigencia}
            onChange={(e) => setExigencia(e.target.value)}
            erro={erros.exigencia}
            dica="Só preencha se tiver conferido a regra oficial."
            opcional
          />
          <AreaTexto
            rotulo="Fonte da regra"
            rows={2}
            className="md:col-span-2"
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
            erro={erros.fonte}
            placeholder="Ex.: Regulamento de Atividades Complementares do curso, versão 2025, art. 4º"
            opcional
          />
          <label className="flex items-start gap-2 text-sm text-stone-700 md:col-span-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-vinho-600" checked={verificada} onChange={(e) => setVerificada(e.target.checked)} />
            Conferi esta exigência no documento oficial
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Botao type="submit" carregando={salvar.isPending}>
            Salvar metas
          </Botao>
        </div>
      </form>
    </div>
  );
}
