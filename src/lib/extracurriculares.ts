/**
 * extracurriculares.ts — regras do módulo de atividades extracurriculares.
 *
 * Tudo aqui é calculado a partir dos registros do próprio aluno: nenhum
 * número, prazo ou conquista é presumido. Funções puras, testadas em
 * extracurriculares.test.ts.
 */

import { differenceInCalendarDays } from 'date-fns';
import type {
  Atividade,
  CategoriaExtra,
  DocumentoAtividade,
  Oportunidade,
  StatusAtividade,
  StatusOportunidade,
  TipoDocumento,
} from '../tipos/dominio';
import { deISO, formatarData, isoValida } from './datas';
import { normalizar } from './texto';

export type Tom = 'neutro' | 'vinho' | 'verde' | 'ambar' | 'vermelho' | 'azul';

// ── Status ──────────────────────────────────────────────────────────────────

export const STATUS_PADRAO: StatusAtividade[] = [
  'quero_participar',
  'planejando',
  'inscricao_aberta',
  'inscricao_realizada',
  'em_andamento',
  'aguardando_resultado',
  'concluido',
  'cancelado',
];

export const STATUS_PUBLICACAO: StatusAtividade[] = [
  'ideia',
  'em_elaboracao',
  'submetido',
  'em_revisao',
  'aceito',
  'publicado',
  'cancelado',
];

export const ROTULOS_STATUS: Record<StatusAtividade, string> = {
  quero_participar: 'Quero participar',
  planejando: 'Planejando',
  inscricao_aberta: 'Inscrição aberta',
  inscricao_realizada: 'Inscrição realizada',
  em_andamento: 'Em andamento',
  aguardando_resultado: 'Aguardando resultado',
  concluido: 'Concluído',
  ideia: 'Ideia',
  em_elaboracao: 'Em elaboração',
  submetido: 'Submetido',
  em_revisao: 'Em revisão',
  aceito: 'Aceito',
  publicado: 'Publicado',
  cancelado: 'Cancelado',
};

export const TOM_STATUS: Record<StatusAtividade, Tom> = {
  quero_participar: 'neutro',
  planejando: 'neutro',
  inscricao_aberta: 'ambar',
  inscricao_realizada: 'azul',
  em_andamento: 'vinho',
  aguardando_resultado: 'ambar',
  concluido: 'verde',
  ideia: 'neutro',
  em_elaboracao: 'vinho',
  submetido: 'azul',
  em_revisao: 'ambar',
  aceito: 'azul',
  publicado: 'verde',
  cancelado: 'vermelho',
};

/** Só "Concluído" e "Publicado" contam como concluídos (e entram no portfólio). */
export const STATUS_CONCLUIDOS: StatusAtividade[] = ['concluido', 'publicado'];
export const STATUS_EM_ANDAMENTO: StatusAtividade[] = ['em_andamento', 'em_elaboracao', 'submetido', 'em_revisao', 'aceito'];

export type Situacao = 'concluida' | 'andamento' | 'planejada' | 'cancelada';

export function situacaoDaAtividade(status: StatusAtividade): Situacao {
  if (STATUS_CONCLUIDOS.includes(status)) return 'concluida';
  if (STATUS_EM_ANDAMENTO.includes(status)) return 'andamento';
  if (status === 'cancelado') return 'cancelada';
  return 'planejada';
}

export function statusDaCategoria(categoria: Pick<CategoriaExtra, 'conjunto_status'> | null | undefined): StatusAtividade[] {
  return categoria?.conjunto_status === 'publicacao' ? STATUS_PUBLICACAO : STATUS_PADRAO;
}

/** Status inicial ao criar ou ao trocar para uma categoria com outro conjunto. */
export function statusCompativel(status: StatusAtividade, categoria: Pick<CategoriaExtra, 'conjunto_status'> | null | undefined): StatusAtividade {
  const validos = statusDaCategoria(categoria);
  if (validos.includes(status)) return status;
  return categoria?.conjunto_status === 'publicacao' ? 'ideia' : 'planejando';
}

// ── Oportunidades ───────────────────────────────────────────────────────────

export const STATUS_OPORTUNIDADE: { valor: StatusOportunidade; rotulo: string }[] = [
  { valor: 'acompanhando', rotulo: 'Acompanhando' },
  { valor: 'preparando', rotulo: 'Preparando inscrição' },
  { valor: 'inscrito', rotulo: 'Inscrição enviada' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'nao_aprovado', rotulo: 'Não aprovado' },
  { valor: 'desistiu', rotulo: 'Desisti' },
];

export function rotuloStatusOportunidade(status: StatusOportunidade): string {
  return STATUS_OPORTUNIDADE.find((s) => s.valor === status)?.rotulo ?? status;
}

/** Status em que o prazo de inscrição ainda interessa ao aluno. */
const OPORTUNIDADE_PENDENTE: StatusOportunidade[] = ['acompanhando', 'preparando'];

export type SituacaoOportunidade = {
  chave: 'aberta' | 'encerrando' | 'abre_em_breve' | 'encerrada' | 'sem_datas';
  rotulo: string;
  tom: Tom;
  dias?: number;
};

/** Situação do período de inscrições, calculada só a partir das datas cadastradas. */
export function situacaoOportunidade(
  op: Pick<Oportunidade, 'data_abertura' | 'data_encerramento'>,
  hoje: string,
): SituacaoOportunidade {
  const { data_abertura: abre, data_encerramento: fecha } = op;
  if (!abre && !fecha) return { chave: 'sem_datas', rotulo: 'Datas não informadas', tom: 'neutro' };
  if (fecha && fecha < hoje) return { chave: 'encerrada', rotulo: 'Inscrições encerradas', tom: 'neutro' };
  if (abre && abre > hoje) {
    const dias = diasEntre(hoje, abre);
    return { chave: 'abre_em_breve', rotulo: dias === 1 ? 'Abre amanhã' : `Abre em ${dias} dias`, tom: 'azul', dias };
  }
  if (fecha) {
    const dias = diasEntre(hoje, fecha);
    if (dias <= 7) {
      const rotulo = dias === 0 ? 'Encerra hoje' : dias === 1 ? 'Encerra amanhã' : `Encerra em ${dias} dias`;
      return { chave: 'encerrando', rotulo, tom: dias <= 2 ? 'vermelho' : 'ambar', dias };
    }
    return { chave: 'aberta', rotulo: 'Inscrições abertas', tom: 'verde', dias };
  }
  return { chave: 'aberta', rotulo: 'Inscrições abertas', tom: 'verde' };
}

export function inscricoesAbertas(op: Pick<Oportunidade, 'data_abertura' | 'data_encerramento'>, hoje: string): boolean {
  const { chave } = situacaoOportunidade(op, hoje);
  return chave === 'aberta' || chave === 'encerrando';
}

// ── Documentos ──────────────────────────────────────────────────────────────

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; rotulo: string }[] = [
  { valor: 'certificado', rotulo: 'Certificado' },
  { valor: 'declaracao', rotulo: 'Declaração de participação' },
  { valor: 'comprovante_inscricao', rotulo: 'Comprovante de inscrição' },
  { valor: 'resumo', rotulo: 'Resumo científico' },
  { valor: 'artigo', rotulo: 'Artigo ou manuscrito' },
  { valor: 'edital', rotulo: 'Edital' },
  { valor: 'outro', rotulo: 'Outro documento' },
];

export function rotuloTipoDocumento(tipo: TipoDocumento): string {
  return TIPOS_DOCUMENTO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

/** Documentos que comprovam a carga horária realizada. */
export const TIPOS_COMPROVANTE: TipoDocumento[] = ['certificado', 'declaracao'];

export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;

/** Espelha o bucket e a restrição da tabela (o servidor também recusa). */
export const ARQUIVOS_PERMITIDOS: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

export const ACEITAR_ARQUIVOS = Object.entries(ARQUIVOS_PERMITIDOS)
  .flatMap(([mime, extensoes]) => [mime, ...extensoes.map((e) => `.${e}`)])
  .join(',');

export function validarArquivo(arquivo: { name: string; type: string; size: number }): string | undefined {
  const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? '';
  const extensoes = ARQUIVOS_PERMITIDOS[arquivo.type];
  if (!extensoes || !extensoes.includes(extensao)) return 'Envie um arquivo PDF, JPG, PNG, WEBP, DOC ou DOCX.';
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) return 'O arquivo passa de 10 MB.';
  return undefined;
}

/** Nome para o caminho no Storage: sem acentos, espaços ou barras. */
export function nomeSeguroArquivo(nome: string): string {
  const [base, ...resto] = nome.split('.').reverse();
  const corpo = resto.reverse().join('.') || base;
  const extensao = resto.length ? base.toLowerCase() : '';
  const limpo = corpo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'arquivo';
  return extensao ? `${limpo}.${extensao.replace(/[^a-z0-9]/g, '')}` : limpo;
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

// ── Campos específicos por categoria ────────────────────────────────────────
// Ficam em `atividades_extracurriculares.detalhes`. Os campos gerais (nome,
// instituição, período, carga horária, link, descrição) não se repetem aqui.

export type CampoEspecifico = {
  chave: string;
  rotulo: string;
  tipo: 'texto' | 'area' | 'data' | 'url' | 'selecao' | 'booleano';
  opcoes?: { valor: string; rotulo: string }[];
  dica?: string;
};

const MODALIDADE = [
  { valor: 'presencial', rotulo: 'Presencial' },
  { valor: 'online', rotulo: 'Online' },
  { valor: 'hibrido', rotulo: 'Híbrido' },
];

export const CAMPOS_ESPECIFICOS: Record<string, CampoEspecifico[]> = {
  liga: [
    { chave: 'especialidade', rotulo: 'Especialidade', tipo: 'texto' },
    { chave: 'cargo', rotulo: 'Cargo ou função', tipo: 'texto', dica: 'Ex.: membro, diretor científico, presidente.' },
    { chave: 'processo_seletivo', rotulo: 'Processo seletivo', tipo: 'texto', dica: 'Ex.: prova e entrevista em março.' },
  ],
  extensao: [
    { chave: 'funcao', rotulo: 'Função exercida', tipo: 'texto' },
    { chave: 'coordenador', rotulo: 'Professor ou coordenador', tipo: 'texto' },
  ],
  evento: [
    { chave: 'modalidade', rotulo: 'Modalidade', tipo: 'selecao', opcoes: MODALIDADE },
    { chave: 'prazo_inscricao', rotulo: 'Data-limite de inscrição', tipo: 'data' },
    { chave: 'prazo_submissao', rotulo: 'Data-limite para submissão de trabalhos', tipo: 'data' },
    {
      chave: 'status_inscricao',
      rotulo: 'Status da inscrição',
      tipo: 'selecao',
      opcoes: [
        { valor: 'nao_inscrito', rotulo: 'Ainda não inscrito' },
        { valor: 'inscrito', rotulo: 'Inscrito' },
        { valor: 'confirmado', rotulo: 'Inscrição confirmada' },
      ],
    },
    { chave: 'certificado_recebido', rotulo: 'Certificado recebido', tipo: 'booleano' },
  ],
  publicacao: [
    { chave: 'periodico', rotulo: 'Revista, periódico ou evento', tipo: 'texto' },
    { chave: 'doi', rotulo: 'DOI', tipo: 'texto', dica: 'Ex.: 10.1590/abc123. O link da publicação vai no campo "Link externo".' },
    {
      chave: 'tipo_producao',
      rotulo: 'Tipo de produção',
      tipo: 'selecao',
      opcoes: [
        { valor: 'artigo_original', rotulo: 'Artigo original' },
        { valor: 'revisao', rotulo: 'Artigo de revisão' },
        { valor: 'relato_caso', rotulo: 'Relato de caso' },
        { valor: 'resumo_anais', rotulo: 'Resumo em anais' },
        { valor: 'capitulo', rotulo: 'Capítulo de livro' },
        { valor: 'carta', rotulo: 'Carta ao editor' },
        { valor: 'outro', rotulo: 'Outro' },
      ],
    },
    {
      chave: 'papel',
      rotulo: 'Papel na publicação',
      tipo: 'selecao',
      opcoes: [
        { valor: 'autor', rotulo: 'Autor principal' },
        { valor: 'coautor', rotulo: 'Coautor' },
        { valor: 'colaborador', rotulo: 'Colaborador' },
      ],
    },
    { chave: 'data_submissao', rotulo: 'Data de submissão', tipo: 'data' },
    { chave: 'data_publicacao', rotulo: 'Data de publicação', tipo: 'data' },
  ],
  pesquisa: [
    { chave: 'linha_pesquisa', rotulo: 'Linha de pesquisa', tipo: 'texto' },
    { chave: 'orientador', rotulo: 'Orientador', tipo: 'texto' },
    { chave: 'marcos', rotulo: 'Entregas e marcos importantes', tipo: 'area', dica: 'Um por linha. Ex.: relatório parcial — agosto.' },
    { chave: 'link_documentos', rotulo: 'Link para documentos do projeto', tipo: 'url' },
  ],
  monitoria: [
    { chave: 'disciplina', rotulo: 'Disciplina', tipo: 'texto' },
    { chave: 'professor', rotulo: 'Professor responsável', tipo: 'texto' },
  ],
  voluntariado: [{ chave: 'funcao', rotulo: 'Função desempenhada', tipo: 'texto' }],
  estagio: [
    { chave: 'servico', rotulo: 'Serviço ou setor', tipo: 'texto', dica: 'Ex.: cardiologia — Hospital X.' },
    { chave: 'supervisor', rotulo: 'Supervisor', tipo: 'texto' },
  ],
  intercambio: [
    { chave: 'pais', rotulo: 'País e cidade', tipo: 'texto' },
    { chave: 'programa', rotulo: 'Programa', tipo: 'texto', dica: 'Ex.: IFMSA, convênio da universidade.' },
  ],
  apresentacao: [
    { chave: 'evento', rotulo: 'Evento', tipo: 'texto' },
    {
      chave: 'formato',
      rotulo: 'Formato',
      tipo: 'selecao',
      opcoes: [
        { valor: 'oral', rotulo: 'Apresentação oral' },
        { valor: 'poster', rotulo: 'Pôster' },
        { valor: 'outro', rotulo: 'Outro' },
      ],
    },
    { chave: 'prazo_submissao', rotulo: 'Data-limite para submissão', tipo: 'data' },
  ],
};

export function camposDaCategoria(categoria: Pick<CategoriaExtra, 'modelo_campos'> | null | undefined): CampoEspecifico[] {
  return (categoria?.modelo_campos && CAMPOS_ESPECIFICOS[categoria.modelo_campos]) || [];
}

export type Detalhes = Record<string, string | boolean>;

export function lerDetalhes(detalhes: unknown): Detalhes {
  if (!detalhes || typeof detalhes !== 'object' || Array.isArray(detalhes)) return {};
  const saida: Detalhes = {};
  for (const [chave, valor] of Object.entries(detalhes as Record<string, unknown>)) {
    if (typeof valor === 'string' || typeof valor === 'boolean') saida[chave] = valor;
  }
  return saida;
}

/** Mantém só os campos da categoria escolhida, sem valores vazios. */
export function limparDetalhes(detalhes: Detalhes, campos: CampoEspecifico[]): Detalhes {
  const saida: Detalhes = {};
  for (const campo of campos) {
    const valor = detalhes[campo.chave];
    if (campo.tipo === 'booleano') {
      if (valor === true) saida[campo.chave] = true;
    } else if (typeof valor === 'string' && valor.trim()) {
      saida[campo.chave] = valor.trim();
    }
  }
  return saida;
}

/** Valor legível de um campo específico (para detalhes e portfólio). */
export function textoDoCampo(campo: CampoEspecifico, valor: string | boolean | undefined): string | null {
  if (valor === undefined || valor === '' || valor === false) return null;
  if (campo.tipo === 'booleano') return 'Sim';
  if (campo.tipo === 'data' && typeof valor === 'string' && isoValida(valor)) return formatarData(valor, "d 'de' MMM 'de' yyyy");
  if (campo.tipo === 'selecao') return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? String(valor);
  return String(valor);
}

// ── Tags ────────────────────────────────────────────────────────────────────

/** "cardio, pesquisa,  Cardio" → ['cardio', 'pesquisa'] */
export function separarTags(texto: string): string[] {
  const vistas = new Set<string>();
  const tags: string[] = [];
  for (const parte of texto.split(',')) {
    const tag = parte.trim().replace(/\s+/g, ' ');
    if (!tag || vistas.has(normalizar(tag))) continue;
    vistas.add(normalizar(tag));
    tags.push(tag);
  }
  return tags;
}

export function validarTags(tags: string[]): string | undefined {
  if (tags.length > 20) return 'Use no máximo 20 tags.';
  if (tags.some((t) => t.length > 40)) return 'Cada tag pode ter até 40 caracteres.';
  return undefined;
}

// ── Prazos ──────────────────────────────────────────────────────────────────

export type Prazo = {
  chave: string;
  data: string;
  titulo: string;
  rotulo: string;
  origem: 'oportunidade' | 'atividade';
  id: string;
};

function diasEntre(de: string, ate: string): number {
  return differenceInCalendarDays(deISO(ate), deISO(de));
}

/** Prazos futuros (a partir de hoje), em ordem: inscrições e submissões. */
export function proximosPrazos(atividades: Atividade[], oportunidades: Oportunidade[], hoje: string): Prazo[] {
  const prazos: Prazo[] = [];

  for (const op of oportunidades) {
    if (!OPORTUNIDADE_PENDENTE.includes(op.status_inscricao)) continue;
    if (op.data_abertura && op.data_abertura >= hoje) {
      prazos.push({ chave: `op-abre-${op.id}`, data: op.data_abertura, titulo: op.titulo, rotulo: 'Abertura das inscrições', origem: 'oportunidade', id: op.id });
    }
    if (op.data_encerramento && op.data_encerramento >= hoje) {
      prazos.push({ chave: `op-fecha-${op.id}`, data: op.data_encerramento, titulo: op.titulo, rotulo: 'Encerramento das inscrições', origem: 'oportunidade', id: op.id });
    }
  }

  for (const a of atividades) {
    const situacao = situacaoDaAtividade(a.status);
    if (situacao === 'concluida' || situacao === 'cancelada') continue;
    const detalhes = lerDetalhes(a.detalhes);
    const inscricao = detalhes.prazo_inscricao;
    const submissao = detalhes.prazo_submissao;
    const jaInscrito = a.status !== 'quero_participar' && a.status !== 'planejando' && a.status !== 'inscricao_aberta';
    if (typeof inscricao === 'string' && isoValida(inscricao) && inscricao >= hoje && !jaInscrito) {
      prazos.push({ chave: `at-insc-${a.id}`, data: inscricao, titulo: a.titulo, rotulo: 'Prazo de inscrição', origem: 'atividade', id: a.id });
    }
    if (typeof submissao === 'string' && isoValida(submissao) && submissao >= hoje) {
      prazos.push({ chave: `at-sub-${a.id}`, data: submissao, titulo: a.titulo, rotulo: 'Submissão de trabalhos', origem: 'atividade', id: a.id });
    }
  }

  return prazos.sort((x, y) => x.data.localeCompare(y.data) || x.titulo.localeCompare(y.titulo, 'pt-BR'));
}

/** Prazo mais próximo da atividade (inscrição, submissão ou término). */
export function proximoPrazoDaAtividade(a: Atividade, hoje: string): string | null {
  const detalhes = lerDetalhes(a.detalhes);
  const datas = [detalhes.prazo_inscricao, detalhes.prazo_submissao, a.data_fim].filter(
    (d): d is string => typeof d === 'string' && isoValida(d) && d >= hoje,
  );
  return datas.sort()[0] ?? null;
}

// ── Carga horária ───────────────────────────────────────────────────────────

const horas = (valor: number | string | null | undefined) => Number(valor ?? 0) || 0;

export type ResumoHoras = {
  previstas: number;
  realizadas: number;
  /** Realizadas em atividades com certificado ou declaração anexados. */
  comprovadas: number;
  pendentes: number;
  /** Informadas pelo aluno como aceitas pela instituição. */
  aceitas: number;
  porCategoria: { categoriaId: string; realizadas: number; previstas: number; comprovadas: number }[];
};

export function atividadesComprovadas(documentos: Pick<DocumentoAtividade, 'atividade_id' | 'tipo'>[]): Set<string> {
  return new Set(documentos.filter((d) => TIPOS_COMPROVANTE.includes(d.tipo)).map((d) => d.atividade_id));
}

/** Atividades canceladas ficam de fora de todos os totais. */
export function resumoHoras(atividades: Atividade[], documentos: Pick<DocumentoAtividade, 'atividade_id' | 'tipo'>[]): ResumoHoras {
  const comprovadasIds = atividadesComprovadas(documentos);
  const porCategoria = new Map<string, { categoriaId: string; realizadas: number; previstas: number; comprovadas: number }>();
  let previstas = 0;
  let realizadas = 0;
  let comprovadas = 0;
  let aceitas = 0;

  for (const a of atividades) {
    if (a.status === 'cancelado') continue;
    const prev = horas(a.horas_previstas);
    const real = horas(a.horas_realizadas);
    const comp = comprovadasIds.has(a.id) ? real : 0;
    previstas += prev;
    realizadas += real;
    comprovadas += comp;
    aceitas += horas(a.horas_aceitas);
    const grupo = porCategoria.get(a.categoria_id) ?? { categoriaId: a.categoria_id, realizadas: 0, previstas: 0, comprovadas: 0 };
    grupo.previstas += prev;
    grupo.realizadas += real;
    grupo.comprovadas += comp;
    porCategoria.set(a.categoria_id, grupo);
  }

  return {
    previstas: arredondar(previstas),
    realizadas: arredondar(realizadas),
    comprovadas: arredondar(comprovadas),
    pendentes: arredondar(realizadas - comprovadas),
    aceitas: arredondar(aceitas),
    porCategoria: [...porCategoria.values()]
      .map((g) => ({ ...g, realizadas: arredondar(g.realizadas), previstas: arredondar(g.previstas), comprovadas: arredondar(g.comprovadas) }))
      .sort((a, b) => b.realizadas - a.realizadas || b.previstas - a.previstas),
  };
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatarHoras(n: number | string | null | undefined): string {
  return `${horas(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`;
}

// ── Painel ──────────────────────────────────────────────────────────────────

export type ResumoExtra = {
  total: number;
  andamento: number;
  concluidas: number;
  oportunidadesAbertas: number;
  certificados: number;
  horas: ResumoHoras;
  porCategoria: { categoriaId: string; quantidade: number }[];
  recentes: Atividade[];
  prazos: Prazo[];
};

export function resumoExtra(
  atividades: Atividade[],
  oportunidades: Oportunidade[],
  documentos: DocumentoAtividade[],
  hoje: string,
): ResumoExtra {
  const porCategoria = new Map<string, number>();
  for (const a of atividades) porCategoria.set(a.categoria_id, (porCategoria.get(a.categoria_id) ?? 0) + 1);

  return {
    total: atividades.length,
    andamento: atividades.filter((a) => situacaoDaAtividade(a.status) === 'andamento').length,
    concluidas: atividades.filter((a) => situacaoDaAtividade(a.status) === 'concluida').length,
    oportunidadesAbertas: oportunidades.filter(
      (o) => OPORTUNIDADE_PENDENTE.includes(o.status_inscricao) && inscricoesAbertas(o, hoje),
    ).length,
    certificados: documentos.filter((d) => d.tipo === 'certificado').length,
    horas: resumoHoras(atividades, documentos),
    porCategoria: [...porCategoria.entries()]
      .map(([categoriaId, quantidade]) => ({ categoriaId, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    recentes: [...atividades].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5),
    prazos: proximosPrazos(atividades, oportunidades, hoje),
  };
}

// ── Filtros, busca e ordenação ──────────────────────────────────────────────

export type FiltrosAtividades = {
  busca: string;
  categoria: string;
  status: StatusAtividade | '';
  instituicao: string;
  area: string;
  situacao: 'todas' | 'andamento' | 'concluidas';
  de: string;
  ate: string;
};

export const FILTROS_VAZIOS: FiltrosAtividades = {
  busca: '',
  categoria: '',
  status: '',
  instituicao: '',
  area: '',
  situacao: 'todas',
  de: '',
  ate: '',
};

export function filtrosAtivos(f: FiltrosAtividades): number {
  return [f.categoria, f.status, f.instituicao, f.area, f.de, f.ate].filter(Boolean).length + (f.situacao === 'todas' ? 0 : 1);
}

export function filtrarAtividades(lista: Atividade[], f: FiltrosAtividades): Atividade[] {
  const termo = normalizar(f.busca);
  return lista.filter((a) => {
    if (f.categoria && a.categoria_id !== f.categoria) return false;
    if (f.status && a.status !== f.status) return false;
    if (f.instituicao && normalizar(a.instituicao ?? '') !== normalizar(f.instituicao)) return false;
    if (f.area && normalizar(a.area_interesse ?? '') !== normalizar(f.area)) return false;
    if (f.situacao === 'andamento' && situacaoDaAtividade(a.status) !== 'andamento') return false;
    if (f.situacao === 'concluidas' && situacaoDaAtividade(a.status) !== 'concluida') return false;
    if (f.de || f.ate) {
      // Período: a atividade aparece se o intervalo dela cruza o filtro.
      const inicio = a.data_inicio ?? a.data_fim;
      const fim = a.data_fim ?? a.data_inicio;
      if (!inicio || !fim) return false;
      if (f.de && fim < f.de) return false;
      if (f.ate && inicio > f.ate) return false;
    }
    if (termo) {
      const texto = normalizar([a.titulo, a.instituicao, a.descricao, a.area_interesse, ...a.tags].filter(Boolean).join(' '));
      if (!texto.includes(termo)) return false;
    }
    return true;
  });
}

export type OrdemAtividades = 'atualizacao' | 'data' | 'prazo' | 'nome';

export const ORDENS: { valor: OrdemAtividades; rotulo: string }[] = [
  { valor: 'atualizacao', rotulo: 'Atualização recente' },
  { valor: 'data', rotulo: 'Data de início' },
  { valor: 'prazo', rotulo: 'Prazo mais próximo' },
  { valor: 'nome', rotulo: 'Nome' },
];

export function ordenarAtividades(lista: Atividade[], ordem: OrdemAtividades, hoje: string): Atividade[] {
  const copia = [...lista];
  const porNome = (a: Atividade, b: Atividade) => a.titulo.localeCompare(b.titulo, 'pt-BR');
  const nulosNoFim = (x: string | null, y: string | null, inverso = false) => {
    if (x === y) return 0;
    if (!x) return 1;
    if (!y) return -1;
    return inverso ? y.localeCompare(x) : x.localeCompare(y);
  };
  switch (ordem) {
    case 'nome':
      return copia.sort(porNome);
    case 'data':
      return copia.sort((a, b) => nulosNoFim(a.data_inicio, b.data_inicio, true) || porNome(a, b));
    case 'prazo':
      return copia.sort((a, b) => nulosNoFim(proximoPrazoDaAtividade(a, hoje), proximoPrazoDaAtividade(b, hoje)) || porNome(a, b));
    default:
      return copia.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
}

/** Valores já usados (instituições, áreas), para filtros e sugestões. */
export function valoresDistintos(lista: Atividade[], campo: 'instituicao' | 'area_interesse'): string[] {
  const mapa = new Map<string, string>();
  for (const a of lista) {
    const valor = a[campo]?.trim();
    if (valor && !mapa.has(normalizar(valor))) mapa.set(normalizar(valor), valor);
  }
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ── Período e linha do tempo ────────────────────────────────────────────────

const mesAno = (iso: string) => formatarData(iso, "MMM 'de' yyyy");

export function descreverPeriodo(a: Pick<Atividade, 'data_inicio' | 'data_fim' | 'status'>): string | null {
  const { data_inicio: inicio, data_fim: fim } = a;
  if (inicio && fim) {
    if (inicio === fim) return formatarData(inicio, "d 'de' MMM 'de' yyyy");
    return `${mesAno(inicio)} – ${mesAno(fim)}`;
  }
  if (inicio) return situacaoDaAtividade(a.status) === 'andamento' ? `desde ${mesAno(inicio)}` : mesAno(inicio);
  if (fim) return `até ${mesAno(fim)}`;
  return null;
}

/** Data usada para posicionar a atividade na linha do tempo. */
export function dataDeReferencia(a: Atividade): { data: string; informada: boolean } {
  const detalhes = lerDetalhes(a.detalhes);
  const candidatas = [a.data_inicio, detalhes.data_publicacao, detalhes.data_submissao, a.data_fim];
  const data = candidatas.find((d): d is string => typeof d === 'string' && isoValida(d));
  return data ? { data, informada: true } : { data: a.created_at.slice(0, 10), informada: false };
}

export type GrupoLinhaDoTempo = { ano: string; itens: { atividade: Atividade; data: string; informada: boolean }[] };

export function linhaDoTempo(atividades: Atividade[]): GrupoLinhaDoTempo[] {
  const itens = atividades
    .map((atividade) => ({ atividade, ...dataDeReferencia(atividade) }))
    .sort((a, b) => b.data.localeCompare(a.data) || a.atividade.titulo.localeCompare(b.atividade.titulo, 'pt-BR'));
  const grupos: GrupoLinhaDoTempo[] = [];
  for (const item of itens) {
    const ano = item.data.slice(0, 4);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.ano === ano) ultimo.itens.push(item);
    else grupos.push({ ano, itens: [item] });
  }
  return grupos;
}

// ── Portfólio ───────────────────────────────────────────────────────────────

export const SECOES_PORTFOLIO: { chave: string; titulo: string }[] = [
  { chave: 'extensao', titulo: 'Projetos de extensão' },
  { chave: 'ligas', titulo: 'Ligas acadêmicas' },
  { chave: 'pesquisa', titulo: 'Iniciação científica e pesquisa' },
  { chave: 'publicacoes', titulo: 'Artigos e publicações' },
  { chave: 'congressos', titulo: 'Congressos e apresentações' },
  { chave: 'voluntariado', titulo: 'Voluntariado' },
  { chave: 'monitorias', titulo: 'Monitorias' },
  { chave: 'intercambios', titulo: 'Intercâmbios' },
  { chave: 'outras', titulo: 'Outras atividades' },
];

export type SecaoPortfolio = { chave: string; titulo: string; itens: Atividade[] };

/**
 * Só atividades concluídas ("Concluído") e publicações publicadas entram.
 * Nada em andamento, submetido ou aceito aparece como concluído.
 */
export function montarPortfolio(atividades: Atividade[], categorias: Map<string, CategoriaExtra>): SecaoPortfolio[] {
  const concluidas = atividades.filter((a) => STATUS_CONCLUIDOS.includes(a.status));
  const conhecidas = new Set(SECOES_PORTFOLIO.map((s) => s.chave));
  const porSecao = new Map<string, Atividade[]>();
  for (const a of concluidas) {
    const secao = categorias.get(a.categoria_id)?.secao_portfolio ?? 'outras';
    const chave = conhecidas.has(secao) ? secao : 'outras';
    porSecao.set(chave, [...(porSecao.get(chave) ?? []), a]);
  }
  return SECOES_PORTFOLIO.filter((s) => porSecao.has(s.chave)).map((s) => ({
    ...s,
    itens: porSecao
      .get(s.chave)!
      .sort((a, b) => dataDeReferencia(b).data.localeCompare(dataDeReferencia(a).data) || a.titulo.localeCompare(b.titulo, 'pt-BR')),
  }));
}
