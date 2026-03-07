import CatsReportsDashboard from '@/components/cats/CatsReportsDashboard'

export default function CatsReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Reports</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Demo analytics for library composition, usage, and workflow run activity.
      </p>
      <CatsReportsDashboard />
    </div>
  )
}
