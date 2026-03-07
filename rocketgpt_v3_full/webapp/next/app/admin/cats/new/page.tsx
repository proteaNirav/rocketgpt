'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FormEvent } from 'react'

import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import { createCat } from '@/lib/admin-cats-api'

export default function AdminCatsNewPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = await createCat({ name: name.trim(), description: description.trim() })
      router.push(`/admin/cats/${created.catId}`)
    } catch (err: any) {
      setError(String(err?.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create CAT</h1>
        <Link href="/admin/cats" className="text-sm text-blue-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form className="space-y-3 rounded-md border p-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="cat-name">
            Name
          </label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="CAT name"
            required
            maxLength={200}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="cat-description">
            Description
          </label>
          <textarea
            id="cat-description"
            className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Creating...' : 'Create Draft CAT'}
        </Button>
      </form>
    </div>
  )
}
