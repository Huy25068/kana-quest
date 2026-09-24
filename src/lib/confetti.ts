import confetti from 'canvas-confetti'

const COLORS = ['#ff96b0', '#ffc2d1', '#9dcb78', '#86b9fb', '#ffd24a', '#bea4fd']

export function celebrate() {
  const end = Date.now() + 900
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS })
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: COLORS })
  frame()
}
