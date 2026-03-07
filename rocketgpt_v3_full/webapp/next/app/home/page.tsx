'use client'

import LeftSessionsPane from './ChatWorkspace/LeftSessionsPane'
import CenterChatPane from './ChatWorkspace/CenterChatPane'
import RightInspectorPane from './ChatWorkspace/RightInspectorPane'
import CollapsibleWrapper from './ChatWorkspace/CollapsibleWrapper'
import { HomeChatProvider } from './ChatWorkspace/HomeChatContext'

export default function HomeChatPage() {
  return (
    <HomeChatProvider>
      <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-slate-950 text-slate-50">
        <div className="flex h-full flex-row">
          <CollapsibleWrapper side="left">
            <LeftSessionsPane />
          </CollapsibleWrapper>

          <div className="flex-1 min-w-0 h-full">
            <CenterChatPane />
          </div>

          <CollapsibleWrapper side="right">
            <RightInspectorPane />
          </CollapsibleWrapper>
        </div>
      </div>
    </HomeChatProvider>
  )
}
