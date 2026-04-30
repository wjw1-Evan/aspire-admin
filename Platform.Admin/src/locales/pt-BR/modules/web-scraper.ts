/**
 * web-scraper translation module (pt-BR)
 * Português Brasileiro - Brazilian Portuguese
 */

export default {
  'pages.web-scraper.matchNotification': 'Notificação de correspondência',
  'pages.web-scraper.enableFilter': 'Ativar filtro',
  'pages.web-scraper.filterPrompt': 'Prompt de filtro',
  'pages.web-scraper.enableTask': 'Ativar tarefa',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Falha ao atualizar',
  'pages.web-scraper.message.createFailed': 'Falha ao criar',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Editar tarefa',
  'pages.web-scraper.createTask': 'Criar tarefa',
  'pages.web-scraper.taskName': 'Nome da tarefa',
  'pages.web-scraper.taskNameRequired': 'Insira o nome da tarefa',
  'pages.web-scraper.taskNamePlaceholder': 'Insira o nome da tarefa',
  'pages.web-scraper.targetUrl': 'URL alvo',
  'pages.web-scraper.targetUrlRequired': 'Insira a URL alvo',
  'pages.web-scraper.targetUrlInvalid': 'Insira uma URL válida',
  'pages.web-scraper.targetUrlPlaceholder': 'https://exemplo.com',
  'pages.web-scraper.description': 'Descrição',
  'pages.web-scraper.descriptionPlaceholder': 'Insira a descrição da tarefa (opcional)',
  'pages.web-scraper.titleSelector': 'Seletor de título',
  'pages.web-scraper.titleSelectorPlaceholder': 'Seletor CSS, ex. h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Seletor CSS para extrair título da página, deixe vazio para usar a tag <title>',
  'pages.web-scraper.contentSelector': 'Seletor de conteúdo',
  'pages.web-scraper.contentSelectorPlaceholder': 'Seletor CSS, ex. article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Seletor CSS para extrair conteúdo da página, deixe vazio para usar a tag <body>',
  'pages.web-scraper.crawlDepth': 'Profundidade de rastejamento',
  'pages.web-scraper.maxPagesPerLevel': 'Máx páginas por nível',
  'pages.web-scraper.crawlMode': 'Modo de rastejamento',
  'pages.web-scraper.urlFilter': 'Filtro regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'ex. ^https://exemplo\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Seguir links externos',
  'pages.web-scraper.deduplicate': 'Deduplicar URLs',
  'pages.web-scraper.scheduleCron': 'Expressão de agendamento',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Exemplos comuns:</p><ul><li>A cada 10 minutos: <code>*/10 * * * *</code></li><li>A cada hora: <code>0 * * * *</code></li><li>A cada dia à meia-noite: <code>0 0 * * *</code></li><li>A cada segunda-feira: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Apenas página atual',
  'pages.web-scraper.mode.depth': 'Primeiro em profundidade',
  'pages.web-scraper.mode.breadth': 'Primeiro em largura',
  'pages.web-scraper.submit': 'Criar',
  'pages.web-scraper.update': 'Atualizar',
  'pages.web-scraper.cancel': 'Cancelar',
  'pages.web-scraper.filterPromptPlaceholder': 'ex. Filtre páginas contendo "preço" ou "cotação"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'Detalhes do resultado de scraping',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Detalhes da página',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Detalhes do log',
};
