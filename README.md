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

## Đồng bộ tài khoản (Supabase – miễn phí)
1. Tạo project tại https://supabase.com → SQL Editor → chạy `supabase/schema.sql`.
2. Project Settings → API: lấy **Project URL** và **anon public key**.
3. Local: copy `.env.example` → `.env.local` và điền 2 giá trị. Vercel: Settings → Environment Variables → thêm `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` rồi Redeploy.
4. Authentication → URL Configuration: đặt **Site URL** = địa chỉ web (vd https://kana-quest.vercel.app).

Không có 2 biến môi trường thì app vẫn chạy offline, nút tài khoản tự ẩn.

## Nguồn dữ liệu
- **Thứ tự nét (game Tập viết):** [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, giấy phép [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). File `src/data/strokes.ts` là bản chuyển đổi tự sinh bằng `npm run gen:strokes` và được phân phối theo cùng giấy phép CC BY-SA 3.0.
