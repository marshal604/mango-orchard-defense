import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { WorldScene } from '../game/scene'
import type { Game, GameEvent } from '../game/logic/game'
import { zoneAt, type Point } from '../game/logic/map'

interface Props {
  game: Game
  paused: boolean
  onEvents?: (events: GameEvent[]) => void
  guideTarget?: () => Point | null
}

export function GameView({ game, paused, onEvents, guideTarget }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  const onEventsRef = useRef(onEvents)
  const guideRef = useRef(guideTarget)
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    pausedRef.current = paused
    onEventsRef.current = onEvents
    guideRef.current = guideTarget
  })

  useEffect(() => {
    if (!host.current) return
    let bannerTimer = 0
    const handleEvents = (events: GameEvent[]) => {
      for (const e of events) {
        if (e.type !== 'zone') continue
        const z = game.map.zones.find((zone) => zone.id === e.zone) ?? zoneAt(game.map, game.player)
        setBanner(`${z.name}　危險度 ${z.stars}`)
        window.clearTimeout(bannerTimer)
        bannerTimer = window.setTimeout(() => setBanner(null), 1500)
      }
      onEventsRef.current?.(events)
    }
    const phaser = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#01215b',
      scale: { mode: Phaser.Scale.RESIZE, width: host.current.clientWidth, height: host.current.clientHeight },
      pixelArt: true,
      scene: [],
    })
    phaser.scene.add('world', WorldScene, true, {
      game,
      onEvents: handleEvents,
      isPaused: () => pausedRef.current,
      guideTarget: () => guideRef.current?.() ?? null,
    })
    if (import.meta.env.DEV) window.__game = game
    return () => {
      window.clearTimeout(bannerTimer)
      phaser.destroy(true)
    }
  }, [game])

  return (
    <div className="game-view">
      <div ref={host} className="game-canvas" />
      {banner && <div className="zone-banner" role="status">{banner}</div>}
    </div>
  )
}
