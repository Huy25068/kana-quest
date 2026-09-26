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
  /** Độ lệch trung bình so với sai số cho phép (0 = trùng khít) – dùng để chấm điểm. */
  ratio?: number
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

const centroid = (ps: P[]) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length })

/**
 * Dời + co giãn nét người dùng cho khớp tâm và độ dài với nét mẫu
 * → chỉ còn so HÌNH DÁNG và CHIỀU, không phụ thuộc viết ở đâu / to hay nhỏ.
 */
/** Độ tỏa quanh tâm (căn bậc hai trung bình bình phương khoảng cách) – ít bị ảnh hưởng bởi rung tay hơn độ dài nét. */
const spread = (ps: P[], c: P) => Math.sqrt(ps.reduce((a, p) => a + (p.x - c.x) ** 2 + (p.y - c.y) ** 2, 0) / ps.length)

export function normalizeTo(user: P[], model: P[]): P[] {
  const cu = centroid(user)
  const cm = centroid(model)
  const k = spread(resample(model), cm) / Math.max(1, spread(user, cu))
  return user.map((p) => ({ x: cm.x + (p.x - cu.x) * k, y: cm.y + (p.y - cu.y) * k }))
}

export interface ValidateOptions {
  /** Các nét PHÍA SAU nét hiện tại – để phát hiện viết sai thứ tự. */
  later?: P[][]
  /** Không bắt đúng vị trí/kích thước (chế độ Ẩn mẫu): chỉ chấm hình dáng, chiều, thứ tự. */
  freePosition?: boolean
}

export function validateStroke(userRaw: P[], model: P[], checkpoints: P[], tol: number, opts: ValidateOptions = {}): Check {
  const { later = [], freePosition = false } = opts
  const raw = resample(userRaw)
  if (raw.length < 3) return { ok: false, reason: 'Nét quá ngắn – hãy vẽ hết nét.' }
  if (freePosition ? pathLen(raw) < tol * 0.35 : pathLen(raw) < pathLen(model) * 0.45)
    return { ok: false, reason: 'Nét quá ngắn – hãy vẽ hết nét.' }
  const user = freePosition ? normalizeTo(raw, model) : raw
  // Sai số theo kích thước nét khi không bắt đúng vị trí: nét nhỏ (vd dấu ゛) → sai số nhỏ tương ứng,
  // tránh việc vẽ hình bất kỳ rồi co lại vẫn lọt qua.
  const t = freePosition ? Math.min(tol, Math.max(tol * 0.3, spread(resample(model), centroid(model)) * 0.45)) : tol
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
  } else if (freePosition) {
    // Hướng tổng thể (đặt bút → nhấc bút) phải gần với mẫu.
    const a = Math.atan2(end.y - start.y, end.x - start.x)
    const b = Math.atan2(last.y - first.y, last.x - first.x)
    const diff = Math.abs(((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    if (diff > Math.PI / 4) return { ok: false, reason: 'Sai hướng nét.' }
  }
  // Sai thứ tự: nét vừa vẽ khớp với một nét phía sau rõ hơn nét hiện tại.
  const here = meanDist(user, model)
  if (later.some((m) => meanDist(freePosition ? normalizeTo(raw, m) : raw, m) < here * 0.6)) return { ok: false, reason: 'Sai thứ tự nét – hãy viết nét có chấm số trước.' }
  if (dist(first, model[0]) > t * 1.8) return { ok: false, reason: 'Đặt bút sai chỗ – bắt đầu từ chấm có số.' }
  const ds = user.map((p) => distToPolyline(p, model))
  if (ds.filter((d) => d > t).length / ds.length > 0.15) return { ok: false, reason: 'Nét bị lệch khỏi đường mẫu.' }
  let next = 0
  for (const p of user) if (next < checkpoints.length && dist(p, checkpoints[next]) <= t * 1.4) next++
  if (next < checkpoints.length) return { ok: false, reason: 'Chưa đi qua đủ các điểm của nét.' }
  const avg = ds.reduce((a, b) => a + b, 0) / ds.length
  return { ok: true, avg, ratio: avg / t }
}
