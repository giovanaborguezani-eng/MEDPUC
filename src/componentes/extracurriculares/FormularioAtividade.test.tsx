import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderizar } from '../../testes/utilitarios';
import { FormularioAtividade } from './FormularioAtividade';

const servico = vi.hoisted(() => ({
  criarAtividade: vi.fn(),
  atualizarAtividade: vi.fn(),
  listarAtividades: vi.fn().mockResolvedValue([]),
  listarCategoriasExtra: vi.fn().mockResolvedValue([
    { id: 'liga', nome: 'Ligas acadêmicas', modelo_campos: 'liga', conjunto_status: 'padrao', cor: '#8C1D40', icone: 'users' },
    { id: 'publicacao', nome: 'Artigos científicos e publicações', modelo_campos: 'publicacao', conjunto_status: 'publicacao', cor: '#B4234F', icone: 'file-text' },
  ]),
}));
vi.mock('../../servicos/extracurriculares', () => servico);

beforeEach(() => vi.clearAllMocks());

async function escolherCategoria(nome: string) {
  await screen.findByRole('option', { name: nome });
  await userEvent.selectOptions(screen.getByLabelText('Categoria'), nome);
}

describe('FormularioAtividade', () => {
  it('mostra os campos e os status da categoria escolhida', async () => {
    renderizar(<FormularioAtividade aberto aoFechar={vi.fn()} />);
    await escolherCategoria('Ligas acadêmicas');
    expect(screen.getByLabelText(/Cargo ou função/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/DOI/)).toBeNull();
    const status = screen.getByLabelText('Status');
    expect(within(status).queryByRole('option', { name: 'Publicado' })).toBeNull();

    await userEvent.selectOptions(status, 'inscricao_realizada');
    await escolherCategoria('Artigos científicos e publicações');
    expect(screen.getByLabelText(/DOI/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Cargo ou função/)).toBeNull();
    // O status de inscrição não existe para publicações: volta ao inicial.
    expect(screen.getByLabelText('Status')).toHaveValue('ideia');
  });

  it('valida nome, categoria, horas, datas e link antes de salvar', async () => {
    renderizar(<FormularioAtividade aberto aoFechar={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('O nome é obrigatório.')).toBeInTheDocument();
    expect(screen.getByText('Escolha a categoria.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nome da atividade'), 'Liga de Cardiologia');
    await escolherCategoria('Ligas acadêmicas');
    await userEvent.type(screen.getByLabelText(/Horas realizadas/), 'doze');
    await userEvent.type(screen.getByLabelText(/Data de início/), '2026-05-01');
    await userEvent.type(screen.getByLabelText(/Data de término/), '2026-04-01');
    await userEvent.type(screen.getByLabelText(/Link externo/), 'site sem protocolo');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Use um número, com até duas casas decimais.')).toBeInTheDocument();
    expect(screen.getByText('O término precisa ser depois do início.')).toBeInTheDocument();
    expect(screen.getByText('Informe um endereço começando com https://')).toBeInTheDocument();
    expect(servico.criarAtividade).not.toHaveBeenCalled();
  });

  it('salva só os campos da categoria, com horas e tags normalizadas', async () => {
    servico.criarAtividade.mockResolvedValue({ id: 'a1' });
    const aoFechar = vi.fn();
    const aoSalvar = vi.fn();
    renderizar(<FormularioAtividade aberto aoFechar={aoFechar} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByLabelText('Nome da atividade'), 'Liga de Cardiologia');
    await escolherCategoria('Ligas acadêmicas');
    await userEvent.type(screen.getByLabelText(/Cargo ou função/), 'Diretora');
    await userEvent.type(screen.getByLabelText(/Horas realizadas/), '12,5');
    await userEvent.type(screen.getByLabelText(/^Tags/), 'cardio, Cardio, liderança');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(aoSalvar).toHaveBeenCalledWith({ id: 'a1' });
    expect(servico.criarAtividade).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Liga de Cardiologia',
        categoria_id: 'liga',
        status: 'planejando',
        horas_realizadas: 12.5,
        horas_previstas: null,
        horas_aceitas: null,
        tags: ['cardio', 'liderança'],
        detalhes: { cargo: 'Diretora' },
      }),
    );
  });
});
