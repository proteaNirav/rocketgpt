'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import Button from '@/components/ui/button'
import { CatDto, listCats } from '@/lib/admin-cats-api'

export default function AdminCatsPage() {
  const [items, setItems] = useState<CatDto[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const response = await listCats(1, 50)
      setItems(response.items)
    } catch (err: any) {
      setError(String(err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin CATS Registry</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Link href="/admin/cats/new">
            <Button>Create CAT</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Tenant</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((cat) => (
              <tr key={cat.catId} className="border-t">
                <td className="px-3 py-2">
                  <Link className="text-blue-600 hover:underline" href={`/admin/cats/${cat.catId}`}>
                    {cat.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{cat.status}</td>
                <td className="px-3 py-2">{cat.tenantId}</td>
                <td className="px-3 py-2">{new Date(cat.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  No CATS yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
