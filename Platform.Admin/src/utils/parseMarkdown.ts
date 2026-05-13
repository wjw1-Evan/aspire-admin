let _marked: typeof import('marked') | undefined;

/**
 * 懒加载 marked 库进行 Markdown 解析
 * 首次调用时动态导入，后续调用直接使用缓存
 */
export async function parseMarkdown(md: string): Promise<string> {
  if (!_marked) {
    _marked = await import('marked');
  }
  return _marked.parse(md);
}

/**
 * 获取 marked 实例（同 parseMarkdown，兼容不同调用习惯）
 */
export async function getMarked() {
  if (!_marked) {
    _marked = await import('marked');
  }
  return _marked;
}
