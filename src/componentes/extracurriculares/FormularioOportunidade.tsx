import { useEffect, useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useCategoriasExtra, useSalvarOportunidade } from '../../hooks/useExtracurriculares';
import { traduzirErro } from '../../lib/erros';
import { STATUS_OPORTUNIDADE } from '../../lib/extracurriculares';
import { dataOpcionalValida, obrigatorio, primeiro, tamanhoMaximo } from '../../lib/validacao';
import type { DadosOportunidade, Oportunidade, StatusOportunidade } from '../../tipos/dominio';
import { Botao } from '../ui/Botao';
import { AreaTexto, Campo, Selecao } from '../ui/Campos';
import { Modal } from '../ui/Modal';

type Valores = {
  titulo: string;
  categoria_id: string;
  instituicao: string;
  link: string;
  data_abertura: string;
  data_encerramento: string;
  requisitos: string;
  documentos_necessarios: string;
  status_inscricao: StatusOportunidade;
  observacoes: string;
};

function valoresIniciais(op?: Oportunidade | null): Valores {
  return {
    titulo: op?.titulo ?? '',
    categoria_id: op?.categoria_id ?? '',
    instituicao: op?.instituicao ?? '',
    link: op?.link ?? '',
    data_abertura: op?.data_abertura ?? '',
    data_encerramento: op?.data_encerramento ?? '',
    requisitos: op?.requisitos ?? '',
    documentos_necessarios: op?.documentos_necessarios ?? '',
    status_inscricao: op?.status_inscricao ?? 'acompanhando',
    observacoes: op?.observacoes ?? '',
  };
}

export function FormularioOportunidade({
  aberto,
  aoFechar,
  oportunidade,
}: {
  aberto: boolean;
  aoFechar: () => void;
  oportunidade?: Oportunidade | null;
}) {
  const avisos = useNotificacoes();
  const { data: categorias = [] } = useCategoriasExtra();
  const salvar = useSalvarOportunidade();
  const [valores, setValores] = useState<Valores>(() => valoresIniciais(oportunidade));
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({});

  useEffect(() => {
    if (aberto) {
      setValores(valoresIniciais(oportunidade));
      setErros({});
    }
  }, [aberto, oportunidade?.id]);

  function mudar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (salvar.isPending) return;
    const link = valores.link.trim();
    const novos = {
      titulo: primeiro(obrigatorio(valores.titulo, 'O nome'), tamanhoMaximo(valores.titulo, 200)),
      categoria_id: valores.categoria_id ? undefined : 'Escolha a categoria.',
      instituicao: tamanhoMaximo(valores.instituicao, 200),
      link: link && !/^https?:\/\/\S+\.\S+/i.test(link) ? 'Informe um endereço começando com https://' : tamanhoMaximo(link, 1000),
      data_abertura: dataOpcionalValida(valores.data_abertura),
      data_encerramento: primeiro(
        dataOpcionalValida(valores.data_encerramento),
        valores.data_abertura && valores.data_encerramento && valores.data_encerramento < valores.data_abertura
          ? 'O encerramento precisa ser depois da abertura.'
          : undefined,
      ),
      requisitos: tamanhoMaximo(valores.requisitos, 4000),
      documentos_necessarios: tamanhoMaximo(valores.documentos_necessarios, 4000),
      observacoes: tamanhoMaximo(valores.observacoes, 4000),
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;

    const dados: DadosOportunidade = { ...valores, link };
    try {
      await salvar.mutateAsync({ id: oportunidade?.id, dados });
      avisos.sucesso(oportunidade ? 'Oportunidade atualizada.' : 'Oportunidade adicionada.');
      aoFechar();
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={oportunidade ? 'Editar oportunidade' : 'Nova oportunidade'}
      descricao="Cadastre editais, processos seletivos e inscrições que você quer acompanhar."
      largura="lg"
      rodape={
        <>
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="formulario-oportunidade" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </>
      }
    >
      <form id="formulario-oportunidade" onSubmit={enviar} noValidate className="space-y-4">
        <Campo
          rotulo="Nome"
          value={valores.titulo}
          onChange={(e) => mudar('titulo', e.target.value)}
          erro={erros.titulo}
          placeholder="Ex.: Processo seletivo da Liga de Neurologia"
          data-autofoco
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Categoria" value={valores.categoria_id} onChange={(e) => mudar('categoria_id', e.target.value)} erro={erros.categoria_id}>
            <option value="">Escolha a categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Instituição organizadora" value={valores.instituicao} onChange={(e) => mudar('instituicao', e.target.value)} erro={erros.instituicao} opcional />
          <Campo rotulo="Abertura das inscrições" type="date" value={valores.data_abertura} onChange={(e) => mudar('data_abertura', e.target.value)} erro={erros.data_abertura} opcional />
          <Campo
            rotulo="Encerramento das inscrições"
            type="date"
            value={valores.data_encerramento}
            onChange={(e) => mudar('data_encerramento', e.target.value)}
            erro={erros.data_encerramento}
            opcional
          />
          <Campo rotulo="Link oficial" type="url" value={valores.link} onChange={(e) => mudar('link', e.target.value)} erro={erros.link} placeholder="https://" opcional />
          <Selecao rotulo="Status da inscrição" value={valores.status_inscricao} onChange={(e) => mudar('status_inscricao', e.target.value as StatusOportunidade)}>
            {STATUS_OPORTUNIDADE.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
        </div>
        <AreaTexto rotulo="Requisitos" value={valores.requisitos} onChange={(e) => mudar('requisitos', e.target.value)} erro={erros.requisitos} opcional />
        <AreaTexto
          rotulo="Documentos necessários"
          value={valores.documentos_necessarios}
          onChange={(e) => mudar('documentos_necessarios', e.target.value)}
          erro={erros.documentos_necessarios}
          opcional
        />
        <AreaTexto rotulo="Observações" value={valores.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} erro={erros.observacoes} opcional />
      </form>
    </Modal>
  );
}
