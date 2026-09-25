/** Hình học & thuật toán chấm nét cho game Tập viết (tách riêng để kiểm thử được). */

export type P = { x: number; y: number }

/* ---------------- Hình học ---------------- */

export const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
export const pathLen = (ps: P[]) => ps.reduce((s, p, i) => (i ? s + dist(ps[i - 1], p) : 0), 0)

export function distToPolyline(p: P, line: P[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]
    const b = line[i]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = dx * dx + dy * dy
    const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)))
  }
  return best
}

/** Nội suy Catmull-Rom qua các điểm mốc → đường cong mượt. */
export function spline(pts: P[]): P[] {
  if (pts.length === 2) return Array.from({ length: 21 }, (_, i) => ({ x: pts[0].x + ((pts[1].x - pts[0].x) * i) / 20, y: pts[0].y + ((pts[1].y - pts[0].y) * i) / 20 }))
  const out: P[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    for (let s = 0; s < 12; s++) {
      const t = s / 12
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) })
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** Lấy mẫu lại nét người dùng mỗi ~3px để kiểm tra không bị "nhảy cóc" khi vẽ nhanh. */
export function resample(ps: P[], step = 3): P[] {
  if (ps.length < 2) return ps
  const out = [ps[0]]
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1]
    const b = ps[i]
    const n = Math.max(1, Math.floor(dist(a, b) / step))
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  return out
}

export interface Check {
  ok: boolean
  reason?: string
  avg?: number
}

/** Thuật toán chấm một nét: điểm đặt bút, chiều, độ lệch (tolerance) và thứ tự đi qua các điểm mốc. */
/** Diện tích có hướng (công thức shoelace): dấu cho biết vòng quay theo/ngược chiều kim đồng hồ. */
function signedArea(ps: P[]) {
  let a = 0
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]
    const q = ps[(i + 1) % ps.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

const meanDist = (ps: P[], line: P[]) => ps.reduce((s, p) => s + distToPolyline(p, line), 0) / ps.length

/**
 * @param later các nét PHÍA SAU nét hiện tại – dùng để phát hiện viết sai thứ tự
 *              (vd hai gạch của dấu ゛ nằm sát nhau).
 */
export function validateStroke(userRaw: P[], model: P[], checkpoints: P[], tol: number, later: P[][] = []): Check {
  const user = resample(userRaw)
  if (user.length < 3 || pathLen(user) < pathLen(model) * 0.45) return { ok: false, reason: 'Nét quá ngắn – hãy vẽ hết nét.' }
  const first = user[0]
  const last = user[user.length - 1]
  // Ngược chiều: đặt bút gần điểm CUỐI hơn điểm đầu và nhấc bút gần điểm ĐẦU hơn điểm cuối.
  // (So sánh tương đối để đúng cả với nét rất ngắn như dấu ゛ ゜.)
  const start = model[0]
  const end = model[model.length - 1]
  if (dist(first, end) < dist(first, start) && dist(last, start) < dist(last, end))
    return { ok: false, reason: 'Ngược chiều nét! Hãy đi theo mũi tên.' }
  // Nét khép kín (vòng tròn ゜): hai đầu trùng nhau → xét chiều quay thay vì điểm đầu/cuối.
  const len = pathLen(model)
  if (dist(start, end) < len * 0.25) {
    const want = signedArea(model)
    const got = signedArea(user)
    if (Math.abs(want) > len * 0.5 && Math.sign(want) !== Math.sign(got))
      return { ok: false, reason: 'Ngược chiều vòng! Hãy đi theo mũi tên.' }
  }
  // Sai thứ tự: nét vừa vẽ khớp với một nét phía sau rõ hơn nét hiện tại.
  const here = meanDist(user, model)
  if (later.some((m) => meanDist(user, m) < here * 0.6)) return { ok: false, reason: 'Sai thứ tự nét – hãy viết nét có chấm số trước.' }
  if (dist(first, model[0]) > tol * 1.8) return { ok: false, reason: 'Đặt bút sai chỗ – bắt đầu từ chấm có số.' }
  const ds = user.map((p) => distToPolyline(p, model))
  if (ds.filter((d) => d > tol).length / ds.length > 0.15) return { ok: false, reason: 'Nét bị lệch khỏi đường mẫu.' }
  let next = 0
  for (const p of user) if (next < checkpoints.length && dist(p, checkpoints[next]) <= tol * 1.4) next++
  if (next < checkpoints.length) return { ok: false, reason: 'Chưa đi qua đủ các điểm của nét.' }
  return { ok: true, avg: ds.reduce((a, b) => a + b, 0) / ds.length }
}
