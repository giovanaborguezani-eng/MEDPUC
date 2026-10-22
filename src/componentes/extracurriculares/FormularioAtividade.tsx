/**
 * Cadastro e edição de atividade extracurricular. Os campos gerais ficam
 * sempre visíveis; carga horária, campos da categoria e informações extras
 * ficam em seções que abrem e fecham, para o formulário não ficar longo.
 */

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useAtividades, useCategoriasExtra, useSalvarAtividade } from '../../hooks/useExtracurriculares';
import { traduzirErro } from '../../lib/erros';
import {
  camposDaCategoria,
  lerDetalhes,
  limparDetalhes,
  ROTULOS_STATUS,
  separarTags,
  statusCompativel,
  statusDaCategoria,
  validarTags,
  valoresDistintos,
  type CampoEspecifico,
  type Detalhes,
} from '../../lib/extracurriculares';
import { dataOpcionalValida, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import { PRIORIDADES, type Atividade, type DadosAtividade, type PrioridadeTarefa, type StatusAtividade } from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { AreaTexto, Campo, Selecao } from '../ui/Campos';
import { Modal } from '../ui/Modal';

type Valores = {
  titulo: string;
  categoria_id: string;
  instituicao: string;
  status: StatusAtividade;
  prioridade: PrioridadeTarefa;
  data_inicio: string;
  data_fim: string;
  horas_previstas: string;
  horas_realizadas: string;
  horas_aceitas: string;
  descricao: string;
  area_interesse: string;
  link: string;
  tags: string;
  observacoes: string;
  detalhes: Detalhes;
};

type Erros = Partial<Record<Exclude<keyof Valores, 'detalhes'>, string>> & { detalhes?: Record<string, string> };

const texto = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

function valoresIniciais(atividade?: Atividade | null, categoriaInicial?: string): Valores {
  return {
    titulo: atividade?.titulo ?? '',
    categoria_id: atividade?.categoria_id ?? categoriaInicial ?? '',
    instituicao: atividade?.instituicao ?? '',
    status: atividade?.status ?? 'planejando',
    prioridade: atividade?.prioridade ?? 'media',
    data_inicio: atividade?.data_inicio ?? '',
    data_fim: atividade?.data_fim ?? '',
    horas_previstas: texto(atividade?.horas_previstas),
    horas_realizadas: atividade && Number(atividade.horas_realizadas) > 0 ? texto(atividade.horas_realizadas) : '',
    horas_aceitas: texto(atividade?.horas_aceitas),
    descricao: atividade?.descricao ?? '',
    area_interesse: atividade?.area_interesse ?? '',
    link: atividade?.link ?? '',
    tags: atividade?.tags.join(', ') ?? '',
    observacoes: atividade?.observacoes ?? '',
    detalhes: lerDetalhes(atividade?.detalhes),
  };
}

/** '12,5' → 12.5; '' → null; inválido → NaN. */
export function lerHoras(valor: string): number | null {
  const limpo = valor.trim().replace(',', '.');
  if (!limpo) return null;
  return /^\d+(\.\d{1,2})?$/.test(limpo) ? Number(limpo) : Number.NaN;
}

function validarHoras(valor: string): string | undefined {
  const n = lerHoras(valor);
  if (n === null) return undefined;
  if (Number.isNaN(n)) return 'Use um número, com até duas casas decimais.';
  if (n > 10000) return 'Use no máximo 10.000 horas.';
  return undefined;
}

function validarLink(valor: string): string | undefined {
  if (!valor.trim()) return undefined;
  return /^https?:\/\/\S+\.\S+/i.test(valor.trim()) ? tamanhoMaximo(valor, 1000) : 'Informe um endereço começando com https://';
}

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  atividade?: Atividade | null;
  categoriaInicial?: string;
  aoSalvar?: (atividade: Atividade) => void;
};

export function FormularioAtividade({ aberto, aoFechar, atividade, categoriaInicial, aoSalvar }: Props) {
  const avisos = useNotificacoes();
  const { data: categorias = [] } = useCategoriasExtra();
  const { data: atividades = [] } = useAtividades();
  const salvar = useSalvarAtividade();
  const [valores, setValores] = useState<Valores>(() => valoresIniciais(atividade, categoriaInicial));
  const [erros, setErros] = useState<Erros>({});
  const idListaInstituicoes = useId();
  const idListaAreas = useId();

  useEffect(() => {
    if (aberto) {
      setValores(valoresIniciais(atividade, categoriaInicial));
      setErros({});
    }
  }, [aberto, atividade?.id]);

  const categoria = categorias.find((c) => c.id === valores.categoria_id);
  const campos = camposDaCategoria(categoria);
  const statusPossiveis = statusDaCategoria(categoria);

  function mudar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function mudarCategoria(id: string) {
    const nova = categorias.find((c) => c.id === id);
    setValores((v) => ({ ...v, categoria_id: id, status: statusCompativel(v.status, nova) }));
  }

  function mudarDetalhe(chave: string, valor: string | boolean) {
    setValores((v) => ({ ...v, detalhes: { ...v.detalhes, [chave]: valor } }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (salvar.isPending) return;

    const tags = separarTags(valores.tags);
    const errosDetalhes: Record<string, string> = {};
    for (const campo of campos) {
      const valor = valores.detalhes[campo.chave];
      if (typeof valor !== 'string' || !valor) continue;
      const erro =
        campo.tipo === 'data' ? dataOpcionalValida(valor) : campo.tipo === 'url' ? validarLink(valor) : tamanhoMaximo(valor, campo.tipo === 'area' ? 2000 : 300);
      if (erro) errosDetalhes[campo.chave] = erro;
    }
    const novos: Erros = {
      titulo: primeiro(obrigatorio(valores.titulo, 'O nome'), tamanhoMaximo(valores.titulo, 200)),
      categoria_id: valores.categoria_id ? undefined : 'Escolha a categoria.',
      instituicao: tamanhoMaximo(valores.instituicao, 200),
      data_inicio: dataOpcionalValida(valores.data_inicio),
      data_fim: primeiro(
        dataOpcionalValida(valores.data_fim),
        valores.data_inicio && valores.data_fim && valores.data_fim < valores.data_inicio ? 'O término precisa ser depois do início.' : undefined,
      ),
      horas_previstas: validarHoras(valores.horas_previstas),
      horas_realizadas: validarHoras(valores.horas_realizadas),
      horas_aceitas: validarHoras(valores.horas_aceitas),
      descricao: tamanhoMaximo(valores.descricao, 4000),
      area_interesse: tamanhoMaximo(valores.area_interesse, 120),
      link: validarLink(valores.link),
      tags: validarTags(tags),
      observacoes: tamanhoMaximo(valores.observacoes, 4000),
      detalhes: Object.keys(errosDetalhes).length ? errosDetalhes : undefined,
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) {
      // Abre a seção com erro para o aluno ver a mensagem.
      requestAnimationFrame(() => {
        const invalido = document.querySelector<HTMLElement>('#formulario-atividade [aria-invalid="true"]');
        invalido?.closest('details')?.setAttribute('open', '');
        invalido?.focus();
      });
      return;
    }

    const dados: DadosAtividade = {
      titulo: valores.titulo,
      categoria_id: valores.categoria_id,
      instituicao: valores.instituicao,
      status: valores.status,
      prioridade: valores.prioridade,
      data_inicio: valores.data_inicio,
      data_fim: valores.data_fim,
      horas_previstas: lerHoras(valores.horas_previstas),
      horas_realizadas: lerHoras(valores.horas_realizadas) ?? 0,
      horas_aceitas: lerHoras(valores.horas_aceitas),
      descricao: valores.descricao,
      area_interesse: valores.area_interesse,
      link: valores.link,
      tags,
      observacoes: valores.observacoes,
      detalhes: limparDetalhes(valores.detalhes, campos),
    };

    try {
      const salva = await salvar.mutateAsync({ id: atividade?.id, dados });
      avisos.sucesso(atividade ? 'Atividade atualizada.' : 'Atividade adicionada.');
      aoFechar();
      aoSalvar?.(salva);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  const temHoras = Boolean(valores.data_inicio || valores.data_fim || valores.horas_previstas || valores.horas_realizadas || valores.horas_aceitas);
  const temExtras = Boolean(valores.descricao || valores.area_interesse || valores.link || valores.tags || valores.observacoes);

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={atividade ? 'Editar atividade' : 'Nova atividade'}
      largura="lg"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-atividade" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-atividade" onSubmit={enviar} noValidate className="space-y-4">
        <Campo
          rotulo="Nome da atividade"
          value={valores.titulo}
          onChange={(e) => mudar('titulo', e.target.value)}
          erro={erros.titulo}
          placeholder="Ex.: Liga Acadêmica de Cardiologia"
          data-autofoco
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Categoria" value={valores.categoria_id} onChange={(e) => mudarCategoria(e.target.value)} erro={erros.categoria_id}>
            <option value="">Escolha a categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Instituição ou organização"
            value={valores.instituicao}
            onChange={(e) => mudar('instituicao', e.target.value)}
            erro={erros.instituicao}
            list={idListaInstituicoes}
            opcional
          />
          <datalist id={idListaInstituicoes}>
            {valoresDistintos(atividades, 'instituicao').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <Selecao rotulo="Status" value={valores.status} onChange={(e) => mudar('status', e.target.value as StatusAtividade)}>
            {statusPossiveis.map((s) => (
              <option key={s} value={s}>
                {ROTULOS_STATUS[s]}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Prioridade" value={valores.prioridade} onChange={(e) => mudar('prioridade', e.target.value as PrioridadeTarefa)}>
            {PRIORIDADES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>
        </div>

        <Secao titulo="Período e carga horária" aberta={temHoras || !atividade}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Data de início" type="date" value={valores.data_inicio} onChange={(e) => mudar('data_inicio', e.target.value)} erro={erros.data_inicio} opcional />
            <Campo
              rotulo="Data de término"
              type="date"
              value={valores.data_fim}
              onChange={(e) => mudar('data_fim', e.target.value)}
              erro={erros.data_fim}
              dica="Deixe em branco se ainda está em andamento."
              opcional
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Horas previstas"
              inputMode="decimal"
              value={valores.horas_previstas}
              onChange={(e) => mudar('horas_previstas', e.target.value)}
              erro={erros.horas_previstas}
              opcional
            />
            <Campo
              rotulo="Horas realizadas"
              inputMode="decimal"
              value={valores.horas_realizadas}
              onChange={(e) => mudar('horas_realizadas', e.target.value)}
              erro={erros.horas_realizadas}
              opcional
            />
            <Campo
              rotulo="Horas aceitas"
              inputMode="decimal"
              value={valores.horas_aceitas}
              onChange={(e) => mudar('horas_aceitas', e.target.value)}
              erro={erros.horas_aceitas}
              dica="Pela instituição. Preencha só após a validação."
              opcional
            />
          </div>
        </Secao>

        {campos.length > 0 && (
          <Secao titulo={`Detalhes de ${categoria?.nome.toLowerCase() ?? 'categoria'}`} aberta>
            <CamposEspecificos campos={campos} detalhes={valores.detalhes} erros={erros.detalhes} aoMudar={mudarDetalhe} />
          </Secao>
        )}

        <Secao titulo="Descrição, área, link e tags" aberta={temExtras}>
          <AreaTexto rotulo="Descrição" value={valores.descricao} onChange={(e) => mudar('descricao', e.target.value)} erro={erros.descricao} opcional />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Área de interesse"
              value={valores.area_interesse}
              onChange={(e) => mudar('area_interesse', e.target.value)}
              erro={erros.area_interesse}
              list={idListaAreas}
              placeholder="Ex.: Cardiologia"
              opcional
            />
            <datalist id={idListaAreas}>
              {valoresDistintos(atividades, 'area_interesse').map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <Campo
              rotulo="Link externo"
              type="url"
              value={valores.link}
              onChange={(e) => mudar('link', e.target.value)}
              erro={erros.link}
              placeholder="https://"
              opcional
            />
          </div>
          <Campo
            rotulo="Tags"
            value={valores.tags}
            onChange={(e) => mudar('tags', e.target.value)}
            erro={erros.tags}
            dica="Separe por vírgulas. Ex.: cardiologia, liderança"
            opcional
          />
          <AreaTexto
            rotulo="Observações pessoais"
            value={valores.observacoes}
            onChange={(e) => mudar('observacoes', e.target.value)}
            erro={erros.observacoes}
            dica="Só você vê. Não entram no portfólio."
            opcional
          />
        </Secao>
      </form>
    </Modal>
  );
}

function Secao({ titulo, aberta, children }: { titulo: string; aberta?: boolean; children: ReactNode }) {
  return (
    <details open={aberta} className="group rounded-xl border border-stone-200 bg-stone-50/40 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
        {titulo}
        <span aria-hidden className="text-stone-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-4 border-t border-stone-200 px-4 py-4">{children}</div>
    </details>
  );
}

export function CamposEspecificos({
  campos,
  detalhes,
  erros,
  aoMudar,
}: {
  campos: CampoEspecifico[];
  detalhes: Detalhes;
  erros?: Record<string, string>;
  aoMudar: (chave: string, valor: string | boolean) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {campos.map((campo) => {
        const valor = detalhes[campo.chave];
        const comum = { rotulo: campo.rotulo, dica: campo.dica, erro: erros?.[campo.chave], opcional: true };
        if (campo.tipo === 'booleano') {
          return (
            <label key={campo.chave} className="flex items-center gap-2 self-end pb-2 text-sm text-stone-700 sm:col-span-2">
              <input
                type="checkbox"
                className="size-4 accent-vinho-600"
                checked={valor === true}
                onChange={(e) => aoMudar(campo.chave, e.target.checked)}
              />
              {campo.rotulo}
            </label>
          );
        }
        if (campo.tipo === 'selecao') {
          return (
            <Selecao key={campo.chave} {...comum} value={typeof valor === 'string' ? valor : ''} onChange={(e) => aoMudar(campo.chave, e.target.value)}>
              <option value="">Não informado</option>
              {campo.opcoes?.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </Selecao>
          );
        }
        if (campo.tipo === 'area') {
          return (
            <AreaTexto
              key={campo.chave}
              {...comum}
              className="sm:col-span-2"
              value={typeof valor === 'string' ? valor : ''}
              onChange={(e) => aoMudar(campo.chave, e.target.value)}
            />
          );
        }
        return (
          <Campo
            key={campo.chave}
            {...comum}
            type={campo.tipo === 'data' ? 'date' : campo.tipo === 'url' ? 'url' : 'text'}
            placeholder={campo.tipo === 'url' ? 'https://' : undefined}
            value={typeof valor === 'string' ? valor : ''}
            onChange={(e) => aoMudar(campo.chave, e.target.value)}
          />
        );
      })}
    </div>
  );
}
