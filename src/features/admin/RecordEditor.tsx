import { useEffect, useState, type FormEvent } from 'react';
import { useBlocker } from 'react-router';
import type { AdminTable, AdminRow } from '../../types/database';
import { fields, initialValues, type EditorValues } from './forms';
import { saveAdminRow } from '../../services/admin';
import HistoryEditor from './HistoryEditor';
import SafeMarkdown from '../../components/portfolio/SafeMarkdown';

export default function RecordEditor({ table, row, onSaved, onDirty, onBusy }: {
  table: AdminTable; row: AdminRow | null; onSaved: (row: AdminRow) => void; onDirty: (dirty: boolean) => void; onBusy: (busy: boolean) => void;
}) {
  const [values, setValues] = useState<EditorValues>(() => initialValues(table, row));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const blocker = useBlocker(dirty || busy);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (busy) { window.alert('正在保存，请等待请求完成。'); blocker.reset(); }
      else if (window.confirm('当前修改尚未保存，确定离开？')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, busy]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, busy]);
  function change(next: EditorValues) { setValues(next); setDirty(true); onDirty(true); setMessage(''); }
  const isPublished = values.fields.status === 'published';
  const saveLabel = isPublished ? (row?.status === 'published' ? '保存并更新线上' : '发布内容') : row?.status === 'published' ? '保存并撤回' : '保存草稿';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (row && 'slug' in row && values.fields.slug !== row.slug && !window.confirm('修改 slug 后，原来的文章链接将失效。确定保存？')) return;
    setBusy(true); onBusy(true); setMessage('');
    try {
      const saved = await saveAdminRow(table, values, row);
      setDirty(false); onDirty(false); onSaved(saved);
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存失败，请重试。'); }
    finally { setBusy(false); onBusy(false); }
  }
  const markdown = values.fields.content_type === 'publication'
    ? ['## 论文简介', values.fields.introduction, '## 研究背景', values.fields.research_background,
      '## 主要研究内容', values.fields.research_content, '## 个人贡献', values.fields.personal_contribution].join('\n\n')
    : values.fields.content_markdown ?? '';
  return <form className="admin-form record-editor" onSubmit={submit}>
    <h2>{row ? '编辑内容' : '新增内容'}</h2>
    <p className="field-hint">{row?.status === 'published' ? '当前内容已在线展示，保存会直接更新线上。' : '新内容以草稿保存时仅管理员可见。'}</p>
    <fieldset disabled={busy} className="editor-fields">
      {fields[table].filter(field => !field.forType || field.forType === values.fields.content_type).map(field => {
        const id = 'field-' + field.key;
        return <label htmlFor={id} key={field.key}>{field.label}{field.required ? ' *' : ''}
          {field.type === 'select' ? <select id={id} value={values.fields[field.key] ?? ''} onChange={event => change({ ...values, fields: { ...values.fields, [field.key]: event.target.value } })}>
            {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : field.type === 'textarea' ? <textarea id={id} required={field.required} maxLength={field.max} value={values.fields[field.key] ?? ''} onChange={event => change({ ...values, fields: { ...values.fields, [field.key]: event.target.value } })} />
            : <input id={id} type={field.type ?? 'text'} required={field.required} maxLength={field.max} min={field.type === 'number' ? 0 : undefined} max={field.type === 'number' ? 2147483647 : undefined} step={field.type === 'number' ? 1 : undefined} value={values.fields[field.key] ?? ''} onChange={event => change({ ...values, fields: { ...values.fields, [field.key]: event.target.value } })} />}
          {field.hint && <span className="field-hint">{field.hint}</span>}
        </label>;
      })}
      {table === 'profile' && <>
        <HistoryEditor kind="education" items={values.education} onChange={education => change({ ...values, education })} />
        <HistoryEditor kind="experience" items={values.experiences} onChange={experiences => change({ ...values, experiences })} />
      </>}
    </fieldset>
    {table === 'publications' && <><button className="button" type="button" onClick={() => setPreview(value => !value)}>{preview ? '收起预览' : '预览正文'}</button>
      {preview && <section className="admin-preview"><p className="field-hint">仅后台预览，尚未保存或发布。</p><div className="markdown"><SafeMarkdown content={markdown} /></div></section>}</>}

    <div className="admin-actions"><button className="button button-primary" disabled={busy}>{busy ? '正在保存…' : saveLabel}</button><span className="field-hint">{dirty ? '有未保存的修改' : '当前无未保存修改'}</span></div>
    {message && <p className="feedback error" role="alert">{message}</p>}
  </form>;
}


