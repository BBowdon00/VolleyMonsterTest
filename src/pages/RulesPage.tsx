import MarkdownRenderer from '@/components/MarkdownRenderer'
import rulesContent from '@/content/rules.md?raw'

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <MarkdownRenderer
        content={rulesContent}
        className="prose prose-gray max-w-none
          prose-headings:font-black prose-headings:text-gray-900
          prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8
          prose-a:text-teal-600 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-teal-400 prose-blockquote:text-gray-600
          prose-li:text-gray-700"
      />
    </div>
  )
}
