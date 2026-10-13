import { useState } from 'react'
import type { Difficulty } from './game/logic/config'
import { Board, HowTo, Setup, Title } from './ui/Menus'
import { PlayScreen } from './ui/PlayScreen'

type ScreenId = 'title' | 'setup' | 'howto' | 'board' | 'play'

const PREFS_KEY = 'st_prefs'

function loadPrefs(): { nickname: string; difficulty: Difficulty } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as { nickname?: unknown; difficulty?: unknown }
    return {
      nickname: typeof p.nickname === 'string' ? p.nickname : '',
      difficulty: p.difficulty === 'hell' ? 'hell' : 'normal',
    }
  } catch {
    return { nickname: '', difficulty: 'normal' }
  }
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('title')
  const [prefs, setPrefs] = useState(loadPrefs)

  const go = (nickname: string, difficulty: Difficulty) => {
    const next = { nickname, difficulty }
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    setPrefs(next)
    setScreen('play')
  }

  return (
    <main className="app">
      {screen === 'title' && <Title onStart={() => setScreen('setup')} onBoard={() => setScreen('board')} onHowTo={() => setScreen('howto')} />}
      {screen === 'setup' && <Setup initial={prefs} onGo={go} onBack={() => setScreen('title')} />}
      {screen === 'howto' && <HowTo onBack={() => setScreen('title')} />}
      {screen === 'board' && <Board onBack={() => setScreen('title')} />}
      {screen === 'play' && <PlayScreen nickname={prefs.nickname} difficulty={prefs.difficulty} onHome={() => setScreen('title')} />}
    </main>
  )
}
