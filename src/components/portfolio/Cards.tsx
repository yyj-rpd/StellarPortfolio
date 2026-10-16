import { Link } from 'react-router';
import type { Project, PostSummary } from '../../types/content';
import { safeUrl } from '../../lib/format';
import { Arrow, Tags } from '../ui/Elements';
import ContentMeta from './ContentMeta';

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const href = safeUrl(project.githubUrl || project.detailUrl || '');
  return (
    <article className="project-card">
      <div className="project-image">
        <img src={project.coverUrl} alt={project.title + ' 项目示意图'} width="640" height="400" loading="lazy" onError={event => { event.currentTarget.hidden = true; }} />
        <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="project-body">
        <p className="eyebrow">{project.categoryLabel}</p>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        {(project.role || project.result) && (
          <div className="project-highlights">
            {project.role && <span>{project.role}</span>}
            {project.result && <span>{project.result}</span>}
          </div>
        )}
        <Tags items={project.techStack} />
        <details className="project-details">
          <summary className="text-link">查看项目说明 <Arrow /></summary>
          {project.details.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {href && <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{project.githubUrl ? 'GitHub 仓库' : '项目详情'} <Arrow /></a>}
        </details>
      </div>
    </article>
  );
}

export function PostCard({ post, index }: { post: PostSummary; index: number }) {
  return (
    <article className="post-row">
      <span className="post-number">{String(index + 1).padStart(2, '0')}</span>
      <div>
        <ContentMeta post={post} />
        <h3><Link to={'/blog/' + post.slug}>{post.title}<Arrow /></Link></h3>
        <p>{post.excerpt}</p>
        <Link className="text-link publication-entry" to={'/blog/' + post.slug}>
          {post.contentType === 'publication' ? '查看论文介绍' : '阅读全文'} <Arrow />
        </Link>
      </div>
    </article>
  );
}

