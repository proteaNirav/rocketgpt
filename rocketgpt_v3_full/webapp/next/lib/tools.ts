export type RunMode = 'redirect' | 'simulate'

export type ToolMeta = {
  toolId: string
  title: string
  runMode: RunMode
  // urlTemplate used when runMode === 'redirect'
  // You can use {goal} and {plan} placeholders
  urlTemplate?: string
  // for simulate mode
  steps?: string[]
  pricing?: 'free' | 'freemium' | 'paid'
}

export const TOOL_CATALOG: Record<string, ToolMeta> = {
  canva: {
    toolId: 'canva',
    title: 'Canva',
    runMode: 'redirect',
    pricing: 'freemium',
    urlTemplate:
      // opens Canva with a general create page (you can swap this for a template URL later)
      'https://www.canva.com/create/?query={goal}',
  },
  google_docs: {
    toolId: 'google_docs',
    title: 'Google Docs',
    runMode: 'redirect',
    pricing: 'free',
    // creates a new untitled doc (user must be logged in)
    urlTemplate: 'https://docs.new',
  },
  notion: {
    toolId: 'notion',
    title: 'Notion',
    runMode: 'simulate',
    pricing: 'freemium',
    steps: [
      'Create a new page',
      'Add title and summary',
      'Insert checklist of tasks',
      'Share with collaborators',
    ],
  },
}

/** Build a URL for redirect tools by injecting goal/plan. */
export function buildToolUrl(
  toolId: string,
  params: { goal: string; plan?: Array<{ id: string; title: string }> },
): string | null {
  const meta = TOOL_CATALOG[toolId]
  if (!meta || meta.runMode !== 'redirect' || !meta.urlTemplate) return null
  const planTitles = (params.plan || []).map((s) => s.title).join(', ')
  const enc = (x: string) => encodeURIComponent(x)
  return meta.urlTemplate
    .replace('{goal}', enc(params.goal || ''))
    .replace('{plan}', enc(planTitles || ''))
}
