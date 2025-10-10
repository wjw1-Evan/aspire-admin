/**
 * 时间工具函数
 * 提供时间格式化和计算功能
 */

/**
 * 格式化时间
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * 计算相对时间
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) {
    return '刚刚';
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  }
  if (diff < week) {
    return `${Math.floor(diff / day)}天前`;
  }
  if (diff < month) {
    return `${Math.floor(diff / week)}周前`;
  }
  return `${Math.floor(diff / month)}个月前`;
}

/**
 * 检查时间是否过期
 */
export function isExpired(timestamp: number, bufferMinutes = 5): boolean {
  const bufferTime = bufferMinutes * 60 * 1000;
  return Date.now() >= (timestamp - bufferTime);
}

/**
 * 格式化日期
 */
export function formatDate(timestamp: number, format = 'YYYY-MM-DD'): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 解析时间字符串
 */
export function parseTimeString(timeString: string): number {
  return new Date(timeString).getTime();
}

/**
 * 获取今天的开始时间
 */
export function getTodayStart(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/**
 * 获取今天的结束时间
 */
export function getTodayEnd(): number {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now.getTime();
}

