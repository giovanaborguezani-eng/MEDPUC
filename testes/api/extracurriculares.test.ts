/**
 * Isolamento do módulo extracurricular pela API REST e pela API do Storage,
 * com dois usuários reais. São as chamadas que alguém faria editando
 * requisições no navegador, sem passar pela interface.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../../src/tipos/banco';
import { ambienteSupabaseLocal } from '../ambiente';

type Cliente = SupabaseClient<Database>;

const ambiente = ambienteSupabaseLocal();
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient<Database>(ambiente.url, ambiente.secreta, opcoes);
const sufixo = Date.now();
const senha = 'senhaTeste123';
const BUCKET = 'documentos-extracurriculares';
const PDF = new Blob(['%PDF-1.4\n%teste\n'], { type: 'application/pdf' });

async function criarAluno(nome: string): Promise<{ cliente: Cliente; id: string }> {
  const email = `${nome.toLowerCase()}.extra.${sufixo}@teste.dev`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error) throw error;
  const cliente = createClient<Database>(ambiente.url, ambiente.publica, opcoes);
  const login = await cliente.auth.signInWithPassword({ email, password: senha });
  if (login.error) throw login.error;
  return { cliente, id: data.user.id };
}

let ana: { cliente: Cliente; id: string };
let bruno: { cliente: Cliente; id: string };
const ids = { atividade: '', oportunidade: '', documento: '' };
let caminho = '';

beforeAll(async () => {
  ana = await criarAluno('Ana');
  bruno = await criarAluno('Bruno');

  const a = await ana.cliente
    .from('atividades_extracurriculares')
    .insert({ categoria_id: 'liga', titulo: 'Liga de Cardiologia', status: 'em_andamento', horas_realizadas: 20 })
    .select()
    .single();
  expect(a.error).toBeNull();
  ids.atividade = a.data!.id;

  const o = await ana.cliente
    .from('oportunidades_extracurriculares')
    .insert({ categoria_id: 'congresso', titulo: 'Congresso de Neurologia', data_encerramento: '2099-01-01' })
    .select()
    .single();
  ids.oportunidade = o.data!.id;

  caminho = `${ana.id}/${ids.atividade}/certificado.pdf`;
  const envio = await ana.cliente.storage.from(BUCKET).upload(caminho, PDF, { contentType: 'application/pdf' });
  expect(envio.error).toBeNull();
  const d = await ana.cliente
    .from('documentos_extracurriculares')
    .insert({ atividade_id: ids.atividade, tipo: 'certificado', nome_arquivo: 'certificado.pdf', caminho, tipo_mime: 'application/pdf', tamanho: PDF.size })
    .select()
    .single();
  expect(d.error).toBeNull();
  ids.documento = d.data!.id;

  await ana.cliente.from('metas_extracurriculares').insert({ meta_horas: 200 });
});

afterAll(async () => {
  await admin.storage.from(BUCKET).remove([caminho, `${bruno.id}/proprio.pdf`]);
  await admin.auth.admin.deleteUser(ana.id);
  await admin.auth.admin.deleteUser(bruno.id);
});

const TABELAS = [
  ['atividades_extracurriculares', 'atividade'],
  ['oportunidades_extracurriculares', 'oportunidade'],
  ['documentos_extracurriculares', 'documento'],
] as const;

describe('tabelas do módulo (API + RLS)', () => {
  it.each(TABELAS)('Bruno não lê %s da Ana, nem pelo id', async (tabela, chave) => {
    const todos = await bruno.cliente.from(tabela).select('id');
    expect(todos.error).toBeNull();
    expect(todos.data).toEqual([]);
    const porId = await bruno.cliente.from(tabela).select('*').eq('id', ids[chave]);
    expect(porId.data).toEqual([]);
  });

  it.each(TABELAS)('Bruno não exclui %s da Ana', async (tabela, chave) => {
    const r = await bruno.cliente.from(tabela).delete().eq('id', ids[chave]).select();
    expect(r.data).toEqual([]);
    const daAna = await ana.cliente.from(tabela).select('id').eq('id', ids[chave]);
    expect(daAna.data).toHaveLength(1);
  });

  it('Bruno não altera atividade nem oportunidade da Ana', async () => {
    const r1 = await bruno.cliente.from('atividades_extracurriculares').update({ titulo: 'invadido' }).eq('id', ids.atividade).select();
    const r2 = await bruno.cliente.from('oportunidades_extracurriculares').update({ titulo: 'invadido' }).eq('id', ids.oportunidade).select();
    expect(r1.data).toEqual([]);
    expect(r2.data).toEqual([]);
    const { data } = await ana.cliente.from('atividades_extracurriculares').select('titulo').eq('id', ids.atividade).single();
    expect(data?.titulo).toBe('Liga de Cardiologia');
  });

  it('Bruno não lê nem altera a meta da Ana', async () => {
    expect((await bruno.cliente.from('metas_extracurriculares').select('*')).data).toEqual([]);
    const r = await bruno.cliente.from('metas_extracurriculares').update({ meta_horas: 1 }).eq('user_id', ana.id).select();
    expect(r.data).toEqual([]);
  });

  it('Bruno não grava em nome da Ana nem anexa documento à atividade dela', async () => {
    const plantada = await bruno.cliente.from('atividades_extracurriculares').insert({ user_id: ana.id, categoria_id: 'liga', titulo: 'x' });
    expect(plantada.error?.code).toBe('42501');
    const anexo = await bruno.cliente.from('documentos_extracurriculares').insert({
      atividade_id: ids.atividade,
      nome_arquivo: 'x.pdf',
      caminho: `${bruno.id}/${ids.atividade}/x.pdf`,
      tipo_mime: 'application/pdf',
      tamanho: 10,
    });
    expect(anexo.error?.code).toBe('23503');
  });

  it('converter oportunidade: dono cria uma única atividade; outro aluno não consegue', async () => {
    const outro = await bruno.cliente.rpc('converter_oportunidade', { p_oportunidade: ids.oportunidade });
    expect(outro.error).not.toBeNull();
    const primeira = await ana.cliente.rpc('converter_oportunidade', { p_oportunidade: ids.oportunidade });
    const segunda = await ana.cliente.rpc('converter_oportunidade', { p_oportunidade: ids.oportunidade });
    expect(primeira.error).toBeNull();
    expect(segunda.data?.[0]?.id).toBe(primeira.data?.[0]?.id);
    const { data } = await ana.cliente.from('atividades_extracurriculares').select('id').eq('oportunidade_id', ids.oportunidade);
    expect(data).toHaveLength(1);
  });

  it('visitante sem login não acessa nada do módulo', async () => {
    const anonimo = createClient<Database>(ambiente.url, ambiente.publica, opcoes);
    for (const tabela of ['atividades_extracurriculares', 'oportunidades_extracurriculares', 'documentos_extracurriculares', 'metas_extracurriculares', 'categorias_extracurriculares'] as const) {
      const r = await anonimo.from(tabela).select('*');
      expect(r.data ?? []).toEqual([]);
      expect(r.error?.code).toBe('42501');
    }
    const arquivo = await anonimo.storage.from(BUCKET).download(caminho);
    expect(arquivo.error).not.toBeNull();
  });
});

describe('Storage: arquivos privados por aluno', () => {
  it('Ana baixa o próprio arquivo e gera link assinado', async () => {
    const baixado = await ana.cliente.storage.from(BUCKET).download(caminho);
    expect(baixado.error).toBeNull();
    expect(await baixado.data!.text()).toContain('%PDF');
    const link = await ana.cliente.storage.from(BUCKET).createSignedUrl(caminho, 60);
    expect(link.error).toBeNull();
    expect((await fetch(link.data!.signedUrl)).status).toBe(200);
  });

  it('o bucket não é público: URL pública não abre o arquivo', async () => {
    const { data } = ana.cliente.storage.from(BUCKET).getPublicUrl(caminho);
    expect((await fetch(data.publicUrl)).status).not.toBe(200);
  });

  it('Bruno não lista, não baixa e não gera link do arquivo da Ana', async () => {
    const lista = await bruno.cliente.storage.from(BUCKET).list(`${ana.id}/${ids.atividade}`);
    expect(lista.data ?? []).toEqual([]);
    const baixado = await bruno.cliente.storage.from(BUCKET).download(caminho);
    expect(baixado.error).not.toBeNull();
    const link = await bruno.cliente.storage.from(BUCKET).createSignedUrl(caminho, 60);
    expect(link.error).not.toBeNull();
  });

  it('Bruno não envia para a pasta da Ana, não sobrescreve e não apaga o arquivo dela', async () => {
    const envio = await bruno.cliente.storage.from(BUCKET).upload(`${ana.id}/plantado.pdf`, PDF, { contentType: 'application/pdf' });
    expect(envio.error).not.toBeNull();
    const sobrescrever = await bruno.cliente.storage.from(BUCKET).upload(caminho, PDF, { contentType: 'application/pdf', upsert: true });
    expect(sobrescrever.error).not.toBeNull();
    await bruno.cliente.storage.from(BUCKET).remove([caminho]);
    expect((await ana.cliente.storage.from(BUCKET).download(caminho)).error).toBeNull();
  });

  it('Bruno envia para a própria pasta; tipos e tamanhos fora do permitido são recusados', async () => {
    const proprio = await bruno.cliente.storage.from(BUCKET).upload(`${bruno.id}/proprio.pdf`, PDF, { contentType: 'application/pdf' });
    expect(proprio.error).toBeNull();
    const html = await bruno.cliente.storage
      .from(BUCKET)
      .upload(`${bruno.id}/pagina.html`, new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), { contentType: 'text/html' });
    expect(html.error).not.toBeNull();
    const grande = await bruno.cliente.storage
      .from(BUCKET)
      .upload(`${bruno.id}/grande.pdf`, new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
      });
    expect(grande.error).not.toBeNull();
  });
});
