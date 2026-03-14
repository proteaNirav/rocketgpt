'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import {
  CatDto,
  CatStatus,
  CatVersionDto,
  getCat,
  listCatVersions,
  publishCatVersion,
  transitionCat,
  updateCat,
} from '@/lib/admin-cats-api'

const TRANSITION_OPTIONS: Record<CatStatus, CatStatus[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['active', 'draft'],
  active: ['deprecated', 'revoked'],
  deprecated: ['revoked'],
  revoked: [],
}

export default function AdminCatDetailPage() {
  const params = useParams<{ catId: string }>()
  const [catId, setCatId] = useState<string>('')
  const [cat, setCat] = useState<CatDto | null>(null)
  const [versions, setVersions] = useState<CatVersionDto[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetStatus, setTargetStatus] = useState<CatStatus>('review')
  const [publishVersionText, setPublishVersionText] = useState('1.0.0')
  const [publishCommandBundle, setPublishCommandBundle] = useState('cats/bundles/default')
  const [publishManifest, setPublishManifest] = useState('{"entrypoint":"run"}')
  const [publishRulebook, setPublishRulebook] = useState('{"policy":"strict"}')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const canEditMetadata = useMemo(
    () => cat?.status === 'draft' || cat?.status === 'review',
    [cat?.status],
  )

  async function load(targetCatId: string) {
    setLoading(true)
    setError(null)
    try {
      const [catResponse, versionsResponse] = await Promise.all([
        getCat(targetCatId),
        listCatVersions(targetCatId),
      ])
      setCat(catResponse)
      setVersions(versionsResponse.items)
      setName(catResponse.name)
      setDescription(catResponse.description || '')
      const firstTransition = TRANSITION_OPTIONS[catResponse.status][0]
      if (firstTransition) setTargetStatus(firstTransition)
    } catch (err: any) {
      setError(String(err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const resolvedCatId = String(params.catId || '')
    if (!resolvedCatId) return
    setCatId(resolvedCatId)
    void load(resolvedCatId)
  }, [params.catId])

  async function saveMetadata() {
    if (!catId) return
    setError(null)
    try {
      await updateCat(catId, { name, description })
      await load(catId)
    } catch (err: any) {
      setError(String(err?.message || err))
    }
  }

  async function moveLifecycle() {
    if (!catId) return
    setError(null)
    try {
      await transitionCat(catId, targetStatus)
      await load(catId)
    } catch (err: any) {
      setError(String(err?.message || err))
    }
  }

  async function publishVersion() {
    if (!catId) return
    setError(null)
    try {
      await publishCatVersion(catId, {
        version: publishVersionText.trim(),
        commandBundleRef: publishCommandBundle.trim(),
        manifestJson: JSON.parse(publishManifest),
        rulebookJson: JSON.parse(publishRulebook),
      })
      await load(catId)
    } catch (err: any) {
      setError(String(err?.message || err))
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CAT Detail</h1>
        <Link href="/admin/cats" className="text-sm text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading || !cat ? <p className="text-sm text-muted-foreground">Loading...</p> : null}

      {cat ? (
        <>
          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Metadata</h2>
            <p className="text-xs text-muted-foreground">ID: {cat.catId}</p>
            <p className="text-xs text-muted-foreground">Status: {cat.status}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEditMetadata}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Description</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEditMetadata}
                />
              </div>
            </div>
            <Button onClick={saveMetadata} disabled={!canEditMetadata}>
              Save Metadata
            </Button>
          </section>

          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Lifecycle Transition</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as CatStatus)}
                disabled={TRANSITION_OPTIONS[cat.status].length === 0}
              >
                {TRANSITION_OPTIONS[cat.status].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Button
                onClick={moveLifecycle}
                disabled={TRANSITION_OPTIONS[cat.status].length === 0}
              >
                Apply Transition
              </Button>
            </div>
          </section>

          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Publish Version</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                value={publishVersionText}
                onChange={(e) => setPublishVersionText(e.target.value)}
                placeholder="1.0.0"
              />
              <Input
                value={publishCommandBundle}
                onChange={(e) => setPublishCommandBundle(e.target.value)}
                placeholder="cats/bundles/x"
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <textarea
                className="min-h-24 rounded-md border px-3 py-2 text-xs"
                value={publishManifest}
                onChange={(e) => setPublishManifest(e.target.value)}
              />
              <textarea
                className="min-h-24 rounded-md border px-3 py-2 text-xs"
                value={publishRulebook}
                onChange={(e) => setPublishRulebook(e.target.value)}
              />
            </div>
            <Button onClick={publishVersion}>Publish Version</Button>
            <p className="text-xs text-muted-foreground">
              Publish is allowed in draft or approved states for this v1.
            </p>
          </section>

          <section className="space-y-2 rounded-md border p-4">
            <h2 className="font-medium">Versions</h2>
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions published yet.</p>
            ) : null}
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.catVersionId} className="rounded-md border p-3">
                  <p className="text-sm font-medium">
                    {version.version} ({version.status})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Command bundle: {version.commandBundleRef || '-'}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600">
                      View manifest / rulebook
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-xs">
                      {JSON.stringify(
                        { manifestJson: version.manifestJson, rulebookJson: version.rulebookJson },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
