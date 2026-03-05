import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'

const COLORS = ['#2c92e6','#4cc972','#7c3aed','#f59e0b','#dc2626','#0891b2','#db2777','#059669']

/* ── Canvas text measurement ─────────────────────────────────────────────── */

let _cvs: HTMLCanvasElement | null = null
const measure = (text: string, px: number, weight: number) => {
  if (!_cvs) _cvs = document.createElement('canvas')
  const ctx = _cvs.getContext('2d')!
  ctx.font = `${weight} ${px}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`
  return { w: Math.ceil(ctx.measureText(text).width) + 4, h: Math.ceil(px * 1.18) }
}

/* ── Deterministic RNG ───────────────────────────────────────────────────── */

const rng = (seed: number) => {
  let s = seed | 0
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

/* ── Bitmap-based collision grid ─────────────────────────────────────────── */
// Instead of O(n²) rect-vs-rect, we use a coarse 2D bitmap grid.
// Each cell is 4×4 px. Marking + checking is O(area) per word but
// eliminates false-negative overlaps from rotated bounding boxes.

class CollisionGrid {
  private cellSize: number
  private cols: number
  private rows: number
  private grid: Uint8Array

  constructor(w: number, h: number, cellSize = 4) {
    this.cellSize = cellSize
    this.cols = Math.ceil(w / cellSize)
    this.rows = Math.ceil(h / cellSize)
    this.grid = new Uint8Array(this.cols * this.rows)
  }

  test(x: number, y: number, w: number, h: number): boolean {
    const cs = this.cellSize
    const c0 = Math.max(0, Math.floor(x / cs))
    const r0 = Math.max(0, Math.floor(y / cs))
    const c1 = Math.min(this.cols - 1, Math.floor((x + w) / cs))
    const r1 = Math.min(this.rows - 1, Math.floor((y + h) / cs))
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.grid[r * this.cols + c]) return true
    return false
  }

  mark(x: number, y: number, w: number, h: number) {
    const cs = this.cellSize
    const c0 = Math.max(0, Math.floor(x / cs))
    const r0 = Math.max(0, Math.floor(y / cs))
    const c1 = Math.min(this.cols - 1, Math.floor((x + w) / cs))
    const r1 = Math.min(this.rows - 1, Math.floor((y + h) / cs))
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        this.grid[r * this.cols + c] = 1
  }
}

/* ── Types ───────────────────────────────────────────────────────────────── */

interface Placed {
  word: string; count: number
  x: number; y: number
  fs: number; fw: number
  color: string; w: number; h: number
}

/* ── Placement engine ────────────────────────────────────────────────────── */

function layout(words: [string, number][], W: number, H: number): Placed[] {
  if (!words.length || W < 100) return []

  const rand = rng(42)
  const maxC = words[0][1], minC = words[words.length - 1][1], span = maxC - minC || 1
  const maxF = Math.min(44, W * 0.09, H * 0.15)
  const minF = Math.max(9, maxF * 0.24)

  const cx = W / 2, cy = H / 2
  const Rx = W * 0.48, Ry = H * 0.46

  const grid = new CollisionGrid(W, H, 3)
  const result: Placed[] = []

  const inEllipse = (x: number, y: number, w: number, h: number) => {
    const px = (x + w / 2 - cx) / Rx, py = (y + h / 2 - cy) / Ry
    return px * px + py * py <= 1
  }

  for (let i = 0; i < words.length; i++) {
    const [word, count] = words[i]
    const fs = minF + ((count - minC) / span) * (maxF - minF)
    const fw = fs > maxF * 0.7 ? 800 : fs > maxF * 0.45 ? 700 : fs > maxF * 0.25 ? 600 : 500
    const col = COLORS[i % COLORS.length]
    const { w: ww, h: wh } = measure(word, fs, fw)

    let bestX = -1, bestY = -1, bestD = Infinity, found = false

    // Strategy: concentric rings from center, many angles per ring
    // More attempts for bigger/important words
    const numRings = 40
    const anglesPerRing = i < 3 ? 48 : i < 10 ? 36 : 24
    const phase = rand() * Math.PI * 2

    for (let ring = 0; ring <= numRings; ring++) {
      const frac = ring / numRings

      if (ring === 0) {
        const tx = cx - ww / 2, ty = cy - wh / 2
        if (tx >= 0 && ty >= 0 && tx + ww <= W && ty + wh <= H &&
            inEllipse(tx, ty, ww, wh) && !grid.test(tx, ty, ww, wh)) {
          bestX = tx; bestY = ty; found = true; break
        }
        continue
      }

      for (let a = 0; a < anglesPerRing; a++) {
        const angle = phase + (a / anglesPerRing) * Math.PI * 2
        const tx = Math.round(cx + Math.cos(angle) * Rx * frac - ww / 2)
        const ty = Math.round(cy + Math.sin(angle) * Ry * frac - wh / 2)

        if (tx < 0 || ty < 0 || tx + ww > W || ty + wh > H) continue
        if (!inEllipse(tx, ty, ww, wh)) continue
        if (grid.test(tx, ty, ww, wh)) continue

        const dx = tx + ww / 2 - cx, dy = ty + wh / 2 - cy
        const d = dx * dx + dy * dy
        if (d < bestD) { bestX = tx; bestY = ty; bestD = d; found = true }
        // Once we found something in inner rings, stop looking further out
        if (frac < 0.5) break
      }

      if (found && frac > 0.15) break  // don't search further rings once placed
    }

    if (!found) continue

    grid.mark(bestX, bestY, ww, wh)
    result.push({ word, count, x: bestX, y: bestY, fs, fw, color: col, w: ww, h: wh })
  }

  return result
}

/* ── React component ─────────────────────────────────────────────────────── */

export const WordCloud: React.FC<{ words: Map<string, number> }> = ({ words }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState<string | null>(null)

  const sorted = useMemo(
    () => Array.from(words.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50),
    [words],
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sync = () => { const r = el.getBoundingClientRect(); setSize({ w: r.width, h: Math.max(r.height, 300) }) }
    sync()
    const obs = new ResizeObserver(sync)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const placed = useMemo(
    () => size.w > 80 && sorted.length ? layout(sorted, size.w, size.h) : [],
    [sorted, size.w, size.h],
  )

  const enter = useCallback((w: string) => setHovered(w), [])
  const leave = useCallback(() => setHovered(null), [])

  if (!sorted.length) return null

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', minHeight: 300, height: 300, overflow: 'hidden', cursor: 'default' }}>
      {placed.map(pw => {
        const isH = hovered === pw.word
        const dim = hovered != null && !isH
        return (
          <span
            key={pw.word}
            onMouseEnter={() => enter(pw.word)}
            onMouseLeave={leave}
            style={{
              position: 'absolute',
              left: pw.x, top: pw.y,
              fontSize: pw.fs, fontWeight: pw.fw,
              color: pw.color,
              lineHeight: 1.18,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'opacity 0.15s',
              opacity: dim ? 0.12 : isH ? 1 : 0.92,
              filter: isH ? `drop-shadow(0 0 8px ${pw.color}66)` : undefined,
              zIndex: isH ? 10 : 1,
            }}
          >
            {pw.word}
          </span>
        )
      })}

      {hovered && (() => {
        const pw = placed.find(p => p.word === hovered)
        if (!pw) return null
        return (
          <div style={{
            position: 'absolute',
            left: Math.max(50, Math.min(pw.x + pw.w / 2, size.w - 50)),
            top: pw.y - 4,
            transform: 'translate(-50%,-100%)',
            background: 'var(--bg-card,#1e2130)',
            border: '1px solid var(--border-color,rgba(255,255,255,0.15))',
            borderRadius: 6, padding: '3px 10px',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-primary,#e2e8f0)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            {pw.word} <span style={{ color: pw.color, marginLeft: 2 }}>{pw.count}</span>
          </div>
        )
      })()}
    </div>
  )
}