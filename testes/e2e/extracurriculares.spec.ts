import { expect, test } from '@playwright/test';
import { criarAluno, entrar, isoDaqui } from './apoio';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');

test('cria, edita, filtra, muda status e exclui atividades; tudo persiste', async ({ page }) => {
  const aluno = await criarAluno('Helena Prado');
  await entrar(page, aluno.email);

  await page.getByRole('navigation', { name: 'Principal' }).first().getByRole('link', { name: 'Extracurriculares' }).click();
  await expect(page).toHaveURL(/\/app\/extracurriculares$/);
  await expect(page.getByText('Sua trajetória começa aqui')).toBeVisible();

  // Liga acadêmica, com campos específicos.
  await page.getByRole('button', { name: 'Adicionar primeira atividade' }).click();
  let dialogo = page.getByRole('dialog', { name: 'Nova atividade' });
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialogo.getByText('O nome é obrigatório.')).toBeVisible();
  await expect(dialogo.getByText('Escolha a categoria.')).toBeVisible();
  await dialogo.getByLabel('Nome da atividade').fill('Liga Acadêmica de Cardiologia');
  await dialogo.getByLabel('Categoria').selectOption({ label: 'Ligas acadêmicas' });
  await dialogo.getByLabel('Instituição ou organização').fill('PUCPR');
  await dialogo.getByLabel('Status', { exact: true }).selectOption('em_andamento');
  await dialogo.getByLabel('Data de início').fill('2026-03-02');
  await dialogo.getByLabel('Horas previstas').fill('40');
  await dialogo.getByLabel('Horas realizadas').fill('12');
  await dialogo.getByLabel('Cargo ou função').fill('Diretora científica');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(page).toHaveURL(/\/atividades\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Liga Acadêmica de Cardiologia' })).toBeVisible();
  await expect(page.getByText('Diretora científica')).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).click();
  dialogo = page.getByRole('dialog', { name: 'Editar atividade' });
  await dialogo.getByLabel('Horas realizadas').fill('20,5');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('20,5 h')).toBeVisible();

  // Publicação: só status de publicação.
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  dialogo = page.getByRole('dialog', { name: 'Nova atividade' });
  await dialogo.getByLabel('Nome da atividade').fill('Revisão sobre insuficiência cardíaca');
  await dialogo.getByLabel('Categoria').selectOption({ label: 'Artigos científicos e publicações' });
  await expect(dialogo.getByLabel('Status', { exact: true }).locator('option', { hasText: 'Inscrição realizada' })).toHaveCount(0);
  await dialogo.getByLabel('Status', { exact: true }).selectOption('submetido');
  await dialogo.getByLabel('Papel na publicação').selectOption('coautor');
  await dialogo.getByLabel('Tags').fill('cardiologia, revisão');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Revisão sobre insuficiência cardíaca' })).toBeVisible();
  await expect(page.getByText('Coautor')).toBeVisible();

  // Congresso.
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  dialogo = page.getByRole('dialog', { name: 'Nova atividade' });
  await dialogo.getByLabel('Nome da atividade').fill('Congresso Paranaense de Neurologia');
  await dialogo.getByLabel('Categoria').selectOption({ label: 'Congressos e eventos científicos' });
  await dialogo.getByLabel('Modalidade').selectOption('presencial');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('heading', { name: 'Congresso Paranaense de Neurologia' })).toBeVisible();

  // Lista: busca, filtros e modos.
  await page.getByRole('link', { name: 'Atividades', exact: true }).click();
  await expect(page.getByText('3 atividades')).toBeVisible();
  await page.getByLabel('Pesquisar atividades').fill('cardiaca');
  await expect(page.getByText('1 de 3 atividades')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Revisão sobre insuficiência cardíaca' })).toBeVisible();
  await page.getByLabel('Pesquisar atividades').fill('');
  await page.getByRole('button', { name: /^Filtros/ }).click();
  await page.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Ligas acadêmicas' });
  await expect(page.getByText('1 de 3 atividades')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByRole('button', { name: 'Em andamento' }).click();
  await expect(page.getByText('2 de 3 atividades')).toBeVisible();
  await page.getByRole('button', { name: 'Todas', exact: true }).click();

  await page.getByRole('button', { name: 'Por categoria' }).click();
  await expect(page.getByRole('heading', { name: /Ligas acadêmicas/ })).toBeVisible();
  await page.getByRole('button', { name: 'Linha do tempo' }).click();
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible();
  await page.getByRole('button', { name: 'Todos', exact: true }).click();

  // Status direto no cartão.
  await page.getByLabel('Status de Liga Acadêmica de Cardiologia').selectOption('concluido');
  await expect(page.getByText('Status alterado para "Concluído".')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Status de Liga Acadêmica de Cardiologia')).toHaveValue('concluido');

  // Exclusão com confirmação.
  await page.getByRole('link', { name: 'Abrir Congresso Paranaense de Neurologia' }).click();
  await page.getByRole('button', { name: 'Excluir' }).click();
  const confirmacao = page.getByRole('dialog', { name: 'Excluir atividade?' });
  await confirmacao.getByRole('button', { name: 'Excluir' }).click();
  await expect(page).toHaveURL(/\/extracurriculares\/atividades$/);
  await expect(page.getByText('2 atividades')).toBeVisible();
  await expect(page.getByText('Congresso Paranaense de Neurologia')).toHaveCount(0);

  // Painel com números reais.
  await page.getByRole('link', { name: 'Painel', exact: true }).last().click();
  const indicadores = page.getByRole('region', { name: 'Indicadores' });
  await expect(indicadores).toContainText('Atividades2');
  await expect(indicadores).toContainText('Concluídas1');
  await expect(indicadores).toContainText('Horas realizadas20,5 h');
});

test('oportunidade com prazo vira atividade acompanhada, sem duplicar', async ({ page }) => {
  const aluno = await criarAluno('Igor Lima');
  await entrar(page, aluno.email);
  await page.goto('/app/extracurriculares/oportunidades');
  await expect(page.getByText('Nenhuma oportunidade cadastrada')).toBeVisible();

  await page.getByRole('button', { name: 'Nova oportunidade' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Nova oportunidade' });
  await dialogo.getByLabel('Nome', { exact: true }).fill('Processo seletivo da Liga de Neurologia');
  await dialogo.getByLabel('Categoria').selectOption({ label: 'Ligas acadêmicas' });
  await dialogo.getByLabel('Abertura das inscrições').fill(isoDaqui(-2));
  await dialogo.getByLabel('Encerramento das inscrições').fill(isoDaqui(3));
  await dialogo.getByLabel('Requisitos').fill('Estar a partir do 2º período');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Encerra em 3 dias')).toBeVisible();
  await page.getByRole('link', { name: 'Painel', exact: true }).last().click();
  await expect(page.getByRole('region', { name: 'Indicadores' })).toContainText('Inscrições abertas1');
  await expect(page.getByText('Encerramento das inscrições')).toBeVisible();

  await page.getByRole('link', { name: 'Oportunidades e prazos' }).click();
  await page.getByRole('button', { name: 'Acompanhar como atividade' }).click();
  await expect(page.getByRole('heading', { name: 'Processo seletivo da Liga de Neurologia' })).toBeVisible();
  await expect(page.getByText('Requisitos: Estar a partir do 2º período')).toBeVisible();
  await expect(page.getByLabel('Status de Processo seletivo da Liga de Neurologia')).toHaveValue('inscricao_aberta');

  await page.getByRole('link', { name: 'Oportunidades e prazos' }).click();
  await expect(page.getByRole('link', { name: 'Ver atividade' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acompanhar como atividade' })).toHaveCount(0);

  // Atualizar a oportunidade.
  await page.getByRole('button', { name: 'Editar Processo seletivo da Liga de Neurologia' }).click();
  const edicao = page.getByRole('dialog', { name: 'Editar oportunidade' });
  await edicao.getByLabel('Status da inscrição').selectOption('inscrito');
  await edicao.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Inscrição enviada')).toBeVisible();

  const { data } = await aluno.cliente.from('atividades_extracurriculares').select('id');
  expect(data).toHaveLength(1);
});

test('certificado: envio, download autorizado, carga horária e portfólio para impressão', async ({ page }) => {
  const aluno = await criarAluno('Júlia Campos');
  const concluida = await aluno.cliente
    .from('atividades_extracurriculares')
    .insert({ categoria_id: 'extensao', titulo: 'Projeto Saúde na Escola', status: 'concluido', horas_previstas: 12, horas_realizadas: 10, observacoes: 'nota privada' })
    .select()
    .single();
  await aluno.cliente
    .from('atividades_extracurriculares')
    .insert({ categoria_id: 'publicacao', titulo: 'Artigo ainda em revisão', status: 'em_revisao', horas_realizadas: 6 });
  await entrar(page, aluno.email);

  await page.goto(`/app/extracurriculares/atividades/${concluida.data!.id}`);
  await page.getByLabel('Arquivo').setInputFiles({ name: 'programa.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await expect(page.getByText('Envie um arquivo PDF, JPG, PNG, WEBP, DOC ou DOCX.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar' })).toBeDisabled();

  await page.getByLabel('Tipo de documento').selectOption('certificado');
  await page.getByLabel('Arquivo').setInputFiles({ name: 'certificado.pdf', mimeType: 'application/pdf', buffer: PDF });
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText('"certificado.pdf" foi salvo com segurança.')).toBeVisible();
  await expect(page.getByText('certificado.pdf', { exact: true })).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar certificado.pdf' }).click();
  expect((await download).suggestedFilename()).toBe('certificado.pdf');

  await page.reload();
  await expect(page.getByText('certificado.pdf', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Carga horária' }).click();
  const totais = page.getByRole('region', { name: 'Totais de horas' });
  await expect(totais).toContainText('Realizadas16 h');
  await expect(totais).toContainText('Comprovadas10 h');
  await expect(totais).toContainText('Sem comprovante6 h');
  await expect(totais).toContainText('Aceitas pela instituição0 h');
  await expect(page.getByText('Nenhuma exigência cadastrada')).toBeVisible();

  await page.getByLabel('Meta pessoal de horas').fill('100');
  await page.getByLabel('Horas exigidas pela instituição').fill('120');
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(page.getByText('Informe de onde vem a regra (regulamento, edital, coordenação).')).toBeVisible();
  await page.getByLabel('Fonte da regra').fill('Regulamento de atividades complementares, art. 4º');
  await page.getByRole('button', { name: 'Salvar metas' }).click();
  await expect(page.getByText('Metas salvas.')).toBeVisible();
  await expect(page.getByText('Regra cadastrada por você')).toBeVisible();
  await expect(page.getByText('Não verificada')).toBeVisible();

  await page.getByRole('link', { name: 'Meu portfólio' }).click();
  await expect(page.getByRole('heading', { name: 'Projetos de extensão' })).toBeVisible();
  await expect(page.getByText('Projeto Saúde na Escola')).toBeVisible();
  await expect(page.getByText('Artigo ainda em revisão')).toHaveCount(0);
  await expect(page.getByText('nota privada')).toHaveCount(0);

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Seções de extracurriculares' })).toBeHidden();
  await expect(page.getByText('Projeto Saúde na Escola')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });

  // Excluir a atividade remove também o arquivo do Storage.
  const { data: docs } = await aluno.cliente.from('documentos_extracurriculares').select('caminho');
  await page.goto(`/app/extracurriculares/atividades/${concluida.data!.id}`);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('dialog', { name: 'Excluir atividade?' }).getByRole('button', { name: 'Excluir' }).click();
  await expect(page).toHaveURL(/\/extracurriculares\/atividades$/);
  const restante = await aluno.cliente.storage.from('documentos-extracurriculares').download(docs![0].caminho);
  expect(restante.error).not.toBeNull();
});

test('outra conta não abre atividades nem vê documentos pela interface', async ({ page }) => {
  const ana = await criarAluno('Lívia Torres');
  const bruno = await criarAluno('Otávio Reis');
  const atividade = await ana.cliente
    .from('atividades_extracurriculares')
    .insert({ categoria_id: 'liga', titulo: 'Liga privada da Lívia' })
    .select()
    .single();

  await entrar(page, bruno.email);
  await page.goto(`/app/extracurriculares/atividades/${atividade.data!.id}`);
  await expect(page.getByText('Atividade não encontrada')).toBeVisible();
  await page.goto('/app/extracurriculares/atividades');
  await expect(page.getByText('Nenhuma atividade cadastrada')).toBeVisible();
  await expect(page.getByText('Liga privada da Lívia')).toHaveCount(0);
});
