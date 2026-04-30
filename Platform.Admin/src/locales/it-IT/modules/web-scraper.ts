/**
 * web-scraper translation module (it-IT)
 * Italiano - Italian
 */

export default {
  'pages.web-scraper.matchNotification': 'Notifica di corrispondenza',
  'pages.web-scraper.enableFilter': 'Attiva filtro',
  'pages.web-scraper.filterPrompt': 'Prompt filtro',
  'pages.web-scraper.enableTask': 'Attiva attività',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Aggiornamento fallito',
  'pages.web-scraper.message.createFailed': 'Creazione fallita',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Modifica attività',
  'pages.web-scraper.createTask': 'Crea attività',
  'pages.web-scraper.taskName': 'Nome attività',
  'pages.web-scraper.taskNameRequired': 'Inserisci il nome dell\'attività',
  'pages.web-scraper.taskNamePlaceholder': 'Inserisci il nome dell\'attività',
  'pages.web-scraper.targetUrl': 'URL di destinazione',
  'pages.web-scraper.targetUrlRequired': 'Inserisci l\'URL di destinazione',
  'pages.web-scraper.targetUrlInvalid': 'Inserisci un URL valido',
  'pages.web-scraper.targetUrlPlaceholder': 'https://esempio.com',
  'pages.web-scraper.description': 'Descrizione',
  'pages.web-scraper.descriptionPlaceholder': 'Inserisci la descrizione dell\'attività (opzionale)',
  'pages.web-scraper.titleSelector': 'Selettore titolo',
  'pages.web-scraper.titleSelectorPlaceholder': 'Selettore CSS, es. h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Selettore CSS per estrarre il titolo della pagina, lascia vuoto per usare il tag <title>',
  'pages.web-scraper.contentSelector': 'Selettore contenuto',
  'pages.web-scraper.contentSelectorPlaceholder': 'Selettore CSS, es. article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Selettore CSS per estrarre il contenuto della pagina, lascia vuoto per usare il tag <body>',
  'pages.web-scraper.crawlDepth': 'Profondità di crawling',
  'pages.web-scraper.maxPagesPerLevel': 'Massime pagine per livello',
  'pages.web-scraper.crawlMode': 'Modalità crawling',
  'pages.web-scraper.urlFilter': 'Filtro regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'es. ^https://esempio\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Segui collegamenti esterni',
  'pages.web-scraper.deduplicate': 'Deduplica URL',
  'pages.web-scraper.scheduleCron': 'Espressione pianificazione',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Esempi comuni:</p><ul><li>Ogni 10 minuti: <code>*/10 * * * *</code></li><li>Ogni ora: <code>0 * * * *</code></li><li>Ogni giorno a mezzanotte: <code>0 0 * * *</code></li><li>Ogni lunedì: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Solo pagina corrente',
  'pages.web-scraper.mode.depth': 'Prima in profondità',
  'pages.web-scraper.mode.breadth': 'Prima in ampiezza',
  'pages.web-scraper.submit': 'Crea',
  'pages.web-scraper.update': 'Aggiorna',
  'pages.web-scraper.cancel': 'Annulla',
  'pages.web-scraper.filterPromptPlaceholder': 'es. Filtra pagine contenenti "prezzo" o "citazione"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'Dettagli risultato scraping',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Dettagli pagina',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Dettagli log',
};
