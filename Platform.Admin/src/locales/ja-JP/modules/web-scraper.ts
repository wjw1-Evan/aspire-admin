/**
 * web-scraper 翻訳モジュール
 * Webスクレイピング関連翻訳
 */

export default {
  'pages.web-scraper.matchNotification': 'マッチ通知',
  'pages.web-scraper.enableFilter': 'フィルターを有効化',
  'pages.web-scraper.filterPrompt': 'フィルタープロンプト',
  'pages.web-scraper.enableTask': 'タスクを有効化',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': '更新失敗',
  'pages.web-scraper.message.createFailed': '作成失敗',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'タスクを編集',
  'pages.web-scraper.createTask': 'タスクを新規作成',
  'pages.web-scraper.taskName': 'タスク名',
  'pages.web-scraper.taskNameRequired': 'タスク名を入力してください',
  'pages.web-scraper.taskNamePlaceholder': 'タスク名を入力してください',
  'pages.web-scraper.targetUrl': 'ターゲットURL',
  'pages.web-scraper.targetUrlRequired': 'ターゲットURLを入力してください',
  'pages.web-scraper.targetUrlInvalid': '有効なURLを入力してください',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': '説明',
  'pages.web-scraper.descriptionPlaceholder': 'タスクの説明を入力してください（任意）',
  'pages.web-scraper.titleSelector': 'タイトルセレクター',
  'pages.web-scraper.titleSelectorPlaceholder': 'CSSセレクター、例: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'ページタイトルを抽出するCSSセレクター、空の場合は<title>タグを使用',
  'pages.web-scraper.contentSelector': 'コンテンツセレクター',
  'pages.web-scraper.contentSelectorPlaceholder': 'CSSセレクター、例: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'ページ本文を抽出するCSSセレクター、空の場合は<body>タグを使用',
  'pages.web-scraper.crawlDepth': 'クロール深度',
  'pages.web-scraper.maxPagesPerLevel': 'レベルごとの最大ページ数',
  'pages.web-scraper.crawlMode': 'クロールモード',
  'pages.web-scraper.urlFilter': 'URLフィルター正規表現',
  'pages.web-scraper.urlFilterPlaceholder': '例: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': '外部リンクをフォロー',
  'pages.web-scraper.deduplicate': 'URL重複削除',
  'pages.web-scraper.scheduleCron': 'スケジュール式',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>よく使われる例:</p><ul><li>10分ごと: <code>*/10 * * * *</code></li><li>毎時: <code>0 * * * *</code></li><li>毎日深夜: <code>0 0 * * *</code></li><li>毎週月曜: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': '現在のページのみ',
  'pages.web-scraper.mode.depth': '深度優先',
  'pages.web-scraper.mode.breadth': '幅優先',
  'pages.web-scraper.submit': '作成',
  'pages.web-scraper.update': '更新',
  'pages.web-scraper.cancel': 'キャンセル',
  'pages.web-scraper.filterPromptPlaceholder': '例: 「価格」または「見積もり」を含むページをフィルター',
  // 結果ページ
  'pages.web-scraper.results.title.resultDetail': 'スクレイピング結果詳細',
  // コンポーネント ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'ページ詳細',
  // ログページ
  'pages.web-scraper.scrape-logs.title.logDetail': 'ログ詳細',
};
