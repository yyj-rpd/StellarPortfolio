import type { PostSummary } from '../../types/content';
import { formatDate } from '../../lib/format';

export default function ContentMeta({ post }: { post: PostSummary }) {
  const publication = post.contentType === 'publication' ? post.publication : null;
  if (publication) {
    return (
      <div className="post-meta publication-meta">
        <span className="publication-journal">{publication.journal}</span>
        <span>{publication.articleType}</span>
        <span>{publication.publicationStatus}</span>
        <span>{publication.authorRole}</span>
        {publication.publicationDate && <span>出版日期：{publication.publicationDate}</span>}
      </div>
    );
  }
  return (
    <div className="post-meta">
      {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
      <span>{post.tags.join(' / ')}</span>
    </div>
  );
}

