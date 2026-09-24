# Kana Quest – Học Hiragana & Katakana

React 19 + Vite + TypeScript + Tailwind CSS v4 + Zustand + react-router-dom.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Cấu trúc

```
src/
  config/modules.ts       Registry điều hướng (module active + "Coming Soon")
  data/kana.ts            208 KanaItem (46 thanh âm, 20 biến âm, 5 bán biến âm, 33 ảo âm × 2 bảng chữ)
  data/words.ts           Từ vựng cho Word Builder
  types/kana.ts           KanaItem, ScopeConfig, CharStat...
  store/useScopeStore.ts  ScopeConfig (persist: kq-scope)
  store/useProgressStore  Streak, EXP/Level, thống kê đúng/sai theo charId (persist: kq-progress)
  lib/scope.ts            buildKanaPool() – Core engine lọc phạm vi học
  hooks/useActivePool.ts  activeKanaPool dùng chung cho Flashcard & game
  hooks/useGameSession.ts Ghi nhận đáp án, cộng EXP, chốt kết quả ván
  lib/audio.ts            SpeechSynthesis (ja-JP) + SFX Web Audio API
  layouts/MainLayout.tsx  Sidebar (desktop) / Bottom nav (mobile) + TopBar
  pages/                  Dashboard, KanaChart (bảng + flashcard), StudyScope, GameArena
  pages/games/            MemoryMatch, FallingKana, AudioQuiz, WordBuilder
```

## Thêm module mới (vd Kanji)
1. Đổi `status` trong `config/modules.ts` từ `'soon'` → `'active'`.
2. Thay `<ComingSoon>` bằng trang thật trong `App.tsx`.

## Luật gamification
- Mỗi câu đúng +10 EXP; thắng ván +30 EXP. Level n cần n×100 EXP.
- "Chữ hay sai": tỷ lệ đúng < 60%. "Đã thuộc": đúng ≥ 3 lần và ≥ 80%.
