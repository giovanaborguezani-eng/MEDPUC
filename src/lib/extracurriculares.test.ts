import { describe, expect, it } from 'vitest';
import type { Atividade, CategoriaExtra, DocumentoAtividade, Oportunidade } from '../tipos/dominio';
import {
  camposDaCategoria,
  descreverPeriodo,
  filtrarAtividades,
  FILTROS_VAZIOS,
  limparDetalhes,
  linhaDoTempo,
  montarPortfolio,
  nomeSeguroArquivo,
  ordenarAtividades,
  proximosPrazos,
  resumoExtra,
  resumoHoras,
  separarTags,
  situacaoOportunidade,
  statusCompativel,
  statusDaCategoria,
  validarArquivo,
  validarTags,
} from './extracurriculares';

const HOJE = '2026-10-18';

function categoria(id: string, extra: Partial<CategoriaExtra> = {}): CategoriaExtra {
  return {
    id,
    nome: id,
    descricao: null,
    icone: 'folder',
    cor: '#8C1D40',
    modelo_campos: null,
    conjunto_status: 'padrao',
    secao_portfolio: 'outras',
    ordem: 0,
    ativa: true,
    created_at: '',
    updated_at: '',
    ...extra,
  };
}

const CATEGORIAS = new Map([
  ['liga', categoria('liga', { modelo_campos: 'liga', secao_portfolio: 'ligas' })],
  ['publicacao', categoria('publicacao', { modelo_campos: 'publicacao', conjunto_status: 'publicacao', secao_portfolio: 'publicacoes' })],
  ['congresso', categoria('congresso', { modelo_campos: 'evento', secao_portfolio: 'congressos' })],
]);

let seq = 0;
function atividade(extra: Partial<Atividade> = {}): Atividade {
  seq += 1;
  return {
    id: `a${seq}`,
    user_id: 'u',
    categoria_id: 'liga',
    oportunidade_id: null,
    titulo: `Atividade ${seq}`,
    instituicao: null,
    descricao: null,
    area_interesse: null,
    data_inicio: null,
    data_fim: null,
    horas_previstas: null,
    horas_realizadas: 0,
    horas_aceitas: null,
    status: 'planejando',
    prioridade: 'media',
    link: null,
    observacoes: null,
    tags: [],
    detalhes: {},
    created_at: '2026-01-01T12:00:00Z',
    updated_at: '2026-01-01T12:00:00Z',
    ...extra,
  };
}

function oportunidade(extra: Partial<Oportunidade> = {}): Oportunidade {
  seq += 1;
  return {
    id: `o${seq}`,
    user_id: 'u',
    categoria_id: 'liga',
    titulo: `Oportunidade ${seq}`,
    instituicao: null,
    link: null,
    data_abertura: null,
    data_encerramento: null,
    requisitos: null,
    documentos_necessarios: null,
    status_inscricao: 'acompanhando',
    observacoes: null,
    created_at: '',
    updated_at: '',
    ...extra,
  };
}

const documento = (atividade_id: string, tipo: DocumentoAtividade['tipo']) => ({ atividade_id, tipo });

describe('status por categoria', () => {
  it('publicações usam o próprio conjunto de status', () => {
    expect(statusDaCategoria(CATEGORIAS.get('publicacao'))).toContain('publicado');
    expect(statusDaCategoria(CATEGORIAS.get('publicacao'))).not.toContain('inscricao_realizada');
    expect(statusDaCategoria(CATEGORIAS.get('liga'))).not.toContain('publicado');
  });

  it('ao trocar de categoria, um status incompatível volta ao inicial', () => {
    expect(statusCompativel('inscricao_realizada', CATEGORIAS.get('publicacao'))).toBe('ideia');
    expect(statusCompativel('publicado', CATEGORIAS.get('liga'))).toBe('planejando');
    expect(statusCompativel('cancelado', CATEGORIAS.get('publicacao'))).toBe('cancelado');
  });
});

describe('campos específicos', () => {
  it('mostram só os campos da categoria e descartam vazios e campos de outra categoria', () => {
    const campos = camposDaCategoria(CATEGORIAS.get('liga'));
    expect(campos.map((c) => c.chave)).toEqual(['especialidade', 'cargo', 'processo_seletivo']);
    expect(limparDetalhes({ cargo: ' Diretor ', especialidade: '', doi: '10.1/x' }, campos)).toEqual({ cargo: 'Diretor' });
  });
});

describe('oportunidades e prazos', () => {
  it('situação das inscrições vem só das datas cadastradas', () => {
    expect(situacaoOportunidade({ data_abertura: null, data_encerramento: null }, HOJE).chave).toBe('sem_datas');
    expect(situacaoOportunidade({ data_abertura: '2026-10-01', data_encerramento: '2026-10-17' }, HOJE).chave).toBe('encerrada');
    expect(situacaoOportunidade({ data_abertura: '2026-10-20', data_encerramento: '2026-11-20' }, HOJE)).toMatchObject({
      chave: 'abre_em_breve',
      dias: 2,
    });
    expect(situacaoOportunidade({ data_abertura: '2026-10-01', data_encerramento: '2026-10-19' }, HOJE)).toMatchObject({
      chave: 'encerrando',
      rotulo: 'Encerra amanhã',
      tom: 'vermelho',
    });
    expect(situacaoOportunidade({ data_abertura: null, data_encerramento: '2026-12-01' }, HOJE).chave).toBe('aberta');
  });

  it('próximos prazos ignoram o passado, inscrições já feitas e atividades concluídas', () => {
    const prazos = proximosPrazos(
      [
        atividade({ titulo: 'Congresso A', status: 'planejando', detalhes: { prazo_inscricao: '2026-10-25', prazo_submissao: '2026-10-20' } }),
        atividade({ titulo: 'Congresso B', status: 'inscricao_realizada', detalhes: { prazo_inscricao: '2026-10-21', prazo_submissao: '2026-10-22' } }),
        atividade({ titulo: 'Congresso C', status: 'concluido', detalhes: { prazo_submissao: '2026-10-23' } }),
      ],
      [
        oportunidade({ titulo: 'Liga X', data_abertura: '2026-10-19', data_encerramento: '2026-10-30' }),
        oportunidade({ titulo: 'Liga Y', data_encerramento: '2026-10-10' }),
        oportunidade({ titulo: 'Liga Z', data_encerramento: '2026-10-28', status_inscricao: 'inscrito' }),
      ],
      HOJE,
    );
    expect(prazos.map((p) => `${p.data} ${p.titulo} ${p.rotulo}`)).toEqual([
      '2026-10-19 Liga X Abertura das inscrições',
      '2026-10-20 Congresso A Submissão de trabalhos',
      '2026-10-22 Congresso B Submissão de trabalhos',
      '2026-10-25 Congresso A Prazo de inscrição',
      '2026-10-30 Liga X Encerramento das inscrições',
    ]);
  });
});

describe('carga horária', () => {
  it('separa realizadas, comprovadas por certificado e aceitas; canceladas ficam de fora', () => {
    const a = atividade({ categoria_id: 'liga', horas_previstas: 40, horas_realizadas: 30, horas_aceitas: 20 });
    const b = atividade({ categoria_id: 'congresso', horas_previstas: 10, horas_realizadas: 12.5 });
    const c = atividade({ categoria_id: 'liga', horas_previstas: 8, horas_realizadas: 8, status: 'cancelado' });
    const d = atividade({ categoria_id: 'congresso', horas_realizadas: 4 });
    const r = resumoHoras([a, b, c, d], [documento(a.id, 'certificado'), documento(b.id, 'edital'), documento(d.id, 'declaracao')]);
    expect(r).toMatchObject({ previstas: 50, realizadas: 46.5, comprovadas: 34, pendentes: 12.5, aceitas: 20 });
    expect(r.porCategoria).toEqual([
      { categoriaId: 'liga', realizadas: 30, previstas: 40, comprovadas: 30 },
      { categoriaId: 'congresso', realizadas: 16.5, previstas: 10, comprovadas: 4 },
    ]);
  });

  it('o painel conta só certificados como "certificados anexados"', () => {
    const a = atividade({ status: 'em_andamento' });
    const b = atividade({ status: 'concluido' });
    const c = atividade({ categoria_id: 'publicacao', status: 'submetido' });
    const docs = [
      { ...documento(a.id, 'certificado'), id: '1' },
      { ...documento(b.id, 'declaracao'), id: '2' },
    ] as DocumentoAtividade[];
    const r = resumoExtra([a, b, c], [oportunidade({ data_encerramento: '2026-11-01' }), oportunidade({ data_encerramento: '2026-01-01' })], docs, HOJE);
    expect(r).toMatchObject({ total: 3, andamento: 2, concluidas: 1, oportunidadesAbertas: 1, certificados: 1 });
  });
});

describe('filtros, busca e ordenação', () => {
  const lista = [
    atividade({ titulo: 'Liga de Cardiologia', instituicao: 'PUCPR', tags: ['coração'], area_interesse: 'Cardiologia', data_inicio: '2026-03-01', status: 'em_andamento', updated_at: '2026-10-01T00:00:00Z' }),
    atividade({ titulo: 'Artigo sobre AVC', categoria_id: 'publicacao', descricao: 'Revisão sistemática', status: 'publicado', data_inicio: '2025-05-01', data_fim: '2025-12-01', updated_at: '2026-09-01T00:00:00Z' }),
    atividade({ titulo: 'Congresso Brasileiro', categoria_id: 'congresso', instituicao: 'SBC', status: 'planejando', detalhes: { prazo_inscricao: '2026-11-05' }, updated_at: '2026-10-10T00:00:00Z' }),
  ];

  it('pesquisa em nome, instituição, descrição e tags, sem diferenciar acentos', () => {
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, busca: 'coracao' }).map((a) => a.titulo)).toEqual(['Liga de Cardiologia']);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, busca: 'REVISAO' }).map((a) => a.titulo)).toEqual(['Artigo sobre AVC']);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, busca: 'sbc' })).toHaveLength(1);
  });

  it('filtra por categoria, situação, instituição, área e período', () => {
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, categoria: 'publicacao' })).toHaveLength(1);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, situacao: 'concluidas' }).map((a) => a.titulo)).toEqual(['Artigo sobre AVC']);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, situacao: 'andamento' }).map((a) => a.titulo)).toEqual(['Liga de Cardiologia']);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, instituicao: 'pucpr' })).toHaveLength(1);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, area: 'cardiologia' })).toHaveLength(1);
    expect(filtrarAtividades(lista, { ...FILTROS_VAZIOS, de: '2025-11-01', ate: '2025-12-31' }).map((a) => a.titulo)).toEqual(['Artigo sobre AVC']);
  });

  it('ordena por nome, data, prazo e atualização', () => {
    expect(ordenarAtividades(lista, 'nome', HOJE).map((a) => a.titulo)).toEqual(['Artigo sobre AVC', 'Congresso Brasileiro', 'Liga de Cardiologia']);
    expect(ordenarAtividades(lista, 'data', HOJE)[0].titulo).toBe('Liga de Cardiologia');
    expect(ordenarAtividades(lista, 'prazo', HOJE)[0].titulo).toBe('Congresso Brasileiro');
    expect(ordenarAtividades(lista, 'atualizacao', HOJE)[0].titulo).toBe('Congresso Brasileiro');
  });
});

describe('linha do tempo e portfólio', () => {
  it('agrupa por ano, do mais recente, e marca quando a data não foi informada', () => {
    const grupos = linhaDoTempo([
      atividade({ titulo: 'A', data_inicio: '2025-03-01' }),
      atividade({ titulo: 'B', data_inicio: '2026-02-01' }),
      atividade({ titulo: 'C', categoria_id: 'publicacao', detalhes: { data_publicacao: '2026-08-10' } }),
      atividade({ titulo: 'D', created_at: '2024-05-05T10:00:00Z' }),
    ]);
    expect(grupos.map((g) => [g.ano, g.itens.map((i) => i.atividade.titulo)])).toEqual([
      ['2026', ['C', 'B']],
      ['2025', ['A']],
      ['2024', ['D']],
    ]);
    expect(grupos[2].itens[0].informada).toBe(false);
  });

  it('portfólio traz só concluídas e publicadas, sem artigos submetidos ou aceitos', () => {
    const secoes = montarPortfolio(
      [
        atividade({ titulo: 'Liga concluída', status: 'concluido' }),
        atividade({ titulo: 'Liga em andamento', status: 'em_andamento' }),
        atividade({ titulo: 'Artigo publicado', categoria_id: 'publicacao', status: 'publicado' }),
        atividade({ titulo: 'Artigo submetido', categoria_id: 'publicacao', status: 'submetido' }),
        atividade({ titulo: 'Artigo aceito', categoria_id: 'publicacao', status: 'aceito' }),
      ],
      CATEGORIAS,
    );
    expect(secoes.map((s) => [s.titulo, s.itens.map((a) => a.titulo)])).toEqual([
      ['Ligas acadêmicas', ['Liga concluída']],
      ['Artigos e publicações', ['Artigo publicado']],
    ]);
  });

  it('descreve o período sem inventar término', () => {
    expect(descreverPeriodo({ data_inicio: '2026-03-01', data_fim: null, status: 'em_andamento' })).toBe('desde mar de 2026');
    expect(descreverPeriodo({ data_inicio: '2026-03-01', data_fim: '2026-06-30', status: 'concluido' })).toBe('mar de 2026 – jun de 2026');
    expect(descreverPeriodo({ data_inicio: null, data_fim: null, status: 'concluido' })).toBeNull();
  });
});

describe('arquivos e tags', () => {
  it('valida tipo, extensão e tamanho', () => {
    expect(validarArquivo({ name: 'certificado.pdf', type: 'application/pdf', size: 1000 })).toBeUndefined();
    expect(validarArquivo({ name: 'foto.JPG', type: 'image/jpeg', size: 1000 })).toBeUndefined();
    expect(validarArquivo({ name: 'script.exe', type: 'application/x-msdownload', size: 1000 })).toMatch(/PDF/);
    expect(validarArquivo({ name: 'falso.pdf', type: 'image/png', size: 1000 })).toMatch(/PDF/);
    expect(validarArquivo({ name: 'grande.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(validarArquivo({ name: 'vazio.pdf', type: 'application/pdf', size: 0 })).toMatch(/vazio/);
  });

  it('gera nomes seguros para o caminho no Storage', () => {
    expect(nomeSeguroArquivo('Certificado Congresso São Paulo.PDF')).toBe('Certificado-Congresso-Sao-Paulo.pdf');
    expect(nomeSeguroArquivo('../../outro-usuario/x.pdf')).toBe('outro-usuario-x.pdf');
    expect(nomeSeguroArquivo('sem extensão')).toBe('sem-extensao');
  });

  it('separa tags sem repetir e valida limites', () => {
    expect(separarTags('cardio, Pesquisa,  cardio , ,liderança')).toEqual(['cardio', 'Pesquisa', 'liderança']);
    expect(validarTags(Array.from({ length: 21 }, (_, i) => `t${i}`))).toMatch(/20/);
    expect(validarTags(['x'.repeat(41)])).toMatch(/40/);
  });
});
