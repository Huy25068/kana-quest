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
      // Module tương lai: route đã được giữ chỗ, chỉ cần thay element khi phát triển.
      ...FUTURE_MODULES.map((m) => ({ path: m.path, element: wrap(<ComingSoon module={m} />) })),
      { path: '*', element: wrap(<NotFound />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
