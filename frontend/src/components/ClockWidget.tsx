import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'

function fmtSec(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtHM(t: string) {
  return t.slice(11, 16)  // HH:MM
}

export default function ClockWidget() {
  const [state, setState] = useState<any>(null)
  const [now, setNow] = useState(new Date())
  const [toggling, setToggling] = useState(false)
  const refreshRef = useRef<any>(null)

  // 实时秒针
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = async () => {
    const r = await api.get('/clock/state')
    setState(r.data)
  }
  useEffect(() => { load() }, [])

  // 工作中时每 5 秒刷新累计工时
  useEffect(() => {
    if (state?.is_working) {
      refreshRef.current = setInterval(load, 5000)
    } else if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [state?.is_working])

  const toggle = async () => {
    if (toggling) return
    setToggling(true)
    await api.post('/clock/toggle')
    await load()
    setToggling(false)
  }

  // 当前工作段已持续时长（仅当工作中）
  const currentSeconds = state?.is_working && state?.current_session_start
    ? Math.max(0, Math.floor((now.getTime() - new Date(state.current_session_start).getTime()) / 1000))
    : 0

  // 按钮文案：根据状态切换
  let btnText = '上班签到'
  if (state?.is_working) btnText = '下班签出'
  else if (state?.session_count > 0) btnText = '继续工作'

  // 工时范围
  const rangeText = state?.first_in
    ? `${fmtHM(state.first_in)} ~ ${state.is_working ? fmtHM(now.toISOString()) : fmtHM(state.last_out || state.first_in)}`
    : '—'

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg">
      <div className="flex flex-wrap items-center gap-6">
        {/* 大字时间 */}
        <div>
          <div className="text-4xl font-bold text-white tabular-nums tracking-wider" style={{ color: '#a78bfa' }}>
            {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}:{String(now.getSeconds()).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 mt-1">当前时间</div>
        </div>

        {/* 今日状态 */}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-400 mb-1">今日状态</div>
          <div className="text-sm text-slate-200 flex items-center gap-2 flex-wrap">
            {!state ? (
              <span>加载中…</span>
            ) : state.session_count === 0 ? (
              <>
                <span className="text-slate-400">○</span>
                <span>今日还未签到</span>
              </>
            ) : state.is_working ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300">工作中</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">本次 {fmtSec(currentSeconds)}</span>
                <span className="text-slate-500">·</span>
                <span>累计工时 {fmtSec(state.total_seconds + currentSeconds)}</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400">✓</span>
                <span className="text-emerald-300">今日已签出</span>
                <span className="text-slate-500">·</span>
                <span>累计工时 {fmtSec(state.total_seconds)}</span>
              </>
            )}
          </div>
        </div>

        {/* 按钮 + 工时范围 */}
        <div className="flex items-center gap-4">
          <button
            className={`px-5 py-2.5 rounded-lg text-white font-medium transition shadow-md flex items-center gap-2 ${
              toggling ? 'opacity-50 cursor-not-allowed' :
              state?.is_working
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700'
            }`}
            onClick={toggle}
            disabled={toggling}
          >
            <span>{state?.is_working ? '🔚' : '☕'}</span>
            <span>{btnText}</span>
          </button>

          <div className="text-right">
            <div className="text-xs text-slate-400">工时</div>
            <div className="text-sm text-slate-200 tabular-nums">{rangeText}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
