import Markdown from 'react-markdown';
import { safeUrl } from '../../lib/format';
export default function SafeMarkdown({content}: {content: string}) {
  return <Markdown skipHtml urlTransform={(url,key) => safeUrl(url,key === 'src') ?? ''} components={{
    a: ({href,children}) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    img: ({src,alt}) => src ? <img src={src} alt={alt ?? ''} loading="lazy"/> : null,
  }}>{content}</Markdown>;
}

