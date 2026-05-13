/**
 * dashboard 翻译模块 (en-US)
 * 包含数据看板相关翻译
 */

export default {
  // Dashboard list
  'pages.dashboard.title': 'Data Dashboard',
  'pages.dashboard.name': 'Dashboard Name',
  'pages.dashboard.detail': 'Dashboard Detail',
  'pages.dashboard.operationFailed': 'Operation failed',
  'pages.dashboard.loadFailed': 'Load failed',
  'pages.dashboard.description': 'Description',
  'pages.dashboard.layoutType': 'Layout Type',
  'pages.dashboard.layoutGrid': 'Grid Layout',
  'pages.dashboard.layoutWaterfall': 'Waterfall',
  'pages.dashboard.layoutFree': 'Free Layout',
  'pages.dashboard.theme': 'Theme',
  'pages.dashboard.themeLight': 'Light',
  'pages.dashboard.themeDark': 'Dark',
  'pages.dashboard.themeCustom': 'Custom',
  'pages.dashboard.visibility': 'Visibility',
  'pages.dashboard.public': 'Public',
  'pages.dashboard.private': 'Private',
  'pages.dashboard.createdAt': 'Created At',
  'pages.dashboard.updatedAt': 'Updated At',
  'pages.dashboard.action': 'Action',
  'pages.dashboard.view': 'View',
  'pages.dashboard.edit': 'Edit',
  'pages.dashboard.design': 'Design',
  'pages.dashboard.copy': 'Copy',
  'pages.dashboard.share': 'Share',
  'pages.dashboard.delete': 'Delete',
  'pages.dashboard.preview': 'Preview',
  'pages.dashboard.create': 'Create Dashboard',
  'pages.dashboard.createSuccess': 'Created successfully',
  'pages.dashboard.updateSuccess': 'Updated successfully',
  'pages.dashboard.copySuccess': 'Copied successfully',
  'pages.dashboard.copyFailed': 'Copy failed',
  'pages.dashboard.shareSuccess': 'Shared successfully, link copied to clipboard',
  'pages.dashboard.shareFailed': 'Share failed',
  'pages.dashboard.deleteSuccess': 'Deleted successfully',
  'pages.dashboard.deleteFailed': 'Delete failed',
  'pages.dashboard.confirmDelete': 'Are you sure to delete this dashboard?',
  'pages.dashboard.nameRequired': 'Dashboard name cannot be empty',
  'pages.dashboard.back': 'Back',
  'pages.dashboard.backToList': 'Back to list',
  'pages.dashboard.notFound': 'Dashboard not found',
  'pages.dashboard.notFoundDesc': 'The dashboard you are trying to access does not exist or has been deleted',
  'pages.dashboard.shareNotFound': 'Invalid share link',
  'pages.dashboard.shareNotFoundDesc': 'The share link has expired or does not exist',
  'pages.dashboard.sharedView': '(Shared View)',

  // Statistics
  'pages.dashboard.totalDashboards': 'Total Dashboards',
  'pages.dashboard.publicDashboards': 'Public Dashboards',
  'pages.dashboard.privateDashboards': 'Private Dashboards',
  'pages.dashboard.totalCards': 'Total Cards',
  'pages.dashboard.recentCreated': 'Recently Created',

  // Card management
  'pages.dashboard.addCard': 'Add Card',
  'pages.dashboard.addFirstCard': 'Add First Card',
  'pages.dashboard.addCardSuccess': 'Card added successfully',
  'pages.dashboard.addCardFailed': 'Failed to add card',
  'pages.dashboard.updateCardSuccess': 'Card updated successfully',
  'pages.dashboard.updateCardFailed': 'Failed to update card',
  'pages.dashboard.deleteCardSuccess': 'Card deleted successfully',
  'pages.dashboard.deleteCardFailed': 'Failed to delete card',
  'pages.dashboard.editCard': 'Edit Card',
  'pages.dashboard.settings': 'Settings',
  'pages.dashboard.cardType': 'Card Type',
  'pages.dashboard.cardTypeStatistic': 'Statistic Card',
  'pages.dashboard.cardTypeChart': 'Chart Card',
  'pages.dashboard.cardTypeTable': 'Table Card',
  'pages.dashboard.cardTypeProgress': 'Progress Card',
  'pages.dashboard.cardTypeText': 'Text Card',
  'pages.dashboard.cardTypeImage': 'Image Card',
  'pages.dashboard.cardTitle': 'Card Title',
  'pages.dashboard.cardWidth': 'Card Width',
  'pages.dashboard.cardHeight': 'Card Height',
  'pages.dashboard.refreshInterval': 'Refresh Interval',
  'pages.dashboard.refresh1min': '1 Minute',
  'pages.dashboard.refresh5min': '5 Minutes',
  'pages.dashboard.refresh15min': '15 Minutes',
  'pages.dashboard.refresh30min': '30 Minutes',
  'pages.dashboard.refresh1hour': '1 Hour',
  'pages.dashboard.dataSource': 'Data Source Config',
  'pages.dashboard.dataSourcePlaceholder': 'Enter data source config (JSON format)',
  'pages.dashboard.styleConfig': 'Style Config',
  'pages.dashboard.styleConfigPlaceholder': 'Enter style config (JSON format)',
  'pages.dashboard.cardPlaceholder': 'Loading card data...',

  // Data refresh
  'pages.dashboard.refresh': 'Refresh',
  'pages.dashboard.refreshAll': 'Refresh All',
  'pages.dashboard.refreshSuccess': 'Refresh successful',
  'pages.dashboard.refreshFailed': 'Refresh failed',

  // Empty state
  'pages.dashboard.noCards': 'No cards yet',
  'pages.dashboard.noCardsDesc': 'Click the button below to add your first card',

  // Card type groups
  'pages.dashboard.cardTypeGroup.basic': '-- Basic --',
  'pages.dashboard.cardTypeGroup.chart': '-- Chart --',
  'pages.dashboard.cardTypeGroup.complex': '-- Complex --',

  // Card types
  'pages.dashboard.cardType.statistic': 'Statistic',
  'pages.dashboard.cardType.text': 'Text',
  'pages.dashboard.cardType.image': 'Image',
  'pages.dashboard.cardType.header': 'Dashboard Header',
  'pages.dashboard.cardType.clock': 'Clock',
  'pages.dashboard.cardType.statusBar': 'Status Bar',
  'pages.dashboard.cardType.gauge': 'Gauge',
  'pages.dashboard.cardType.ring': 'Ring Chart',
  'pages.dashboard.cardType.lineChart': 'Line Chart',
  'pages.dashboard.cardType.barChart': 'Bar Chart',
  'pages.dashboard.cardType.areaChart': 'Area Chart',
  'pages.dashboard.cardType.pieChart': 'Pie Chart',
  'pages.dashboard.cardType.radarChart': 'Radar Chart',
  'pages.dashboard.cardType.statusGrid': 'Status Grid',
  'pages.dashboard.cardType.functionModule': 'Function Module',
  'pages.dashboard.cardType.alertList': 'Alert List',
  'pages.dashboard.cardType.progressBar': 'Progress Bar',
  'pages.dashboard.cardType.table': 'Table',

  // Data modules
  'pages.dashboard.dataModule.static': 'Static Data (Manual)',
  'pages.dashboard.dataModule.task': 'Task Statistics',
  'pages.dashboard.dataModule.user': 'User Statistics',
  'pages.dashboard.dataModule.storage': 'File Storage',
  'pages.dashboard.dataModule.park': 'Park Management',
  'pages.dashboard.dataModule.workflow': 'Workflow',
  'pages.dashboard.dataModule.iot': 'IoT Devices',
  'pages.dashboard.dataModule.visit': 'Visit Tasks',
  'pages.dashboard.dataModule.document': 'Document Management',

  // Aggregation
  'pages.dashboard.aggregation.count': 'Count',
  'pages.dashboard.aggregation.avg': 'Average',
  'pages.dashboard.aggregation.max': 'Maximum',
  'pages.dashboard.aggregation.min': 'Minimum',
  'pages.dashboard.aggregation.sum': 'Sum',
  'pages.dashboard.aggregation.latest': 'Latest',

  // Time range
  'pages.dashboard.timeRange.today': 'Today',
  'pages.dashboard.timeRange.week': 'This Week',
  'pages.dashboard.timeRange.month': 'This Month',
  'pages.dashboard.timeRange.year': 'This Year',
  'pages.dashboard.timeRange.all': 'All',

  // Boolean
  'pages.dashboard.boolean.yes': 'Yes',
  'pages.dashboard.boolean.no': 'No',

  // Icons
  'pages.dashboard.icon.thunder': 'Thunder',
  'pages.dashboard.icon.monitor': 'Monitor',
  'pages.dashboard.icon.bulb': 'Bulb',
  'pages.dashboard.icon.bank': 'Bank',
  'pages.dashboard.icon.setting': 'Setting',
  'pages.dashboard.icon.sound': 'Sound',
  'pages.dashboard.icon.car': 'Vehicle',
  'pages.dashboard.icon.video': 'Video',
  'pages.dashboard.icon.idcard': 'ID Card',

  // Trend
  'pages.dashboard.trend.none': 'None',
  'pages.dashboard.trend.up': 'Up',
  'pages.dashboard.trend.down': 'Down',

  // Gauge style
  'pages.dashboard.gaugeStyle.default': 'Default',
  'pages.dashboard.gaugeStyle.simple': 'Simple',
  'pages.dashboard.gaugeStyle.temperature': 'Temperature',

  // Status
  'pages.dashboard.status.normal': 'Normal',
  'pages.dashboard.status.busy': 'Busy',
  'pages.dashboard.status.urgent': 'Urgent',
  'pages.dashboard.status.offline': 'Offline',
  'pages.dashboard.status.online': 'Online',
  'pages.dashboard.status.warning': 'Warning',

  // Alert level
  'pages.dashboard.alertLevel.info': 'Info',
  'pages.dashboard.alertLevel.warning': 'Warning',
  'pages.dashboard.alertLevel.error': 'Error',
  'pages.dashboard.alertLevel.critical': 'Critical',

  // Alignment
  'pages.dashboard.alignment.left': 'Left',
  'pages.dashboard.alignment.center': 'Center',
  'pages.dashboard.alignment.right': 'Right',

  // Image fit
  'pages.dashboard.imageFit.cover': 'Cover',
  'pages.dashboard.imageFit.contain': 'Contain',
  'pages.dashboard.imageFit.fill': 'Fill',

  // Designer
  'pages.dashboard.designer.layoutSaved': 'Layout saved',
  'pages.dashboard.designer.saveFailed': 'Save failed',
  'pages.dashboard.designer.cardCopied': 'Card copied',
  'pages.dashboard.designer.addCard': 'Add Card',
  'pages.dashboard.designer.saveLayout': 'Save Layout',
  'pages.dashboard.designer.preview': 'Preview',
  'pages.dashboard.designer.noCardAddFirst': 'No cards yet, click "Add Card" to start designing',

  // Designer confirm dialogs
  'pages.dashboard.DashboardDesigner.confirm.deleteCard': 'Are you sure to delete this card?',
};
