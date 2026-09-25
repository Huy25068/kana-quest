import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import { FUTURE_MODULES } from './config/modules'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const KanaChart = lazy(() => import('./pages/KanaChart'))
const StudyScope = lazy(() => import('./pages/StudyScope'))
const GameArena = lazy(() => import('./pages/GameArena'))
const MemoryMatch = lazy(() => import('./pages/games/MemoryMatch'))
const FallingKana = lazy(() => import('./pages/games/FallingKana'))
const AudioQuiz = lazy(() => import('./pages/games/AudioQuiz'))
const WordBuilder = lazy(() => import('./pages/games/WordBuilder'))
const Account = lazy(() => import('./pages/Account'))
const Notes = lazy(() => import('./pages/Notes'))
const KanaWhackAMole = lazy(() => import('./pages/games/KanaWhackAMole'))
const KanaNinja = lazy(() => import('./pages/games/KanaNinja'))
const KanaTracing = lazy(() => import('./pages/games/KanaTracing'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const NotFound = lazy(() => import('./pages/NotFound'))

const Loading = () => (
  <div className="grid h-64 place-items-center font-jp text-4xl text-sakura-300 animate-pulse">あ</div>
)
const wrap = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: wrap(<Dashboard />) },
      { path: '/kana', element: wrap(<KanaChart />) },
      { path: '/scope', element: wrap(<StudyScope />) },
      { path: '/arena', element: wrap(<GameArena />) },
      { path: '/arena/memory', element: wrap(<MemoryMatch />) },
      { path: '/arena/falling', element: wrap(<FallingKana />) },
      { path: '/arena/audio', element: wrap(<AudioQuiz />) },
      { path: '/arena/word-builder', element: wrap(<WordBuilder />) },
      { path: '/arena/whack', element: wrap(<KanaWhackAMole />) },
      { path: '/arena/ninja', element: wrap(<KanaNinja />) },
      { path: '/arena/tracing', element: wrap(<KanaTracing />) },
      { path: '/notes', element: wrap(<Notes />) },
      { path: '/account', element: wrap(<Account />) },
      // Module tương lai: route đã được giữ chỗ, chỉ cần thay element khi phát triển.
      ...FUTURE_MODULES.map((m) => ({ path: m.path, element: wrap(<ComingSoon module={m} />) })),
      { path: '*', element: wrap(<NotFound />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
