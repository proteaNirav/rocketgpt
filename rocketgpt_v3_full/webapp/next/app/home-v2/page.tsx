'use client'

import { HomeV2LeftPane } from '@/components/home-v2/left-pane'
import { HomeV2CenterPane } from '@/components/home-v2/center-pane'
import { HomeV2RightPane } from '@/components/home-v2/right-pane'

export default function HomeV2Page() {
  return (
    <div className="flex h-full min-h-screen">
      <HomeV2LeftPane />
      <HomeV2CenterPane />
      <HomeV2RightPane />
    </div>
  )
}
