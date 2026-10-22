import { describe, expect, it } from 'vitest';
import { ehEmoji, primeiroGrafema, simboloDisciplina } from './texto';

describe('emoji das disciplinas', () => {
  it('pega o primeiro caractere visível sem partir emojis', () => {
    expect(primeiroGrafema('🧠 Neuroanatomia')).toBe('🧠');
    expect(primeiroGrafema('🧑‍⚕️ Semiologia')).toBe('🧑‍⚕️');
    expect(primeiroGrafema('  Libras')).toBe('L');
    expect(primeiroGrafema('')).toBe('');
  });

  it('reconhece um único emoji', () => {
    expect(ehEmoji('🫀')).toBe(true);
    expect(ehEmoji('👁️')).toBe(true);
    expect(ehEmoji('🧑‍⚕️')).toBe(true);
    expect(ehEmoji('🧠🫀')).toBe(false);
    expect(ehEmoji('A')).toBe(false);
    expect(ehEmoji('<b>')).toBe(false);
  });

  it('usa o emoji escolhido, senão a inicial (inclusive um emoji no começo do nome)', () => {
    expect(simboloDisciplina({ nome: 'Sentidos', emoji: '👁️' })).toEqual({ texto: '👁️', emoji: true });
    expect(simboloDisciplina({ nome: 'método científico', emoji: null })).toEqual({ texto: 'M', emoji: false });
    expect(simboloDisciplina({ nome: '🧠 Neuroanatomia' })).toEqual({ texto: '🧠', emoji: true });
  });
});
