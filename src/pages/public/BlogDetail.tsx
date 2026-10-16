import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import SafeMarkdown from '../../components/portfolio/SafeMarkdown';
import ContentMeta from '../../components/portfolio/ContentMeta';
import { contentRepository } from '../../services/content';
import { useAsync } from '../../hooks/useAsync';
import { AsyncState, Tags } from '../../components/ui/Elements';
import { safeUrl } from '../../lib/format';
import NotFound from './NotFound';

export default function BlogDetail() {
  const { slug = '' } = useParams();
  const loader = useCallback(() => contentRepository.getPost(slug), [slug]);
  const { data, loading, error, retry } = useAsync(loader);
  useEffect(() => {
    document.title = data ? data.title + ' · Stellar Portfolio' : '研究札记 / Publications · Stellar Portfolio';
  }, [data]);
  if (loading || error) return <AsyncState loading={loading} error={error} retry={retry} />;
  if (!data) return <NotFound />;
  const isPublication = data.contentType === 'publication';
  const publicationUrl = safeUrl(data.publication?.url ?? '');
  return (
    <article className="shell article-page">
      <Link className="back-link" to="/blog">← 返回研究札记 / Publications</Link>
      <header className="article-header">
        <p className="eyebrow">{isPublication ? 'PUBLICATION / 学术论文' : 'RESEARCH NOTES / 研究札记'}</p>
        <h1>{data.title}</h1>
        <ContentMeta post={data} />
        <Tags items={data.tags} />
        <p className="article-excerpt">{data.excerpt}</p>
        {isPublication && <p className="publication-notice">本页为论文介绍，概述研究背景、主要内容与个人贡献，不提供论文全文。</p>}
        {data.publication?.doi && <p className="publication-doi">DOI：{data.publication.doi}</p>}
        {publicationUrl && <a className="text-link" href={publicationUrl} target="_blank" rel="noopener noreferrer">访问论文页面 ↗</a>}
      </header>
      <div className="markdown"><SafeMarkdown content={data.contentMarkdown} /></div>
      <div className="article-end">
        <span>— 感谢阅读，保持好奇。</span>
        <Link to="/blog">返回研究札记 / Publications ↗</Link>
      </div>
    </article>
  );
}

