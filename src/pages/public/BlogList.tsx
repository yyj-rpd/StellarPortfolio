import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { contentRepository } from '../../services/content';
import { useAsync } from '../../hooks/useAsync';
import { AsyncState } from '../../components/ui/Elements';
import { PostCard } from '../../components/portfolio/Cards';
export default function BlogList() {
  const [params,setParams] = useSearchParams();
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const loader = useCallback(() => contentRepository.listPosts(page,10), [page]);
  const {data,loading,error,retry} = useAsync(loader);
  useEffect(() => {document.title = '研究札记 / Publications · Stellar Portfolio';},[]);
  if(loading || error || !data) return <AsyncState loading={loading} error={error} retry={retry}/>;
  const pages = Math.max(1,Math.ceil(data.total / data.pageSize));
  return <div className="shell blog-page"><Link className="back-link" to="/">← 返回首页</Link><p className="eyebrow">RESEARCH NOTES / PUBLICATIONS</p><h1>研究札记与学术成果<span className="accent">。</span></h1><p className="page-description">记录研究进展与学术成果，也为后续的研究札记保留空间。</p><p className="content-count">共 {data.total} 项内容</p><div className="blog-list">{data.items.map((post,index) => <PostCard post={post} index={(page-1)*10+index} key={post.id}/>)}</div>{data.items.length === 0 && <div className="empty-state"><p>这一页暂无内容。</p><Link to="/blog">返回第一页</Link></div>}{pages > 1 && <nav className="pagination" aria-label="文章分页"><button className="button" disabled={page <= 1} onClick={() => setParams({page:String(page-1)})}>上一页</button><span>{page} / {pages}</span><button className="button" disabled={page >= pages} onClick={() => setParams({page:String(page+1)})}>下一页</button></nav>}</div>;
}


