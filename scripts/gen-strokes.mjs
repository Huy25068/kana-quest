/**
 * Sinh src/data/strokes.ts từ dữ liệu KanjiVG (https://kanjivg.tagaini.net, CC BY-SA 3.0, © Ulrich Apel).
 *
 *   node scripts/gen-strokes.mjs
 *
 * - Tải SVG của từng chữ (có cache trong thư mục tạm của hệ điều hành).
 * - Đọc các <path> theo thứ tự nét, lấy mẫu đường Bézier thành chuỗi điểm cách đều, quy về khung 0–100.
 * - Ảo âm (きゃ, シュ…) được ghép từ chữ gốc + chữ nhỏ ゃゅょ.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(tmpdir(), 'kanjivg-cache')
mkdirSync(CACHE, { recursive: true })

const HIRA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん' +
  'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'
const SMALL = 'ゃゅょ'
const toKata = (s) => [...s].map((c) => String.fromCharCode(c.charCodeAt(0) + 0x60)).join('')
const YOON_BASES = 'きしちにひみりぎじびぴ'

const BOX = 109 // viewBox của KanjiVG
const STEP = 5 // khoảng cách điểm mẫu (đơn vị KanjiVG)

async function fetchSvg(ch) {
  const code = ch.codePointAt(0).toString(16).padStart(5, '0')
  const file = join(CACHE, `${code}.svg`)
  if (existsSync(file)) return readFileSync(file, 'utf8')
  const res = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`)
  if (!res.ok) throw new Error(`Không tải được ${ch} (${code}): ${res.status}`)
  const text = await res.text()
  writeFileSync(file, text)
  return text
}

/* ---------- SVG path → điểm ---------- */

function tokenize(d) {
  return d.match(/[MmCcSsLlHhVvZz]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g)
}

function cubic(p0, p1, p2, p3, n = 16) {
  const out = []
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

function pathToPoints(d) {
  const tk = tokenize(d)
  let i = 0
  let cmd = ''
  let cur = [0, 0]
  let lastCtrl = null
  const pts = []
  const num = () => parseFloat(tk[i++])
  while (i < tk.length) {
    if (/[a-zA-Z]/.test(tk[i])) cmd = tk[i++]
    const rel = cmd === cmd.toLowerCase()
    const off = (x, y) => (rel ? [cur[0] + x, cur[1] + y] : [x, y])
    switch (cmd.toLowerCase()) {
      case 'm': {
        cur = off(num(), num())
        pts.push(cur)
        cmd = rel ? 'l' : 'L'
        lastCtrl = null
        break
      }
      case 'l': {
        cur = off(num(), num())
        pts.push(cur)
        lastCtrl = null
        break
      }
      case 'h': {
        const x = num()
        cur = [rel ? cur[0] + x : x, cur[1]]
        pts.push(cur)
        break
      }
      case 'v': {
        const y = num()
        cur = [cur[0], rel ? cur[1] + y : y]
        pts.push(cur)
        break
      }
      case 'c': {
        const c1 = off(num(), num())
        const c2 = off(num(), num())
        const end = off(num(), num())
        pts.push(...cubic(cur, c1, c2, end))
        lastCtrl = c2
        cur = end
        break
      }
      case 's': {
        const c1 = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur
        const c2 = off(num(), num())
        const end = off(num(), num())
        pts.push(...cubic(cur, c1, c2, end))
        lastCtrl = c2
        cur = end
        break
      }
      case 'z':
        break
      default:
        throw new Error('Lệnh SVG chưa hỗ trợ: ' + cmd)
    }
  }
  return pts
}

/** Lấy mẫu lại theo độ dài cung → các điểm cách đều STEP. */
function resample(pts) {
  const cum = [0]
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]))
  const total = cum[cum.length - 1]
  const n = Math.max(1, Math.round(total / STEP))
  const out = []
  let k = 1
  for (let i = 0; i <= n; i++) {
    const d = (total * i) / n
    while (k < pts.length - 1 && cum[k] < d) k++
    const seg = cum[k] - cum[k - 1] || 1
    const t = Math.min(1, Math.max(0, (d - cum[k - 1]) / seg))
    out.push([pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * t, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * t])
  }
  return out
}

async function strokesOf(ch) {
  const svg = await fetchSvg(ch)
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  if (!paths.length) throw new Error('Không có nét cho ' + ch)
  return paths.map((d) => resample(pathToPoints(d)).map(([x, y]) => [(x / BOX) * 100, (y / BOX) * 100]))
}

/* ---------- Ghép ảo âm ---------- */

function bbox(strokes) {
  const xs = strokes.flat().map((p) => p[0])
  const ys = strokes.flat().map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}
const transform = (strokes, f) => strokes.map((s) => s.map(f))

function composeYoon(base, small) {
  // Chữ gốc thu nhỏ bên trái, chữ nhỏ ゃゅょ đặt góc dưới bên phải.
  const b = bbox(base)
  const sb = (58 / Math.max(b.x1 - b.x0, b.y1 - b.y0))
  const left = transform(base, ([x, y]) => [4 + (x - b.x0) * sb, 50 - ((b.y1 - b.y0) * sb) / 2 + (y - b.y0) * sb])
  const s = bbox(small)
  const ss = 34 / Math.max(s.x1 - s.x0, s.y1 - s.y0)
  const right = transform(small, ([x, y]) => [64 + (x - s.x0) * ss, 80 - (s.y1 - s.y0) * ss + (y - s.y0) * ss])
  return [...left, ...right]
}

/* ---------- Chạy ---------- */

const round = (strokes) => strokes.map((s) => s.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]))
const out = {}
const all = [...HIRA, ...SMALL, ...toKata(HIRA), ...toKata(SMALL)]
for (const ch of all) {
  out[ch] = round(await strokesOf(ch))
  process.stdout.write(ch)
}
for (const script of ['h', 'k']) {
  const bases = script === 'h' ? YOON_BASES : toKata(YOON_BASES)
  const smalls = script === 'h' ? SMALL : toKata(SMALL)
  for (const b of bases) for (const s of smalls) out[b + s] = round(composeYoon(out[b], out[s]))
}
for (const s of [...SMALL, ...toKata(SMALL)]) delete out[s] // chữ nhỏ đứng riêng không có trong bài học

const body = Object.entries(out)
  .map(([ch, strokes]) => `  '${ch}': ${JSON.stringify(strokes)},`)
  .join('\n')

writeFileSync(
  join(ROOT, 'src/data/strokes.ts'),
  `/**
 * Dữ liệu nét viết (Kakijun) – TỰ SINH bởi scripts/gen-strokes.mjs, không sửa tay.
 *
 * Nguồn: KanjiVG (https://kanjivg.tagaini.net) © Ulrich Apel,
 * giấy phép Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0).
 * Dữ liệu dưới đây là bản chuyển đổi (lấy mẫu điểm, quy về khung 0–100, ghép ảo âm)
 * và được phân phối theo cùng giấy phép CC BY-SA 3.0.
 *
 * Mỗi chữ: danh sách nét theo thứ tự; mỗi nét: các điểm [x, y] theo đúng chiều đặt bút.
 */
export type Stroke = [number, number][]

export const STROKES_CREDIT = {
  name: 'KanjiVG',
  author: 'Ulrich Apel',
  url: 'https://kanjivg.tagaini.net',
  license: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
}

// prettier-ignore
export const STROKES: Record<string, Stroke[]> = {
${body}
}
`,
)
console.log(`\nĐã sinh ${Object.keys(out).length} chữ → src/data/strokes.ts`)
