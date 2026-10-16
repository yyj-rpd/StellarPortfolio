export function requestError(error: unknown): Error {
  if (error instanceof Error && !('code' in error)) return new Error('请求失败，请检查网络后重试。');
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === '23505') return new Error('标识或 slug 已存在，请使用不同的值。');
  if (['23514', '23502', '22P02', '22007'].includes(code)) return new Error('内容不符合数据库约束，请检查必填字段、日期、链接和长度。');
  if (['42501', 'PGRST301', 'PGRST303'].includes(code)) return new Error('没有操作权限或会话已失效，请重新登录并确认管理员授权。');
  if (code === 'PGRST116') return new Error('记录已变化、已删除或没有权限。请保留输入，重新加载后核对。');
  return new Error('请求失败，请检查网络、项目配置和数据库权限后重试。');
}


