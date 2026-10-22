import { Download, Eye, FileText, Lock, Paperclip, Trash2, Upload } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useNotificacoes } from '../../contextos/Notificacoes';
import { useDocumentosExtra, useEnviarDocumento, useExcluirDocumento } from '../../hooks/useExtracurriculares';
import { formatarDataCurta } from '../../lib/datas';
import { traduzirErro } from '../../lib/erros';
import { ACEITAR_ARQUIVOS, formatarTamanho, rotuloTipoDocumento, TIPOS_DOCUMENTO, validarArquivo } from '../../lib/extracurriculares';
import { linkDoDocumento } from '../../servicos/documentos';
import type { DocumentoAtividade, TipoDocumento } from '../../tipos/dominio';
import { Botao, BotaoIcone } from '../ui/Botao';
import { Selecao } from '../ui/Campos';
import { Confirmacao } from '../ui/Confirmacao';
import { EsqueletoLista, MensagemErro } from '../ui/Estados';
import { CabecalhoCartao, Cartao } from '../ui/Visuais';

export function DocumentosAtividade({ atividadeId }: { atividadeId: string }) {
  const avisos = useNotificacoes();
  const { data, isPending, isError, error, refetch } = useDocumentosExtra();
  const enviar = useEnviarDocumento();
  const excluir = useExcluirDocumento();
  const [tipo, setTipo] = useState<TipoDocumento>('certificado');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string>();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<DocumentoAtividade | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const idArquivo = useId();
  const documentos = (data ?? []).filter((d) => d.atividade_id === atividadeId);

  function escolher(lista: FileList | null) {
    const escolhido = lista?.[0] ?? null;
    setArquivo(escolhido);
    setErroArquivo(escolhido ? validarArquivo(escolhido) : undefined);
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (enviar.isPending) return;
    if (!arquivo) {
      setErroArquivo('Escolha um arquivo.');
      return;
    }
    const invalido = validarArquivo(arquivo);
    if (invalido) {
      setErroArquivo(invalido);
      return;
    }
    try {
      await enviar.mutateAsync({ atividadeId, tipo, arquivo });
      avisos.sucesso(`"${arquivo.name}" foi salvo com segurança.`);
      setArquivo(null);
      if (entrada.current) entrada.current.value = '';
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  async function abrir(documento: DocumentoAtividade, baixar: boolean) {
    // A janela abre antes do await para não ser barrada como pop-up.
    // ('noopener' faria window.open devolver null; o opener é cortado à mão.)
    const janela = baixar ? null : window.open('', '_blank');
    if (janela) janela.opener = null;
    setAbrindo(documento.id);
    try {
      const link = await linkDoDocumento(documento, baixar);
      if (janela) janela.location.href = link;
      else window.location.assign(link);
    } catch (erro) {
      janela?.close();
      avisos.erro(traduzirErro(erro));
    } finally {
      setAbrindo(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo);
      avisos.sucesso('Documento excluído.');
      setExcluindo(null);
    } catch (erro) {
      avisos.erro(traduzirErro(erro));
    }
  }

  return (
    <Cartao>
      <CabecalhoCartao titulo="Documentos e certificados" icone={<Paperclip aria-hidden className="size-4" />} />
      <div className="space-y-4 px-5 pb-5">
        <p className="flex items-start gap-2 text-xs leading-5 text-stone-500">
          <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Arquivos privados: só você acessa, por links temporários. PDF, JPG, PNG, WEBP, DOC ou DOCX, até 10 MB.
        </p>

        <form onSubmit={aoEnviar} noValidate className="grid gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 p-3">
          <Selecao rotulo="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value as TipoDocumento)}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Selecao>
          <div>
            <label htmlFor={idArquivo} className="mb-1.5 block text-sm font-medium text-stone-700">
              Arquivo
            </label>
            <input
              ref={entrada}
              id={idArquivo}
              type="file"
              accept={ACEITAR_ARQUIVOS}
              onChange={(e) => escolher(e.target.files)}
              aria-invalid={erroArquivo ? true : undefined}
              aria-describedby={erroArquivo ? `${idArquivo}-erro` : undefined}
              className="block w-full rounded-lg border border-stone-300 bg-white text-sm text-stone-600 file:mr-3 file:h-10 file:border-0 file:bg-vinho-50 file:px-3 file:text-sm file:font-medium file:text-vinho-700 hover:file:bg-vinho-100"
            />
          </div>
          <Botao
            type="submit"
            className="justify-self-end"
            carregando={enviar.isPending}
            disabled={!arquivo || !!erroArquivo}
            icone={<Upload aria-hidden className="size-4" />}
          >
            Enviar
          </Botao>
          {erroArquivo && (
            <p id={`${idArquivo}-erro`} role="alert" className="text-xs text-red-600">
              {erroArquivo}
            </p>
          )}
        </form>

        {isPending ? (
          <EsqueletoLista linhas={2} />
        ) : isError ? (
          <MensagemErro erro={error} aoTentarNovamente={() => refetch()} />
        ) : documentos.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum documento anexado. Envie o certificado quando receber, para contar como horas comprovadas.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {documentos.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText aria-hidden className="size-5 shrink-0 text-vinho-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-800">{d.nome_arquivo}</p>
                  <p className="text-xs text-stone-500">
                    {rotuloTipoDocumento(d.tipo)} · {formatarTamanho(d.tamanho)} · {formatarDataCurta(d.created_at.slice(0, 10))}
                  </p>
                </div>
                <BotaoIcone rotulo={`Ver ${d.nome_arquivo}`} onClick={() => abrir(d, false)} disabled={abrindo === d.id}>
                  <Eye aria-hidden className="size-4" />
                </BotaoIcone>
                <BotaoIcone rotulo={`Baixar ${d.nome_arquivo}`} onClick={() => abrir(d, true)} disabled={abrindo === d.id}>
                  <Download aria-hidden className="size-4" />
                </BotaoIcone>
                <BotaoIcone rotulo={`Excluir ${d.nome_arquivo}`} onClick={() => setExcluindo(d)} className="hover:text-red-600">
                  <Trash2 aria-hidden className="size-4" />
                </BotaoIcone>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Confirmacao
        aberto={!!excluindo}
        titulo="Excluir documento?"
        mensagem={`"${excluindo?.nome_arquivo ?? ''}" será apagado definitivamente. Esta ação não pode ser desfeita.`}
        carregando={excluir.isPending}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </Cartao>
  );
}
