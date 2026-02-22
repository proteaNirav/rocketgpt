'use client'

import React, { useEffect, useMemo } from 'react'
import { diffLines } from 'diff'
import Prism from 'prismjs'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/themes/prism-tomorrow.css'

interface Props {
  oldText: string
  newText: string
  language?: string
}

export default function AdvancedDiffViewer({
  oldText = '',
  newText = '',
  language = 'tsx',
}: Props) {
  // Memoize diff calculation so identity is stable between renders
  const parts = useMemo(() => {
    try {
      return diffLines(oldText ?? '', newText ?? '')
    } catch (err) {
      console.error('AdvancedDiffViewer diff error:', err)
      return null
    }
  }, [oldText, newText])

  // Highlight after render whenever diff parts change
  useEffect(() => {
    if (!parts) return
    Prism.highlightAll()
  }, [parts])

  // If diff failed, show raw content
  if (!parts) {
    return (
      <pre className="bg-black text-white text-xs p-2 rounded overflow-auto">
        Diff parsing failed. Showing raw text. OLD:
        {oldText}
        NEW:
        {newText}
      </pre>
    )
  }

  return (
    <div className="border rounded mt-3 bg-muted p-3 text-xs">
      <div className="grid grid-cols-2 gap-2 font-semibold text-sm mb-2">
        <div className="text-center">Old</div>
        <div className="text-center">New</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Old side */}
        <div className="bg-black text-white rounded p-2 max-h-[350px] overflow-auto">
          {parts.map((p: any, i: number) => {
            if (p.added) return <pre key={i} className="opacity-20"></pre>
            const highlighted = Prism.highlight(
              p.value,
              Prism.languages[language] || Prism.languages.tsx,
              language,
            )
            return (
              <pre
                key={i}
                className={
                  p.removed ? 'bg-red-900 p-1 rounded whitespace-pre-wrap' : 'whitespace-pre-wrap'
                }
                dangerouslySetInnerHTML={{ __html: highlighted }}
              ></pre>
            )
          })}
        </div>

        {/* New side */}
        <div className="bg-black text-white rounded p-2 max-h-[350px] overflow-auto">
          {parts.map((p: any, i: number) => {
            if (p.removed) return <pre key={i} className="opacity-20"></pre>
            const highlighted = Prism.highlight(
              p.value,
              Prism.languages[language] || Prism.languages.tsx,
              language,
            )
            return (
              <pre
                key={i}
                className={
                  p.added ? 'bg-green-900 p-1 rounded whitespace-pre-wrap' : 'whitespace-pre-wrap'
                }
                dangerouslySetInnerHTML={{ __html: highlighted }}
              ></pre>
            )
          })}
        </div>
      </div>
    </div>
  )
}
