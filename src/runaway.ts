export type Point = { x: number; y: number }
export type Rect = { left: number; top: number; width: number; height: number }

export const inflate = (r: Rect, by: number): Rect => ({
  left: r.left - by,
  top: r.top - by,
  width: r.width + by * 2,
  height: r.height + by * 2,
})

export const union = (a: Rect, b: Rect): Rect => {
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  return {
    left,
    top,
    width: Math.max(a.left + a.width, b.left + b.width) - left,
    height: Math.max(a.top + a.height, b.top + b.height) - top,
  }
}

export const overlaps = (a: Rect, b: Rect) =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top

export const contains = (outer: Rect, inner: Rect) =>
  inner.left >= outer.left &&
  inner.top >= outer.top &&
  inner.left + inner.width <= outer.left + outer.width &&
  inner.top + inner.height <= outer.top + outer.height

/** Distance from a point to the nearest edge of a rect, 0 when the point is inside. */
export const distanceTo = (r: Rect, p: Point) =>
  Math.hypot(
    Math.max(r.left - p.x, 0, p.x - (r.left + r.width)),
    Math.max(r.top - p.y, 0, p.y - (r.top + r.height)),
  )

type SpotRequest = {
  size: { width: number; height: number }
  /** Where the button may live. */
  area: Rect
  /** Most important first: if the screen is too cramped to dodge everything, only the first one is kept. */
  avoid: Rect[]
  /** Current top-left corner, so every escape is a real move. */
  from?: Point
  /** Cursor or fingertip, so the new spot is out of reach. */
  pointer?: Point | null
}

/**
 * Picks a random top-left corner for the button inside `area`.
 * Random sampling keeps the escapes unpredictable; when no sample is ideal,
 * the one furthest from the pointer wins.
 */
export function pickSpot({ size, area, avoid, from, pointer }: SpotRequest): Point {
  const maxX = Math.max(area.left, area.left + area.width - size.width)
  const maxY = Math.max(area.top, area.top + area.height - size.height)
  const short = Math.min(area.width, area.height)
  const reach = Math.max(110, short * 0.3)
  const hop = Math.max(70, short * 0.2)

  for (const blockers of [avoid, avoid.slice(0, 1)]) {
    let best: Point | null = null
    let bestScore = -Infinity

    for (let i = 0; i < 60; i++) {
      const spot = {
        x: area.left + Math.random() * (maxX - area.left),
        y: area.top + Math.random() * (maxY - area.top),
      }
      const rect = { left: spot.x, top: spot.y, ...size }
      if (blockers.some((b) => overlaps(rect, b))) continue

      const away = pointer ? distanceTo(rect, pointer) : Infinity
      const moved = from ? Math.hypot(spot.x - from.x, spot.y - from.y) : Infinity
      if (away >= reach && moved >= hop) return spot

      const score = Math.min(away, reach) * 2 + Math.min(moved, hop)
      if (score > bestScore) {
        best = spot
        bestScore = score
      }
    }
    if (best) return best
  }

  return { x: maxX, y: maxY }
}
