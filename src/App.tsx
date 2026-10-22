import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { celebrate } from './confetti'
import { contains, distanceTo, inflate, overlaps, pickSpot, union, type Point, type Rect } from './runaway'

// How close a cursor or a fingertip may get before «Нет» runs off.
const CURSOR_REACH = 44
const FINGER_REACH = 28
// Breathing room between «Нет» and the screen edge.
const EDGE = 14
const LEAVE_MS = 450

type Phase = 'asking' | 'leaving' | 'yes'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function textRects(el: Element) {
  const rects: DOMRect[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode)
    rects.push(...range.getClientRects())
  }
  return rects
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('asking')

  const safeRef = useRef<HTMLDivElement>(null)
  const questionRef = useRef<HTMLHeadingElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)
  const slotRef = useRef<HTMLSpanElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)
  const answerRef = useRef<HTMLHeadingElement>(null)

  const spot = useRef<Point | null>(null) // where «Нет» sits once it has left its place
  const flight = useRef<Animation | null>(null)
  const pointer = useRef<Point | null>(null)
  const lastDodge = useRef(0)
  const lastTouch = useRef<(Point & { at: number }) | null>(null)
  const answered = useRef(false)

  // The visible screen, minus notches and home indicators.
  const arena = (): Rect => {
    const safe = safeRef.current!.getBoundingClientRect()
    const vv = window.visualViewport
    const left = Math.max(safe.left, vv?.offsetLeft ?? 0) + EDGE
    const top = Math.max(safe.top, vv?.offsetTop ?? 0) + EDGE
    const right = Math.min(safe.right, vv ? vv.offsetLeft + vv.width : innerWidth) - EDGE
    const bottom = Math.min(safe.bottom, vv ? vv.offsetTop + vv.height : innerHeight) - EDGE
    return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
  }

  // «Да» (and the spot «Нет» started from) first, then every line of the question.
  const blockers = (): Rect[] => [
    inflate(union(yesRef.current!.getBoundingClientRect(), slotRef.current!.getBoundingClientRect()), 18),
    ...textRects(questionRef.current!).map((r) => inflate(r, 10)),
  ]

  const noRect = (): Rect | null => {
    const btn = noRef.current
    if (!btn) return null
    if (!spot.current) return btn.getBoundingClientRect()
    return { left: spot.current.x, top: spot.current.y, width: btn.offsetWidth, height: btn.offsetHeight }
  }

  const place = (next: Point, animate: boolean) => {
    const btn = noRef.current!
    const slot = slotRef.current!
    let from: Point
    let start: string

    if (spot.current) {
      from = spot.current
      start = getComputedStyle(btn).transform // mid-flight position, if it is still moving
    } else {
      // First escape: lift the button out of the row and let «Да» glide to the centre.
      const r = btn.getBoundingClientRect()
      from = { x: r.left, y: r.top }
      start = `translate(${r.left}px, ${r.top}px)`
      slot.style.width = `${slot.offsetWidth}px`
      void slot.offsetWidth
      btn.dataset.free = ''
      slot.style.width = '0px'
      slot.style.marginLeft = '0px'
    }

    const tilt = (Math.random() * 2 - 1) * 6
    const end = `translate(${next.x}px, ${next.y}px) rotate(${tilt.toFixed(1)}deg)`
    const distance = Math.hypot(next.x - from.x, next.y - from.y)

    flight.current?.cancel()
    btn.style.transform = end
    spot.current = next
    if (animate && !reducedMotion()) {
      flight.current = btn.animate([{ transform: start }, { transform: end }], {
        duration: Math.min(280, 170 + distance * 0.12),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      })
    }
  }

  const dodge = (threat?: Point | null) => {
    const btn = noRef.current
    if (!btn || answered.current) return
    const now = performance.now()
    if (now - lastDodge.current < 60) return
    lastDodge.current = now

    const current = noRect()!
    const next = pickSpot({
      size: { width: btn.offsetWidth, height: btn.offsetHeight },
      area: arena(),
      avoid: blockers(),
      from: { x: current.left, y: current.top },
      pointer: threat,
    })
    place(next, true)
  }

  // After a resize, rotation or zoom: if «Нет» ended up off-screen or on top of something, move it.
  const keepInside = () => {
    const btn = noRef.current
    if (!btn || !spot.current || answered.current) return
    const size = { width: btn.offsetWidth, height: btn.offsetHeight }
    const here = { left: spot.current.x, top: spot.current.y, ...size }
    const area = arena()
    const avoid = blockers()
    if (contains(area, here) && !avoid.some((b) => overlaps(here, b))) return
    place(pickSpot({ size, area, avoid, pointer: pointer.current }), false)
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      const r = noRect()
      if (e.pointerType !== 'touch' && r && distanceTo(r, pointer.current) <= CURSOR_REACH) dodge(pointer.current)
    }

    const onDown = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      if (yesRef.current?.contains(e.target as Node)) return
      const r = noRect()
      const reach = e.pointerType === 'mouse' ? 0 : FINGER_REACH
      if (r && distanceTo(r, pointer.current) <= reach) {
        e.preventDefault()
        if (e.pointerType !== 'mouse') lastTouch.current = { ...pointer.current, at: performance.now() }
        dodge(pointer.current)
      }
    }

    let frame = 0
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(keepInside)
    }

    const vv = window.visualViewport
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('resize', onResize)
    vv?.addEventListener('resize', onResize)
    vv?.addEventListener('scroll', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
      vv?.removeEventListener('scroll', onResize)
    }
  }, [])

  useEffect(() => {
    if (phase === 'leaving') {
      const timer = setTimeout(() => setPhase('yes'), LEAVE_MS)
      return () => clearTimeout(timer)
    }
    if (phase === 'yes') answerRef.current?.focus({ preventScroll: true })
  }, [phase])

  const accept = (e: MouseEvent) => {
    // Mobile Safari delivers a tap's click to whatever is under the finger when it lifts. If that tap
    // was aimed at «Нет» and «Да» has since glided into its place, it is not a yes.
    const touch = lastTouch.current
    if (touch && performance.now() - touch.at < 1000 && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 48) return
    if (answered.current) return
    answered.current = true
    const r = yesRef.current!.getBoundingClientRect()
    celebrate({ x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight })
    setPhase('leaving')
  }

  return (
    <main className="stage">
      <div className="safe-area" ref={safeRef} aria-hidden="true" />

      {phase === 'yes' ? (
        <h1 className="answer reveal" ref={answerRef} tabIndex={-1}>
          <em>Погнали</em> в&nbsp;субботу&nbsp;<span className="kiss">😘</span>
        </h1>
      ) : (
        <section className={phase === 'leaving' ? 'ask is-leaving' : 'ask'} inert={phase === 'leaving'}>
          <h1 className="question reveal" ref={questionRef}>
            <em>Катя,</em> <span>пойдёшь со&nbsp;мной</span> <span>на&nbsp;свидание?</span>
          </h1>

          <div className="choices">
            <button type="button" className="btn btn-yes reveal" ref={yesRef} onClick={accept}>
              Да
            </button>
            <span className="no-slot" ref={slotRef}>
              <button
                type="button"
                className="btn btn-no reveal"
                ref={noRef}
                onClick={(e) => {
                  // Never an answer. A click that slipped through (keyboard, a tap that already
                  // made it run) just sends it off again, unless it is still mid-escape.
                  e.preventDefault()
                  if (performance.now() - lastDodge.current > 400) dodge(pointer.current)
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(':focus-visible')) dodge()
                }}
              >
                Нет
              </button>
            </span>
          </div>
        </section>
      )}
    </main>
  )
}
