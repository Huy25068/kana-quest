import { useProgressStore } from '../store/useProgressStore'

/* ---------------- Phát âm (SpeechSynthesis / audioUrl) ---------------- */

let jaVoice: SpeechSynthesisVoice | null = null

function loadVoice() {
  if (typeof speechSynthesis === 'undefined') return
  const voices = speechSynthesis.getVoices()
  jaVoice =
    voices.find((v) => v.lang === 'ja-JP' && /google|kyoko|nanami|haruka/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('ja')) ??
    null
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoice()
  speechSynthesis.addEventListener?.('voiceschanged', loadVoice)
}

export const hasJapaneseVoice = () => {
  if (!jaVoice) loadVoice()
  return !!jaVoice
}

/** Đọc một chữ/từ tiếng Nhật. Ưu tiên file audio nếu KanaItem có audioUrl. */
export function speak(text: string, opts: { audioUrl?: string; rate?: number } = {}) {
  if (opts.audioUrl) {
    new Audio(opts.audioUrl).play().catch(() => speak(text, { rate: opts.rate }))
    return
  }
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  if (!jaVoice) loadVoice()
  if (jaVoice) u.voice = jaVoice
  u.rate = opts.rate ?? 0.8
  speechSynthesis.speak(u)
}

/* ---------------- Hiệu ứng âm thanh (Web Audio API) ---------------- */

let ctx: AudioContext | null = null
const getCtx = () => {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  gain.gain.setValueAtTime(0.0001, c.currentTime + start)
  gain.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.02)
}

const SFX = {
  correct: () => {
    tone(880, 0, 0.12, 'triangle')
    tone(1320, 0.08, 0.18, 'triangle')
  },
  wrong: () => {
    tone(220, 0, 0.18, 'sawtooth', 0.08)
    tone(160, 0.1, 0.25, 'sawtooth', 0.08)
  },
  flip: () => tone(600, 0, 0.06, 'square', 0.05),
  click: () => tone(1000, 0, 0.04, 'sine', 0.08),
  combo: () => [660, 880, 1100].forEach((f, i) => tone(f, i * 0.05, 0.1, 'triangle', 0.12)),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle')),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.14, 0.25, 'sine', 0.14)),
}

export type SfxName = keyof typeof SFX

export function playSfx(name: SfxName) {
  if (!useProgressStore.getState().sfxEnabled) return
  try {
    SFX[name]()
  } catch {
    /* AudioContext có thể bị chặn trước tương tác đầu tiên */
  }
}
