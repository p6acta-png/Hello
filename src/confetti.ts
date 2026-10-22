import confetti from 'canvas-confetti'

// Strawberry pink, blush, cream, white and just a little champagne gold.
const colors = ['#D57789', '#D57789', '#EBA4B1', '#F5C9D0', '#FFF3E2', '#FFFFFF', '#D8B577']

const base: confetti.Options = {
  colors,
  scalar: 1.05,
  disableForReducedMotion: true,
  gravity: 0.9,
  decay: 0.92,
  ticks: 240,
  zIndex: 10,
}

/** Three natural bursts: a pop from the «Да» button, two side cannons, then a slow drift from above. */
export function celebrate(origin: { x: number; y: number }) {
  // Fewer particles on a phone so the screen stays airy.
  const density = 0.7 + 0.3 * Math.min(1, (window.innerWidth * window.innerHeight) / (1280 * 800))
  const count = (n: number) => Math.round(n * density)

  confetti({ ...base, origin, particleCount: count(80), spread: 70, startVelocity: 38 })

  setTimeout(() => {
    confetti({ ...base, origin: { x: 0, y: 0.72 }, angle: 58, particleCount: count(55), spread: 52, startVelocity: 54 })
    confetti({ ...base, origin: { x: 1, y: 0.72 }, angle: 122, particleCount: count(55), spread: 52, startVelocity: 54 })
  }, 260)

  setTimeout(() => {
    confetti({
      ...base,
      origin: { x: 0.5, y: 0.2 },
      particleCount: count(70),
      spread: 160,
      startVelocity: 20,
      gravity: 0.55,
      decay: 0.94,
      ticks: 320,
      scalar: 0.9,
    })
  }, 760)
}
