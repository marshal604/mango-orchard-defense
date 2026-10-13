import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { WorldScene, type GuideTarget } from '../game/scene'
import { dprOf } from '../game/sprites'
import type { Game, GameEvent } from '../game/logic/game'

interface Props {
  game: Game
  paused: boolean
  onEvents: (events: GameEvent[]) => void
  guide: () => GuideTarget | null
  cover: () => { top: number; bottom: number }
}

// Mounts Phaser once per Game. Canvas is backed at devicePixelRatio (capped at 2) for crisp text and art.
export function GameView({ game, paused, onEvents, guide, cover }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef({ paused, onEvents, guide, cover })

  useEffect(() => {
    latest.current = { paused, onEvents, guide, cover }
  })

  useEffect(() => {
    const el = host.current
    if (!el) return
    let phaser: Phaser.Game | null = null
    let cancelled = false
    const size = () => ({ w: el.clientWidth * dprOf(), h: el.clientHeight * dprOf() })
    const onResize = () => {
      if (!phaser) return
      const { w, h } = size()
      phaser.scale.resize(w, h)
      phaser.scale.setZoom(1 / dprOf())
    }
    // Canvas text must never render in the fallback font, so wait for Cubic 11 first.
    void document.fonts.load('16px "Cubic 11"').catch(() => undefined).then(() => {
      if (cancelled) return
      const { w, h } = size()
      phaser = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el,
        backgroundColor: '#01215b',
        antialias: true,
        scale: { mode: Phaser.Scale.NONE, width: w, height: h, zoom: 1 / dprOf() },
        scene: [],
      })
      phaser.scene.add('world', WorldScene, true, {
        game,
        onEvents: (events: GameEvent[]) => latest.current.onEvents(events),
        isPaused: () => latest.current.paused,
        guide: () => latest.current.guide(),
        cover: () => latest.current.cover(),
      })
      window.addEventListener('resize', onResize)
    })
    if (import.meta.env.DEV) window.__game = game
    if (import.meta.env.DEV) window.__phaser = () => phaser
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      phaser?.destroy(true)
    }
  }, [game])

  return <div ref={host} className="game-canvas" />
}
