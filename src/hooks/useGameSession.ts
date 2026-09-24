import { useCallback, useRef, useState } from 'react'
import { useProgressStore, type GameId } from '../store/useProgressStore'
import { playSfx } from '../lib/audio'

export interface GameSummary {
  score: number
  expGained: number
  isRecord: boolean
  won: boolean
}

/**
 * Logic dùng chung cho các mini-game: ghi nhận đúng/sai theo charId, cộng EXP,
 * và chốt kết quả ván chơi.
 */
export function useGameSession(game: GameId) {
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const finishGame = useProgressStore((s) => s.finishGame)
  const [summary, setSummary] = useState<GameSummary | null>(null)
  const expRef = useRef(0)
  // Chữ trả lời sai trong ván này → gợi ý thêm vào Sổ hay quên ở màn kết quả.
  const [missed, setMissed] = useState<string[]>([])

  const answer = useCallback(
    (charIds: string | string[], correct: boolean, opts: { silent?: boolean } = {}) => {
      const ids = Array.isArray(charIds) ? charIds : [charIds]
      ids.forEach((id) => recordAnswer(id, correct))
      if (correct) expRef.current += 10 * ids.length
      else setMissed((m) => [...new Set([...m, ...ids])])
      if (!opts.silent) playSfx(correct ? 'correct' : 'wrong')
    },
    [recordAnswer],
  )

  const finish = useCallback(
    (score: number, won: boolean, bonusExp = won ? 30 : 0) => {
      const isRecord = finishGame(game, score, bonusExp)
      setSummary({ score, expGained: expRef.current + bonusExp, isRecord, won })
      playSfx(won ? 'win' : 'lose')
    },
    [finishGame, game],
  )

  const reset = useCallback(() => {
    expRef.current = 0
    setSummary(null)
    setMissed([])
  }, [])

  return { answer, finish, reset, summary, missed }
}
