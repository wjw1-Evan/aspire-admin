/**
 * 头像工具函数
 * 用于统一处理用户头像，当头像为空时返回 undefined，让 Avatar 组件显示默认图标
 */

/**
 * 获取用户头像 URL
 * 如果头像为空或未定义，返回 undefined，让 Avatar 组件显示默认图标
 * @param avatar 头像 URL 或 base64 字符串
 * @returns 头像 URL 或 undefined
 */
export function getUserAvatar(avatar?: string | null): string | undefined {
  if (!avatar || avatar.trim() === '') {
    return undefined;
  }
  return avatar;
}
