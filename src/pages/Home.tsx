import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { createIslandGame } from '../game/IslandGame'
import { createAmbientAudio } from '../game/ambientAudio'
import type { AmbientAudioHandle } from '../game/ambientAudio'

export default function Home() {
  const ref = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AmbientAudioHandle | null>(null)
  const [muted, setMuted] = useState(true) // 默认静音，点喇叭开启

  useEffect(() => {
    if (!ref.current) return
    const game = createIslandGame(ref.current)
    const audio = createAmbientAudio()
    audioRef.current = audio
    return () => {
      game.dispose()
      audio.dispose()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    audioRef.current?.setEnabled(!muted)
  }, [muted])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-sky-300">
      <div ref={ref} className="absolute inset-0" />

      {/* 标题 + 操作说明（合并） */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-2xl bg-black/30 px-5 py-3 text-center text-white backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-wide">Yv 一家的小岛</h1>
        <p className="mt-1 text-xs text-white/85">
          日夜交替 · 晴雨不定 · 晴夜有流星雨 · 白羊随机拜访
        </p>
      </div>

      {/* 环境音开关 */}
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? '打开环境音' : '关闭环境音'}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/30 p-2.5 text-white backdrop-blur-md transition-colors hover:bg-black/45"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  )
}
