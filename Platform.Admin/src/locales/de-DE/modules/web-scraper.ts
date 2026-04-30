/**
 * web-scraper Übersetzungsmodul (de-DE)
 * Web-Scraping-Übersetzungen
 */

export default {
  'pages.web-scraper.matchNotification': 'Übereinstimmungsbenachrichtigung',
  'pages.web-scraper.enableFilter': 'Filter aktivieren',
  'pages.web-scraper.filterPrompt': 'Filteraufforderung',
  'pages.web-scraper.enableTask': 'Aufgabe aktivieren',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Aktualisierung fehlgeschlagen',
  'pages.web-scraper.message.createFailed': 'Erstellung fehlgeschlagen',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Aufgabe bearbeiten',
  'pages.web-scraper.createTask': 'Aufgabe erstellen',
  'pages.web-scraper.taskName': 'Aufgabenname',
  'pages.web-scraper.taskNameRequired': 'Bitte Aufgabenname eingeben',
  'pages.web-scraper.taskNamePlaceholder': 'Aufgabenname eingeben',
  'pages.web-scraper.targetUrl': 'Ziel-URL',
  'pages.web-scraper.targetUrlRequired': 'Bitte Ziel-URL eingeben',
  'pages.web-scraper.targetUrlInvalid': 'Bitte gültige URL eingeben',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'Beschreibung',
  'pages.web-scraper.descriptionPlaceholder': 'Beschreibung eingeben (optional)',
  'pages.web-scraper.titleSelector': 'Titel-Selektor',
  'pages.web-scraper.titleSelectorPlaceholder': 'CSS-Selektor, z.B. h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'CSS-Selektor zum Extrahieren des Seitentitels, leer lassen für <title>-Tag',
  'pages.web-scraper.contentSelector': 'Inhalts-Selektor',
  'pages.web-scraper.contentSelectorPlaceholder': 'CSS-Selektor, z.B. article.content',
  'pages.web-scraper.contentSelectorTooltip': 'CSS-Selektor zum Extrahieren des Seiteninhalts, leer lassen für <body>-Tag',
  'pages.web-scraper.crawlDepth': 'Crawl-Tiefe',
  'pages.web-scraper.maxPagesPerLevel': 'Max. Seiten pro Ebene',
  'pages.web-scraper.crawlMode': 'Crawl-Modus',
  'pages.web-scraper.urlFilter': 'URL-Filter Regex',
  'pages.web-scraper.urlFilterPlaceholder': 'z.B. ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Externe Links folgen',
  'pages.web-scraper.deduplicate': 'URLs deduplizieren',
  'pages.web-scraper.scheduleCron': 'Zeitplan-Ausdruck',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Häufige Beispiele:</p><ul><li>Alle 10 Minuten: <code>*/10 * * * *</code></li><li>Stündlich: <code>0 * * * *</code></li><li>Täglich Mitternacht: <code>0 0 * * *</code></li><li>Jeden Montag: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Nur aktuelle Seite',
  'pages.web-scraper.mode.depth': 'Tiefe zuerst',
  'pages.web-scraper.mode.breadth': 'Breite zuerst',
  'pages.web-scraper.submit': 'Erstellen',
  'pages.web-scraper.update': 'Aktualisieren',
  'pages.web-scraper.cancel': 'Abbrechen',
  'pages.web-scraper.filterPromptPlaceholder': 'z.B. Seiten filtern, die "Preis" oder "Angebot" enthalten',
  // Ergebnisseite
  'pages.web-scraper.results.title.resultDetail': 'Scraping-Ergebnisdetails',
  // Komponente ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Seitendetails',
  // Logseite
  'pages.web-scraper.scrape-logs.title.logDetail': 'Logdetails',
};
