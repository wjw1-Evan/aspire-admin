/**
 * web-scraper translation module (vi-VN)
 * Tiếng Việt - Vietnamese
 */

export default {
  'pages.web-scraper.matchNotification': 'Thông báo kết quả khớp',
  'pages.web-scraper.enableFilter': 'Bật bộ lọc',
  'pages.web-scraper.filterPrompt': 'Lời nhắc bộ lọc',
  'pages.web-scraper.enableTask': 'Bật tác vụ',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Cập nhật thất bại',
  'pages.web-scraper.message.createFailed': 'Tạo thất bại',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Sửa tác vụ',
  'pages.web-scraper.createTask': 'Tạo tác vụ',
  'pages.web-scraper.taskName': 'Tên tác vụ',
  'pages.web-scraper.taskNameRequired': 'Nhập tên tác vụ',
  'pages.web-scraper.taskNamePlaceholder': 'Nhập tên tác vụ',
  'pages.web-scraper.targetUrl': 'URL đích',
  'pages.web-scraper.targetUrlRequired': 'Nhập URL đích',
  'pages.web-scraper.targetUrlInvalid': 'Nhập một URL hợp lệ',
  'pages.web-scraper.targetUrlPlaceholder': 'https://ví dụ.com',
  'pages.web-scraper.description': 'Mô tả',
  'pages.web-scraper.descriptionPlaceholder': 'Nhập mô tả tác vụ (tùy chọn)',
  'pages.web-scraper.titleSelector': 'Bộ chọn tiêu đề',
  'pages.web-scraper.titleSelectorPlaceholder': 'Bộ chọn CSS, ví dụ: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Bộ chọn CSS để trích xuất tiêu đề trang, để trống để sử dụng thẻ <title>',
  'pages.web-scraper.contentSelector': 'Bộ chọn nội dung',
  'pages.web-scraper.contentSelectorPlaceholder': 'Bộ chọn CSS, ví dụ: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Bộ chọn CSS để trích xuất nội dung trang, để trống để sử dụng thẻ <body>',
  'pages.web-scraper.crawlDepth': 'Độ sâu thu thập',
  'pages.web-scraper.maxPagesPerLevel': 'Tối đa trang mỗi cấp',
  'pages.web-scraper.crawlMode': 'Chế độ thu thập',
  'pages.web-scraper.urlFilter': 'Bộ lọc regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'ví dụ: ^https://ví dụ\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Theo dõi liên kết bên ngoài',
  'pages.web-scraper.deduplicate': 'Loại bỏ trùng lặp URL',
  'pages.web-scraper.scheduleCron': 'Biểu thức lịch trình',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Ví dụ phổ biến:</p><ul><li>Mỗi 10 phút: <code>*/10 * * * *</code></li><li>Mỗi giờ: <code>0 * * * *</code></li><li>Mỗi ngày lúc nửa đêm: <code>0 0 * * *</code></li><li>Mỗi thứ Hai: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Chỉ trang hiện tại',
  'pages.web-scraper.mode.depth': 'Ưu tiên độ sâu',
  'pages.web-scraper.mode.breadth': 'Ưu tiên độ rộng',
  'pages.web-scraper.submit': 'Tạo',
  'pages.web-scraper.update': 'Cập nhật',
  'pages.web-scraper.cancel': 'Hủy',
  'pages.web-scraper.filterPromptPlaceholder': 'ví dụ: Lọc trang chứa "giá" hoặc "báo giá"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'Chi tiết kết quả thu thập',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Chi tiết trang',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Chi tiết nhật ký',
};
