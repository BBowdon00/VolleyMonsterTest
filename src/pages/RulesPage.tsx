import ReactMarkdown from 'react-markdown'
import rulesContent from '@/content/rules.md?raw'

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <article className="prose prose-gray max-w-none">
        <ReactMarkdown>{rulesContent}</ReactMarkdown>
      </article>
    </div>
  )
}
