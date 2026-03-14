import CatsGenerator from '@/components/cats/CatsGenerator'

export default function CatsGeneratorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Generator</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Generate deterministic demo CAT drafts without network LLM calls.
      </p>
      <CatsGenerator />
    </div>
  )
}
