import { CalendarRange, List } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { ListaTarefas } from '../../componentes/tarefas/ListaTarefas';
import { PlannerSemanal } from '../../componentes/tarefas/PlannerSemanal';
import { TituloPagina } from '../../componentes/ui/Visuais';
import { useTituloPagina } from '../../hooks/useUtilitarios';

const ABAS = [
  { valor: 'lista', rotulo: 'Lista', icone: List },
  { valor: 'planner', rotulo: 'Planner semanal', icone: CalendarRange },
] as const;

export function Tarefas() {
  const [parametros, setParametros] = useSearchParams();
  const aba = parametros.get('aba') === 'planner' ? 'planner' : 'lista';
  useTituloPagina(aba === 'planner' ? 'Planner semanal' : 'Tarefas');

  return (
    <>
      <TituloPagina
        titulo="Tarefas"
        descricao={
          aba === 'planner'
            ? 'Distribua as tarefas pelos dias da semana. O prazo de cada uma não muda.'
            : 'Tudo o que precisa ser feito, ordenado por prazo e prioridade.'
        }
      />
      <div role="tablist" aria-label="Modo de visualização das tarefas" className="mb-5 flex gap-1 border-b border-stone-200">
        {ABAS.map(({ valor, rotulo, icone: Icone }) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={aba === valor}
            onClick={() => setParametros(valor === 'lista' ? {} : { aba: valor }, { replace: true })}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              aba === valor ? 'border-vinho-600 text-vinho-700' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Icone aria-hidden className="size-4" />
            {rotulo}
          </button>
        ))}
      </div>
      {aba === 'planner' ? <PlannerSemanal /> : <ListaTarefas />}
    </>
  );
}
