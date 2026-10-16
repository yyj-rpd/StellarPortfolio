import type { ReactNode } from 'react';
export function Arrow() { return <span aria-hidden="true">↗</span>; }
export function SectionHeading({number, label, title, children}: {number: string; label: string; title: string; children?: ReactNode}) { return <div className="section-heading"><div><p className="eyebrow">{number} / {label}</p><h2>{title}</h2></div>{children}</div>; }
export function Tags({items}: {items: string[]}) { return <div className="tags">{items.map(item => <span key={item}>{item}</span>)}</div>; }
export function AsyncState({loading, error, retry}: {loading: boolean; error: boolean | string | null; retry: () => void}) { return <div className="state-panel" role={error ? 'alert' : 'status'}>{loading ? '正在整理星图…' : error ? <><h1>内容暂时无法读取</h1><p>{typeof error === 'string' ? error : '请稍后重试。'}</p><button className="button" onClick={retry}>重新加载</button></> : null}</div>; }



