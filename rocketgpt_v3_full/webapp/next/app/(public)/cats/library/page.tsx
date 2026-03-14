import CatsLibraryTable from '@/components/cats/CatsLibraryTable'

export default function CatsLibraryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Library</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Demo-safe catalog view powered by the local 100-item seed library.
      </p>
      <CatsLibraryTable />
    </div>
  )
}
