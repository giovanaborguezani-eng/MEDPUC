import { CalendarRange, Clock, Paperclip } from 'lucide-react';
import { Link } from 'react-router';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useAtualizarStatusAtividade } from '../../hooks/useExtracurriculares';
import { traduzirErro } from '../../lib/erros';
import { descreverPeriodo, formatarHoras, ROTULOS_STATUS, statusDaCategoria } from '../../lib/extracurriculares';
import type { Atividade, CategoriaExtra, StatusAtividade } from '../../tipos/dominio';
import { EtiquetaCategoria, EtiquetaStatus, SeloCategoria } from './Visuais';

type Props = {
  atividade: Atividade;
  categoria?: CategoriaExtra | null;
  documentos?: number;
};

/** Seletor de status com rótulo acessível; grava na hora (otimista). */
export function SeletorStatus({ atividade, categoria, className = '' }: Props & { className?: string }) {
  const avisos = useNotificacoes();
  const atualizar = useAtualizarStatusAtividade();

  async function mudar(status: StatusAtividade) {
    try {
      await atualizar.mutateAsync({ id: atividade.id, status });
      avisos.sucesso(`Status alterado para "${ROTULOS_STATUS[status]}".`);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <select
      aria-label={`Status de ${atividade.titulo}`}
      value={atividade.status}
      disabled={atualizar.isPending}
      onChange={(e) => mudar(e.target.value as StatusAtividade)}
      className={`h-8 rounded-lg border border-stone-300 bg-white px-2 pr-7 text-xs font-medium text-stone-700 shadow-sm focus:border-vinho-500 focus:outline-none focus:ring-2 focus:ring-vinho-100 disabled:opacity-60 ${className}`}
    >
      {statusDaCategoria(categoria).map((s) => (
        <option key={s} value={s}>
          {ROTULOS_STATUS[s]}
        </option>
      ))}
    </select>
  );
}

export function CartaoAtividade({ atividade, categoria, documentos = 0 }: Props) {
  const periodo = descreverPeriodo(atividade);
  const horas = Number(atividade.horas_realizadas) || 0;
  const previstas = Number(atividade.horas_previstas) || 0;

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-cartao transition-shadow hover:shadow-flutuante">
      <div className="flex items-start gap-3">
        <SeloCategoria categoria={categoria} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-5 font-semibold text-stone-900">
            <Link to={`/app/extracurriculares/atividades/${atividade.id}`} className="rounded hover:text-vinho-700 focus-visible:outline-2">
              {atividade.titulo}
            </Link>
          </h3>
          {atividade.instituicao && <p className="mt-0.5 truncate text-sm text-stone-500">{atividade.instituicao}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <EtiquetaCategoria categoria={categoria} />
        <EtiquetaStatus status={atividade.status} />
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        {periodo && (
          <div className="inline-flex items-center gap-1">
            <dt className="sr-only">Período</dt>
            <CalendarRange aria-hidden className="size-3.5" />
            <dd>{periodo}</dd>
          </div>
        )}
        {(horas > 0 || previstas > 0) && (
          <div className="inline-flex items-center gap-1">
            <dt className="sr-only">Carga horária</dt>
            <Clock aria-hidden className="size-3.5" />
            <dd>
              {formatarHoras(horas)}
              {previstas > 0 && ` de ${formatarHoras(previstas)}`}
            </dd>
          </div>
        )}
        {documentos > 0 && (
          <div className="inline-flex items-center gap-1">
            <dt className="sr-only">Documentos</dt>
            <Paperclip aria-hidden className="size-3.5" />
            <dd>{documentos === 1 ? '1 documento' : `${documentos} documentos`}</dd>
          </div>
        )}
      </dl>

      {atividade.tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-wrap gap-1">
          {atividade.tags.slice(0, 4).map((tag) => (
            <li key={tag} className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
        <SeletorStatus atividade={atividade} categoria={categoria} />
        <Link
          to={`/app/extracurriculares/atividades/${atividade.id}`}
          className="text-sm font-medium text-vinho-700 hover:underline"
          aria-label={`Abrir ${atividade.titulo}`}
        >
          Detalhes
        </Link>
      </div>
    </article>
  );
}
