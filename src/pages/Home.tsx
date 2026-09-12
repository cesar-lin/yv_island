import { useEffect, useRef } from 'react'
import { createIslandGame } from '../game/IslandGame'

export default function Home() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const game = createIslandGame(ref.current)
    return () => game.dispose()
  }, [])

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
    </div>
  )
}
