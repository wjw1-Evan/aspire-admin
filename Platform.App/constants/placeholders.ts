/**
 * 占位符图片常量
 * 使用 base64 编码的透明 PNG 图片作为占位符，避免网络请求失败
 */

// 1x1 透明 PNG 图片的 base64 编码
const TRANSPARENT_1X1_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * 获取占位符图片 URI
 * @param size 图片尺寸（可选，用于兼容性，实际不使用）
 * @returns base64 编码的占位符图片 URI
 */
export function getPlaceholderImageUri(size?: number): string {
  return `data:image/png;base64,${TRANSPARENT_1X1_PNG}`;
}

/**
 * 默认占位符图片 URI
 */
export const PLACEHOLDER_IMAGE_URI = getPlaceholderImageUri();

