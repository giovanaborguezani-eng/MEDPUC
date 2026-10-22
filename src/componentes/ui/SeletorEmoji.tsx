import { useId, useState } from 'react';
import { ehEmoji } from '../../lib/texto';

/** Sugestões para disciplinas de Medicina; qualquer outro emoji pode ser colado. */
export const EMOJIS_DISCIPLINAS = [
  '🧠', '🫀', '🫁', '🦴', '💪', '🧬', '🔬', '🧪', '🦠', '💊', '💉', '🩺',
  '🩻', '🩸', '👁️', '👂', '👃', '👅', '🦷', '🤰', '👶', '🧓', '🧘', '🍎',
  '🌡️', '🏥', '🚑', '⚕️', '🧑‍⚕️', '📚', '📖', '✍️', '📊', '💡', '🤟', '🗣️',
];

type Props = { valor: string; aoMudar: (emoji: string) => void; erro?: string };

export function SeletorEmoji({ valor, aoMudar, erro }: Props) {
  const id = useId();
  const [outro, setOutro] = useState(() => (valor && !EMOJIS_DISCIPLINAS.includes(valor) ? valor : ''));
  const [erroOutro, setErroOutro] = useState<string>();

  function escolherOutro(texto: string) {
    setOutro(texto);
    const limpo = texto.trim();
    if (!limpo) {
      setErroOutro(undefined);
      return;
    }
    if (ehEmoji(limpo)) {
      setErroOutro(undefined);
      aoMudar(limpo);
    } else {
      setErroOutro('Cole ou digite um único emoji.');
    }
  }

  const mensagem = erro ?? erroOutro;
  const classeOpcao = (selecionada: boolean) =>
    `flex size-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-110 hover:bg-stone-100 ${
      selecionada ? 'bg-vinho-50 ring-2 ring-vinho-600' : ''
    }`;

  return (
    <fieldset>
      <legend className="mb-1.5 flex items-baseline gap-1.5 text-sm font-medium text-stone-700">
        Emoji <span className="text-xs font-normal text-stone-500">(opcional)</span>
      </legend>
      <div role="radiogroup" aria-label="Emoji da disciplina" aria-describedby={mensagem ? `${id}-erro` : undefined} className="flex flex-wrap gap-1">
        <button
          type="button"
          role="radio"
          aria-checked={!valor}
          aria-label="Sem emoji (usar a inicial)"
          title="Sem emoji"
          onClick={() => {
            aoMudar('');
            setOutro('');
            setErroOutro(undefined);
          }}
          className={`${classeOpcao(!valor)} text-xs font-medium text-stone-500`}
        >
          Aa
        </button>
        {EMOJIS_DISCIPLINAS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={valor === emoji}
            aria-label={`Emoji ${emoji}`}
            onClick={() => {
              aoMudar(emoji);
              setOutro('');
              setErroOutro(undefined);
            }}
            className={classeOpcao(valor === emoji)}
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={`${id}-outro`} className="text-xs text-stone-500">
          Outro:
        </label>
        <input
          id={`${id}-outro`}
          value={outro}
          onChange={(e) => escolherOutro(e.target.value)}
          placeholder="Cole um emoji"
          maxLength={16}
          aria-invalid={erroOutro ? true : undefined}
          className="h-8 w-32 rounded-lg border border-stone-300 bg-white px-2 text-base shadow-sm focus:border-vinho-500 focus:ring-2 focus:ring-vinho-100 focus:outline-none"
        />
        <span className="text-xs text-stone-400">No Mac: Control + Command + Espaço</span>
      </div>
      {mensagem && (
        <p id={`${id}-erro`} className="mt-1.5 text-xs text-red-600">
          {mensagem}
        </p>
      )}
    </fieldset>
  );
}
