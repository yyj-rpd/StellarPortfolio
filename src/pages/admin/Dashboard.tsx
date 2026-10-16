import { Link } from 'react-router';
import { resourceNames, resourcePaths } from '../../features/admin/forms';
export default function Dashboard() {
  return <section><p className="eyebrow">YOUR WORK / YOUR WORDS</p><h1>让内容持续生长。</h1><p className="admin-description">编辑资料、整理作品，记录研究进展。保存已发布内容会直接更新公开网站。</p>
    <div className="admin-dashboard">{Object.entries(resourceNames).map(([table, name]) => <Link key={table} to={resourcePaths[table as keyof typeof resourcePaths]}><h2>{name}</h2><span>开始管理 ↗</span></Link>)}</div>
    <p className="field-hint">新内容默认为草稿。发表状态与网站发布状态不同，未确认的日期和论文链接请留空。</p>
  </section>;
}


