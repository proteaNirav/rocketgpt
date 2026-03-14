import { redirect } from 'next/navigation'

import { isDemoMode } from '@/lib/demo-mode'

export default function CatsCatchAllPage() {
  if (isDemoMode()) {
    redirect('/cats/library')
  }

  redirect('/cats/library')
}
