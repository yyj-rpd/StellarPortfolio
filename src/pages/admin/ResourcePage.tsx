import { useCallback, useState } from 'react';
import type { AdminTable, AdminRow } from '../../types/database';
import { listAdminRows, deleteAdminRow } from '../../services/admin';
import { useAsync } from '../../hooks/useAsync';
import { AsyncState } from '../../components/ui/Elements';
import { resourceNames } from '../../features/admin/forms';
import RecordEditor from '../../features/admin/RecordEditor';

function rowName(row: AdminRow): string {
  if ('display_name' in row) return row.display_name;
  if ('name' in row) return row.name;
  return row.title;
}
export default function ResourcePage({ table }: { table: AdminTable }) {
  const [page, setPage] = useState(1);
  const loader = useCallback(() => listAdminRows(table, page), [table, page]);
  const { data, loading, error, retry } = useAsync(loader);
  const [selected, setSelected] = useState<AdminRow | null | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [failed, setFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  function discard() { if (editingBusy) return false; return !dirty || window.confirm('当前修改尚未保存，确定切换？'); }
  function select(row: AdminRow | null) {
    if (!discard()) return;
    setSelected(row); setDirty(false); setFeedback('');
  }
  async function remove(row: AdminRow) {
    if (table === 'profile' || deleting || !discard()) return;
    if (!window.confirm('确定永久删除“' + rowName(row) + '”？此操作不能在后台恢复。')) return;
    setDeleting(true); setFeedback('');
    try {
      await deleteAdminRow(table, row);
      setSelected(undefined); setDirty(false); setFailed(false); setFeedback('删除成功。'); if (data?.rows.length === 1 && page > 1) setPage(page - 1); else retry();
    } catch (error) { setFailed(true); setFeedback(error instanceof Error ? error.message : '删除失败，请重试。'); }
    finally { setDeleting(false); }
  }
  if (loading || error || !data) return <AsyncState loading={loading} error={error} retry={retry} />;
  const pages = Math.max(1, Math.ceil(data.total / 20));
  return <section className="resource-page"><div className="admin-page-heading"><div><p className="eyebrow">STELLAR / EDITOR</p><h1>{resourceNames[table]}</h1></div>
    {(table !== 'profile' || data.total === 0) && <button className="button" disabled={editingBusy} onClick={() => select(null)}>新增{resourceNames[table]}</button>}
  </div>
    {feedback && <p className={'feedback ' + (failed ? 'error' : 'success')} role={failed ? 'alert' : 'status'}>{feedback}</p>}
    <div className="admin-resource-grid"><div className="record-list">
      {data.rows.length === 0 && <p className="field-hint">尚无内容，请点击新增。</p>}
      {data.rows.map(row => <article key={row.id} className={selected?.id === row.id ? 'record-card selected' : 'record-card'}>
        <h2>{rowName(row)}</h2><p className="record-status">{row.status === 'published' ? '已发布' : '草稿'}</p>
        <div className="admin-actions"><button className="button" disabled={deleting || editingBusy} onClick={() => select(row)}>编辑</button>
          {table !== 'profile' && <button className="button danger" disabled={deleting} onClick={() => { void remove(row); }}>删除</button>}</div>
      </article>)}
      {pages > 1 && <nav className="admin-actions" aria-label="后台分页"><button className="button" disabled={page <= 1} onClick={() => { if (discard()) { setSelected(undefined); setDirty(false); setPage(page - 1); } }}>上一页</button><span>{page} / {pages}</span><button className="button" disabled={page >= pages} onClick={() => { if (discard()) { setSelected(undefined); setDirty(false); setPage(page + 1); } }}>下一页</button></nav>}
    </div>
      {selected === undefined ? <div className="editor-placeholder">选择一条内容开始编辑。{table === 'profile' && '个人资料支持撤回，不提供删除入口。'}</div> :
        <RecordEditor key={String(selected?.id ?? 'new') + ':' + (selected?.updated_at ?? '')} table={table} row={selected} onDirty={setDirty} onBusy={setEditingBusy} onSaved={row => { setSelected(row); setDirty(false); setFailed(false); setFeedback('保存成功，数据已写入 Supabase。公开页刷新后可读取最新已发布内容。'); retry(); }} />}
    </div>
  </section>;
}


