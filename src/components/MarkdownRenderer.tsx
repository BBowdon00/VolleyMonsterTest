import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Whitelisted safe tags — no rehype-raw to prevent HTML injection
const ALLOWED_ELEMENTS: React.ComponentProps<typeof ReactMarkdown>['allowedElements'] = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'a',
  'blockquote',
  'hr',
  'br',
]

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed>
        {content}
      </ReactMarkdown>
    </div>
  )
}
