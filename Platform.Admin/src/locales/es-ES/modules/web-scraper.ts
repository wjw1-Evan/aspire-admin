/**
 * Módulo de traducción web-scraper (es-ES)
 * Traducciones relacionadas con web scraping
 */

export default {
  'pages.web-scraper.matchNotification': 'Notificación de coincidencia',
  'pages.web-scraper.enableFilter': 'Activar filtro',
  'pages.web-scraper.filterPrompt': 'Prompt de filtro',
  'pages.web-scraper.enableTask': 'Activar tarea',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Error al actualizar',
  'pages.web-scraper.message.createFailed': 'Error al crear',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Editar tarea',
  'pages.web-scraper.createTask': 'Crear tarea',
  'pages.web-scraper.taskName': 'Nombre de la tarea',
  'pages.web-scraper.taskNameRequired': 'Por favor ingrese el nombre de la tarea',
  'pages.web-scraper.taskNamePlaceholder': 'Ingrese el nombre de la tarea',
  'pages.web-scraper.targetUrl': 'URL objetivo',
  'pages.web-scraper.targetUrlRequired': 'Por favor ingrese la URL objetivo',
  'pages.web-scraper.targetUrlInvalid': 'Por favor ingrese una URL válida',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'Descripción',
  'pages.web-scraper.descriptionPlaceholder': 'Ingrese la descripción de la tarea (opcional)',
  'pages.web-scraper.titleSelector': 'Selector de título',
  'pages.web-scraper.titleSelectorPlaceholder': 'Selector CSS, ej: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Selector CSS para extraer el título de la página, dejar vacío para usar la etiqueta <title>',
  'pages.web-scraper.contentSelector': 'Selector de contenido',
  'pages.web-scraper.contentSelectorPlaceholder': 'Selector CSS, ej: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Selector CSS para extraer el contenido principal, dejar vacío para usar la etiqueta <body>',
  'pages.web-scraper.crawlDepth': 'Profundidad de rastreo',
  'pages.web-scraper.maxPagesPerLevel': 'Máximo de páginas por nivel',
  'pages.web-scraper.crawlMode': 'Modo de rastreo',
  'pages.web-scraper.urlFilter': 'Filtro URL regex',
  'pages.web-scraper.urlFilterPlaceholder': 'ej: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Seguir enlaces externos',
  'pages.web-scraper.deduplicate': 'Deduplicar URLs',
  'pages.web-scraper.scheduleCron': 'Expresión de programación',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Ejemplos comunes:</p><ul><li>Cada 10 minutos: <code>*/10 * * * *</code></li><li>Cada hora: <code>0 * * * *</code></li><li>Cada día a medianoche: <code>0 0 * * *</code></li><li>Cada lunes: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Solo página actual',
  'pages.web-scraper.mode.depth': 'Profundidad primero',
  'pages.web-scraper.mode.breadth': 'Anchura primero',
  'pages.web-scraper.submit': 'Crear',
  'pages.web-scraper.update': 'Actualizar',
  'pages.web-scraper.cancel': 'Cancelar',
  'pages.web-scraper.filterPromptPlaceholder': 'ej: Filtrar páginas que contengan "precio" o "presupuesto"',
  // Página de resultados
  'pages.web-scraper.results.title.resultDetail': 'Detalles del resultado de scraping',
  // Componente ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Detalles de la página',
  // Página de logs
  'pages.web-scraper.scrape-logs.title.logDetail': 'Detalles del registro',
};
