import { Plus } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext } from 'react-router';
import { FormularioAtividade } from '../../../componentes/extracurriculares/FormularioAtividade';
import { Botao } from '../../../componentes/ui/Botao';
import { TituloPagina } from '../../../componentes/ui/Visuais';

const ABAS = [
  { para: '', rotulo: 'Painel', fim: true },
  { para: 'atividades', rotulo: 'Atividades' },
  { para: 'oportunidades', rotulo: 'Oportunidades e prazos' },
  { para: 'carga-horaria', rotulo: 'Carga horária' },
  { para: 'portfolio', rotulo: 'Meu portfólio' },
];

type Contexto = { novaAtividade: (categoria?: string) => void };

/** Abre o formulário de nova atividade a partir de qualquer aba. */
export function useNovaAtividade() {
  return useOutletContext<Contexto>().novaAtividade;
}

export default function LayoutExtracurriculares() {
  const navegar = useNavigate();
  const [formulario, setFormulario] = useState<{ aberto: boolean; categoria?: string }>({ aberto: false });
  const novaAtividade = (categoria?: string) => setFormulario({ aberto: true, categoria });

  return (
    <>
      <div className="print:hidden">
        <TituloPagina
          titulo="Extracurriculares"
          descricao="Sua trajetória fora da grade: ligas, pesquisa, extensão, eventos, publicações e horas."
          acoes={
            <Botao icone={<Plus aria-hidden className="size-4" />} onClick={() => novaAtividade()}>
              Adicionar atividade
            </Botao>
          }
        />
        <nav aria-label="Seções de extracurriculares" className="-mx-4 mb-6 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1">
            {ABAS.map((aba) => (
              <li key={aba.para}>
                <NavLink
                  to={aba.para}
                  end={aba.fim}
                  className={({ isActive }) =>
                    `-mb-px inline-block border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'border-vinho-600 text-vinho-700' : 'border-transparent text-stone-500 hover:text-stone-800'
                    }`
                  }
                >
                  {aba.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Outlet context={{ novaAtividade } satisfies Contexto} />

      <FormularioAtividade
        aberto={formulario.aberto}
        categoriaInicial={formulario.categoria}
        aoFechar={() => setFormulario({ aberto: false })}
        aoSalvar={(atividade) => navegar(`/app/extracurriculares/atividades/${atividade.id}`)}
      />
    </>
  );
}
