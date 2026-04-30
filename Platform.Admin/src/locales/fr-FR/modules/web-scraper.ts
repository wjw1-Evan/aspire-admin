/**
 * Module de traduction web-scraper (fr-FR)
 * Traductions liées au web scraping
 */

export default {
  'pages.web-scraper.matchNotification': 'Notification de correspondance',
  'pages.web-scraper.enableFilter': 'Activer le filtre',
  'pages.web-scraper.filterPrompt': 'Invite de filtrage',
  'pages.web-scraper.enableTask': 'Activer la tâche',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Échec de la mise à jour',
  'pages.web-scraper.message.createFailed': 'Échec de la création',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Modifier la tâche',
  'pages.web-scraper.createTask': 'Créer une tâche',
  'pages.web-scraper.taskName': 'Nom de la tâche',
  'pages.web-scraper.taskNameRequired': 'Veuillez saisir le nom de la tâche',
  'pages.web-scraper.taskNamePlaceholder': 'Veuillez saisir le nom de la tâche',
  'pages.web-scraper.targetUrl': 'URL cible',
  'pages.web-scraper.targetUrlRequired': 'Veuillez saisir l\'URL cible',
  'pages.web-scraper.targetUrlInvalid': 'Veuillez saisir une URL valide',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'Description',
  'pages.web-scraper.descriptionPlaceholder': 'Saisissez la description de la tâche (optionnel)',
  'pages.web-scraper.titleSelector': 'Sélecteur de titre',
  'pages.web-scraper.titleSelectorPlaceholder': 'Sélecteur CSS, ex: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Sélecteur CSS pour extraire le titre de la page, laisser vide pour utiliser la balise <title>',
  'pages.web-scraper.contentSelector': 'Sélecteur de contenu',
  'pages.web-scraper.contentSelectorPlaceholder': 'Sélecteur CSS, ex: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Sélecteur CSS pour extraire le contenu principal, laisser vide pour utiliser la balise <body>',
  'pages.web-scraper.crawlDepth': 'Profondeur de crawl',
  'pages.web-scraper.maxPagesPerLevel': 'Nombre max de pages par niveau',
  'pages.web-scraper.crawlMode': 'Mode de crawl',
  'pages.web-scraper.urlFilter': 'Filtre URL regex',
  'pages.web-scraper.urlFilterPlaceholder': 'ex: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Suivre les liens externes',
  'pages.web-scraper.deduplicate': 'Dédupliquer les URLs',
  'pages.web-scraper.scheduleCron': 'Expression de planification',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Exemples courants:</p><ul><li>Toutes les 10 minutes: <code>*/10 * * * *</code></li><li>Toutes les heures: <code>0 * * * *</code></li><li>Chaque jour à minuit: <code>0 0 * * *</code></li><li>Chaque lundi: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Page actuelle uniquement',
  'pages.web-scraper.mode.depth': 'Profondeur d\'abord',
  'pages.web-scraper.mode.breadth': 'Largeur d\'abord',
  'pages.web-scraper.submit': 'Créer',
  'pages.web-scraper.update': 'Mettre à jour',
  'pages.web-scraper.cancel': 'Annuler',
  'pages.web-scraper.filterPromptPlaceholder': 'ex: Filtrer les pages contenant "prix" ou "devis"',
  // Résultats page
  'pages.web-scraper.results.title.resultDetail': 'Détails du résultat de scraping',
  // Composant ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Détails de la page',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Détails du journal',
};
