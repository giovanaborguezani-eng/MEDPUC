/** Minúsculas e sem acentos, para comparar termos de busca. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}


/** plural(1, 'tarefa', 'tarefas') → '1 tarefa' */
export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}

export function saudacao(agora = new Date()): string {
  const h = agora.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Primeiro caractere visível (um emoji conta como um só, mesmo com vários códigos). */
export function primeiroGrafema(texto: string): string {
  const limpo = texto.trim();
  if (!limpo) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const [primeiro] = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(limpo);
    return primeiro?.segment ?? '';
  }
  return Array.from(limpo)[0] ?? '';
}

/** Um único emoji (inclui sequências como 🧑‍⚕️ e 👁️). */
export function ehEmoji(texto: string): boolean {
  const limpo = texto.trim();
  return !!limpo && primeiroGrafema(limpo) === limpo && /\p{Extended_Pictographic}/u.test(limpo);
}

/** Símbolo da disciplina: o emoji escolhido ou a inicial do nome. */
export function simboloDisciplina(disciplina: { nome: string; emoji?: string | null }): { texto: string; emoji: boolean } {
  if (disciplina.emoji) return { texto: disciplina.emoji, emoji: true };
  const inicial = primeiroGrafema(disciplina.nome);
  return { texto: inicial.toLocaleUpperCase('pt-BR'), emoji: ehEmoji(inicial) };
}
