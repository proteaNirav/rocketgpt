'use client'
import { useEffect, useState } from 'react'

type Row = {
  user_id: string
  email: string
  endpoint: string
  allowed_hits: number
  blocked_hits: number
  last_call: string
}

export default function UsagePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((j) => {
        setRows(j.data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6">Loading usageâ€¦</div>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Rate Limit Usage</h1>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-800 text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2">Endpoint</th>
              <th className="px-3 py-2">Allowed</th>
              <th className="px-3 py-2">Blocked</th>
              <th className="px-3 py-2">Last Call</th>
            </tr>
          </thead>
          <tbody className="bg-neutral-900 text-gray-100">
            {rows.map((r) => (
              <tr key={`${r.user_id}-${r.endpoint}`}>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.endpoint}</td>
                <td className="px-3 py-2 text-green-400 text-center">{r.allowed_hits}</td>
                <td className="px-3 py-2 text-red-400 text-center">{r.blocked_hits}</td>
                <td className="px-3 py-2 text-gray-400">
                  {new Date(r.last_call).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
