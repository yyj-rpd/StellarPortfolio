export function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'long',day:'numeric',timeZoneName:'short'}).format(new Date(value)) : '尚未发布'; }
export function safeUrl(value: string, image = false): string | undefined {
  try { const url = new URL(value); return (image ? url.protocol === 'https:' : ['https:','http:','mailto:'].includes(url.protocol)) ? value : undefined; } catch { return undefined; }
}

