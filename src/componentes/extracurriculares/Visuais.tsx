import {
  BookOpen,
  FileText,
  FlaskConical,
  Folder,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  Landmark,
  Megaphone,
  Microscope,
  Plane,
  Presentation,
  Stethoscope,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { comTransparencia } from '../../lib/cores';
import { ROTULOS_STATUS, TOM_STATUS } from '../../lib/extracurriculares';
import type { CategoriaExtra, StatusAtividade } from '../../tipos/dominio';
import { Etiqueta } from '../ui/Visuais';

/** Ícones disponíveis para o catálogo de categorias (coluna `icone`). */
const ICONES: Record<string, LucideIcon> = {
  'hand-heart': HandHeart,
  users: Users,
  presentation: Presentation,
  'book-open': BookOpen,
  'file-text': FileText,
  'flask-conical': FlaskConical,
  microscope: Microscope,
  'graduation-cap': GraduationCap,
  'heart-handshake': HeartHandshake,
  stethoscope: Stethoscope,
  plane: Plane,
  landmark: Landmark,
  trophy: Trophy,
  megaphone: Megaphone,
  folder: Folder,
};

export function IconeCategoria({ categoria, className = 'size-4' }: { categoria?: CategoriaExtra | null; className?: string }) {
  const Icone = (categoria && ICONES[categoria.icone]) || Folder;
  return <Icone aria-hidden className={className} />;
}

/** Quadrado colorido com o ícone da categoria. */
export function SeloCategoria({ categoria, tamanho = 'md' }: { categoria?: CategoriaExtra | null; tamanho?: 'sm' | 'md' }) {
  const cor = categoria?.cor ?? '#78716C';
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-lg ${tamanho === 'sm' ? 'size-7' : 'size-9'}`}
      style={{ backgroundColor: comTransparencia(cor, 0.12), color: cor }}
    >
      <IconeCategoria categoria={categoria} className={tamanho === 'sm' ? 'size-3.5' : 'size-[18px]'} />
    </span>
  );
}

export function EtiquetaCategoria({ categoria }: { categoria?: CategoriaExtra | null }) {
  return <Etiqueta cor={categoria?.cor ?? '#78716C'}>{categoria?.nome ?? 'Categoria removida'}</Etiqueta>;
}

export function EtiquetaStatus({ status }: { status: StatusAtividade }) {
  return <Etiqueta tom={TOM_STATUS[status]}>{ROTULOS_STATUS[status]}</Etiqueta>;
}

/** Bloco de indicador do painel. */
export function Indicador({
  rotulo,
  valor,
  icone,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  icone: ReactNode;
  detalhe?: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-cartao ${
        destaque ? 'border-vinho-200 bg-vinho-50/60' : 'border-stone-200/80 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-500">{rotulo}</span>
        <span className="text-vinho-600">{icone}</span>
      </div>
      <span className="font-serif text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</span>
      {detalhe && <span className="text-xs text-stone-500">{detalhe}</span>}
    </div>
  );
}
