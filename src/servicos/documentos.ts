/**
 * Documentos das atividades extracurriculares.
 *
 * O arquivo vai para o bucket privado `documentos-extracurriculares`, na pasta
 * do próprio aluno (<user_id>/<atividade_id>/...). As políticas do Storage só
 * deixam cada usuário ler, enviar e apagar dentro da própria pasta. O acesso
 * ao arquivo é sempre por URL assinada de curta duração.
 */

import { ErroApp } from '../lib/erros';
import { nomeSeguroArquivo, validarArquivo } from '../lib/extracurriculares';
import { supabase } from '../lib/supabase';
import type { DocumentoAtividade, TipoDocumento } from '../tipos/dominio';
import { resolver } from './base';

export const BUCKET_DOCUMENTOS = 'documentos-extracurriculares';
const VALIDADE_LINK_SEGUNDOS = 60;

function armazenamento() {
  return supabase().storage.from(BUCKET_DOCUMENTOS);
}

export async function listarDocumentos(): Promise<DocumentoAtividade[]> {
  return resolver(supabase().from('documentos_extracurriculares').select('*').order('created_at', { ascending: false }));
}

export async function enviarDocumento(params: {
  userId: string;
  atividadeId: string;
  tipo: TipoDocumento;
  arquivo: File;
}): Promise<DocumentoAtividade> {
  const { userId, atividadeId, tipo, arquivo } = params;
  const invalido = validarArquivo(arquivo);
  if (invalido) throw new ErroApp(invalido);

  const caminho = `${userId}/${atividadeId}/${crypto.randomUUID()}-${nomeSeguroArquivo(arquivo.name)}`;
  const envio = await armazenamento().upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (envio.error) throw traduzirErroStorage(envio.error);

  try {
    return await resolver(
      supabase()
        .from('documentos_extracurriculares')
        .insert({
          atividade_id: atividadeId,
          tipo,
          nome_arquivo: arquivo.name.slice(0, 200),
          caminho,
          tipo_mime: arquivo.type,
          tamanho: arquivo.size,
        })
        .select('*')
        .single(),
    );
  } catch (erro) {
    // Sem o registro, o arquivo ficaria órfão no bucket.
    await armazenamento().remove([caminho]);
    throw erro;
  }
}

/** Apaga o arquivo e depois o registro; se falhar no meio, repetir conclui. */
export async function excluirDocumento(documento: Pick<DocumentoAtividade, 'id' | 'caminho'>): Promise<void> {
  await removerArquivos([documento.caminho]);
  await resolver(supabase().from('documentos_extracurriculares').delete().eq('id', documento.id));
}

export async function removerArquivos(caminhos: string[]): Promise<void> {
  if (!caminhos.length) return;
  const { error } = await armazenamento().remove(caminhos);
  if (error) throw traduzirErroStorage(error);
}

/** URL assinada (60 s). Com `baixar`, o navegador salva o arquivo com o nome original. */
export async function linkDoDocumento(
  documento: Pick<DocumentoAtividade, 'caminho' | 'nome_arquivo'>,
  baixar = false,
): Promise<string> {
  const { data, error } = await armazenamento().createSignedUrl(
    documento.caminho,
    VALIDADE_LINK_SEGUNDOS,
    baixar ? { download: documento.nome_arquivo } : undefined,
  );
  if (error || !data) throw traduzirErroStorage(error);
  return data.signedUrl;
}

/** Caminhos de todos os arquivos do aluno (usado antes de excluir a conta). */
export async function caminhosDosMeusDocumentos(): Promise<string[]> {
  const documentos = await resolver(supabase().from('documentos_extracurriculares').select('caminho'));
  return documentos.map((d) => d.caminho);
}

function traduzirErroStorage(erro: unknown): ErroApp {
  const mensagem = erro && typeof erro === 'object' && 'message' in erro ? String((erro as { message: unknown }).message) : '';
  if (/exceeded the maximum allowed size|payload too large|413/i.test(mensagem)) {
    return new ErroApp('O arquivo passa de 10 MB.', { causa: erro });
  }
  if (/mime type .* is not supported|invalid_mime_type/i.test(mensagem)) {
    return new ErroApp('Envie um arquivo PDF, JPG, PNG, WEBP, DOC ou DOCX.', { causa: erro });
  }
  if (/row-level security|unauthorized|not authorized|403/i.test(mensagem)) {
    return new ErroApp('Você não tem permissão para acessar este arquivo.', { causa: erro });
  }
  if (/not found|object not found|404/i.test(mensagem)) {
    return new ErroApp('Arquivo não encontrado. Ele pode ter sido excluído.', { causa: erro });
  }
  if (/failed to fetch|network/i.test(mensagem)) {
    return new ErroApp('Não foi possível falar com o servidor. Verifique sua conexão.', { causa: erro });
  }
  return new ErroApp('Não foi possível concluir a operação com o arquivo. Tente novamente.', { causa: erro });
}
