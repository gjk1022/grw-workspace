import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import api, { awardPoints } from '../lib/api'

const MOOD_EMOJI = ['', '😡', '😣', '😐', '😊', '😀']
const MOOD_LABEL = ['', '很差', '较差', '一般', '较好', '很好']
const MOOD_REASONS = ['焦虑', '太累', '人际关系', '没啥原因']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export default function Health() {
  const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }
  const today = todayStr()

  const [todayLog, setTodayLog] = useState<any>(null)
  const [score, setScore] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [warnings, setWarnings] = useState<any[]>([])
  const [weightTrend, setWeightTrend] = useState<any[]>([])
  const [moodTrend, setMoodTrend] = useState<any[]>([])
  const [waterTrend, setWaterTrend] = useState<any[]>([])
  const [sleepTrend, setSleepTrend] = useState<any[]>([])
  const [exercisePlan, setExercisePlan] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])

  const [saving, setSaving] = useState(false)
  const [moodVal, setMoodVal] = useState(3)
  const [moodReasons, setMoodReasons] = useState<string[]>([])
  const [sleepH, setSleepH] = useState(7)
  const [weightKg, setWeightKg] = useState('')
  const [waterCups, setWaterCups] = useState(0)
  const [breakfast, setBreakfast] = useState(0)
  const [exerciseDone, setExerciseDone] = useState('')
  const [note, setNote] = useState('')
  const [planDialog, setPlanDialog] = useState(false)

  const load = () => {
    // 今日日志
    api.get(`/health?q=`).then(r => {
      const todayLog = r.data.find((h: any) => h.log_date === today) || null
      setTodayLog(todayLog)
      if (todayLog) {
        setMoodVal(todayLog.mood || 3)
        setMoodReasons(todayLog.mood_reasons ? todayLog.mood_reasons.split(',') : [])
        setSleepH(todayLog.sleep_hours || 7)
        setWeightKg(todayLog.weight ? String(todayLog.weight) : '')
        setWaterCups(todayLog.water_cups || 0)
        setBreakfast(todayLog.breakfast || 0)
        setExerciseDone(todayLog.exercise_actual || '')
        setNote(todayLog.note || '')
      } else {
        setMoodVal(3); setMoodReasons([]); setSleepH(7)
        setWeightKg(''); setWaterCups(0); setBreakfast(0)
        setExerciseDone(''); setNote('')
      }
      setHistory(r.data)
    }).catch(() => {})

    // 评分
    api.get(`/health/score?date=${today}`).then(r => setScore(r.data)).catch(() => {})
    // 连续打卡
    api.get('/health/streak').then(r => setStreak(r.data.streak_days)).catch(() => {})
    // 规则
    api.get('/health/rules').then(r => setWarnings(r.data.warnings)).catch(() => {})
    // 趋势
    api.get('/health/trends?type=weight&days=30').then(r => setWeightTrend(r.data)).catch(() => {})
    api.get('/health/trends?type=mood&days=30').then(r => setMoodTrend(r.data)).catch(() => {})
    api.get('/health/trends?type=water&days=30').then(r => setWaterTrend(r.data)).catch(() => {})
    api.get('/health/trends?type=sleep&days=14').then(r => setSleepTrend(r.data)).catch(() => {})
    // 运动计划
    api.get('/exercise-plan').then(r => {
      if (r.data.plan) {
        try { setExercisePlan(JSON.parse(r.data.plan.plan_data)) } catch { setExercisePlan(null) }
      } else setExercisePlan(null)
    }).catch(() => {})
  }
  useEffect(() => { load() }, [])

  // 保存今天日志
  const saveLog = async (fields: any) => {
    setSaving(true)
    if (todayLog?.id) {
      await api.put(`/health/${todayLog.id}`, fields)
    } else {
      await api.post('/health', { ...fields, log_date: today })
      awardPoints(3)
    }
    setSaving(false)
    load()
  }

  const bumpWater = () => { const n = waterCups + 1; setWaterCups(n); saveLog({ water_cups: n }) }
  const toggleBreakfast = () => { const n = breakfast ? 0 : 1; setBreakfast(n); saveLog({ breakfast: n }) }
  const setMood = (v: number) => { setMoodVal(v); saveLog({ mood: v }) }
  const toggleMoodReason = (r: string) => {
    const next = moodReasons.includes(r) ? moodReasons.filter(x => x !== r) : [...moodReasons, r]
    setMoodReasons(next); saveLog({ mood_reasons: next.join(',') })
  }
  const saveSleepWeight = () => { saveLog({ sleep_hours: sleepH, weight: weightKg ? parseFloat(weightKg) : null }) }
  const saveNote = () => { saveLog({ note }) }
  const saveExercise = () => { saveLog({ exercise_actual: exerciseDone, exercise_minutes: parseExerciseMinutes(exerciseDone) }) }

  const parseExerciseMinutes = (s: string) => {
    const m = s.match(/(\d+)\s*(分钟|分|min)/i)
    return m ? parseInt(m[1]) : 0
  }

  // 运动完成率
  const calcExerciseRate = () => {
    if (!exercisePlan || exercisePlan.length === 0) return { planned: 0, done: 0, rate: 0 }
    const planned = exercisePlan.length
    let done = 0
    if (exerciseDone && exerciseDone.trim()) {
      // 简单计数：今日如果有实际运动，算1次（当天对应计划的完成）
      done = 1
    }
    // 更精确：从 history 里找本周完成
    const weekStart = getWeekStart()
    const weekEnd = getWeekEnd()
    const weekLogs = history.filter((h: any) => h.log_date >= weekStart && h.log_date <= weekEnd && h.exercise_actual && h.exercise_actual.trim())
    done = Math.min(weekLogs.length, planned)
    return { planned, done, rate: planned > 0 ? Math.round((done / planned) * 100) : 0 }
  }

  const fmtLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const getWeekStart = () => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
    return fmtLocal(d)
  }
  const getWeekEnd = () => {
    const d = new Date(getWeekStart()); d.setDate(d.getDate() + 6)
    return fmtLocal(d)
  }

  const exerciseRate = calcExerciseRate()

  // 保存运动计划
  const savePlan = async (plan: any) => {
    await api.post('/exercise-plan', { plan })
    setExercisePlan(plan)
    setPlanDialog(false)
  }

  // 图表
  const weightOption = {
    title: { text: '体重变化曲线 (kg)', left: 'left', textStyle: { fontSize: 13, color: '#666' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 35, right: 20, top: 35, bottom: 25 },
    xAxis: { type: 'category', data: weightTrend.map(t => t.date?.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', min: v => Math.max(40, v.min - 5) },
    series: [{ data: weightTrend.map(t => t.value), type: 'line', smooth: true, symbolSize: 4,
      itemStyle: { color: '#6366f1' }, areaStyle: { color: 'rgba(99,102,241,0.08)' } }]
  }

  const moodOption = {
    title: { text: '情绪波动规律', left: 'left', textStyle: { fontSize: 13, color: '#666' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 35, right: 20, top: 35, bottom: 25 },
    xAxis: { type: 'category', data: moodTrend.map(t => t.date?.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', min: 1, max: 5, interval: 1 },
    series: [{ data: moodTrend.map(t => t.value), type: 'line', smooth: true, symbolSize: 4,
      itemStyle: { color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.1)' } }]
  }

  const waterOption = {
    title: { text: '饮水量统计 (杯)', left: 'left', textStyle: { fontSize: 13, color: '#666' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 35, right: 20, top: 35, bottom: 25 },
    xAxis: { type: 'category', data: waterTrend.map(t => t.date?.slice(5)), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value' },
    series: [{ data: waterTrend.map(t => t.value), type: 'bar', barWidth: 14,
      itemStyle: { color: '#06b6d4', borderRadius: [3, 3, 0, 0] } }]
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">健康打卡</h1>
          <p className="text-sm text-gray-500 mt-1">身体是革命的本钱 💪</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-emerald-500">🔥</span>
            <span className="text-gray-600 dark:text-slate-300">连续打卡 <b className="text-emerald-600">{streak}</b> 天</span>
          </div>
        )}
      </div>

      {/* 联动规则警告 */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w: any, i: number) => (
            <div key={i} className="card border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-900/10 flex items-start gap-3 py-3">
              <span className="text-lg">⚠️</span>
              <span className="text-sm text-amber-800 dark:text-amber-200">{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== 1. 健康概览 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card text-center lg:col-span-1">
          <div className="text-sm text-gray-500">今日健康评分</div>
          <div className="flex items-baseline justify-center gap-1 mt-2">
            <span className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">{score?.score || 0}</span>
            <span className="text-lg text-gray-400">分</span>
          </div>
          <div className={`mt-1 text-sm font-medium ${
            score?.rating === '优秀' ? 'text-emerald-500' :
            score?.rating === '良好' ? 'text-indigo-500' :
            score?.rating === '一般' ? 'text-amber-500' : 'text-rose-500'
          }`}>{score?.rating || '无记录'}</div>
          <div className="text-[11px] text-gray-400 mt-2">睡眠·运动·情绪·早餐·饮水</div>
        </div>
        <div className="card lg:col-span-2">
          <div className="text-sm text-gray-500 mb-3">评分明细</div>
          {score?.breakdown ? (
            <div className="space-y-2">
              {[
                { label: '😴 睡眠', key: 'sleep', max: 25 },
                { label: '🏃 运动', key: 'exercise', max: 25 },
                { label: '😊 情绪', key: 'mood', max: 25 },
                { label: '🍳 早餐', key: 'breakfast', max: 15 },
                { label: '💧 饮水', key: 'water', max: 10 },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20">{item.label}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(score.breakdown[item.key] / item.max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">{score.breakdown[item.key]}/{item.max}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-gray-400 py-2">今天还没打卡，快记录吧</div>}
        </div>
      </div>

      {/* ===== 4. 情绪与睡眠打卡（睡前必填）===== */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">🌙 情绪与睡眠打卡</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 情绪评分 */}
          <div>
            <div className="label">情绪等级</div>
            <div className="flex gap-2 mt-1 flex-wrap">
              {[1,2,3,4,5].map(v => (
                <button key={v}
                  onClick={() => setMood(v)}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 transition ${
                    moodVal === v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-110' : 'border-gray-200 dark:border-slate-600 hover:border-indigo-300'
                  }`}>
                  {MOOD_EMOJI[v]}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">{MOOD_LABEL[moodVal]}</div>
            {moodVal < 3 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">状态不佳原因（可多选）：</div>
                <div className="flex flex-wrap gap-1">
                  {MOOD_REASONS.map(r => (
                    <button key={r}
                      onClick={() => toggleMoodReason(r)}
                      className={`text-xs px-2 py-1 rounded-full border transition ${
                        moodReasons.includes(r) ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/30 text-rose-600' : 'border-gray-200 dark:border-slate-600 text-gray-500'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 睡眠 */}
          <div>
            <div className="label">睡眠时长（小时）</div>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="24" step="0.5" value={sleepH} onChange={e => setSleepH(Number(e.target.value))}
                className="input w-24 text-center text-lg font-semibold" />
              <span className="text-sm text-gray-400">小时</span>
              <button className="btn-primary text-xs" onClick={saveSleepWeight}>保存</button>
            </div>
          </div>
          {/* 体重 */}
          <div>
            <div className="label">体重（kg）</div>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="30" max="200" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                placeholder="60" className="input w-24 text-center text-lg font-semibold" />
              <span className="text-sm text-gray-400">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2. 身体数据看板 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100">📊 身体数据看板</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 早餐 */}
            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-2">🍳 今日早餐</div>
              <button onClick={toggleBreakfast}
                className={`text-3xl transition ${breakfast ? 'scale-110' : 'grayscale opacity-40'}`}>
                {breakfast ? '🍽️' : '🥚'}
              </button>
              <div className={`text-sm font-medium mt-1 ${breakfast ? 'text-emerald-600' : 'text-gray-400'}`}>
                {breakfast ? '已吃早饭 ✓' : '还没吃早饭'}
              </div>
            </div>
            {/* 饮水 */}
            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-400 mb-2">💧 今日饮水</div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={bumpWater} className="text-3xl hover:scale-110 transition active:scale-95">🥛</button>
                <span className="text-2xl font-bold text-gray-800 dark:text-slate-100">{waterCups}</span>
                <span className="text-sm text-gray-400">/ 8 杯</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${Math.min((waterCups / 8) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          {weightTrend.length > 0 && <ReactECharts option={weightOption} style={{ height: 220 }} />}
        </div>
        <div className="card lg:col-span-1">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">🏃 运动管理</h3>
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">本周运动完成率</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600">{exerciseRate.rate}%</span>
              <span className="text-xs text-gray-400">{exerciseRate.done}/{exerciseRate.planned} 次</span>
              <button className="text-xs text-indigo-500 hover:underline ml-auto" onClick={() => setPlanDialog(true)}>设定计划</button>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${exerciseRate.rate}%` }} />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">今日运动打卡</div>
            <textarea className="input min-h-[60px] text-sm" placeholder="如：跑步30分钟、瑜伽20分钟…"
              value={exerciseDone} onChange={e => setExerciseDone(e.target.value)} />
            <button className="btn-primary text-xs mt-2" onClick={saveExercise}>记录</button>
          </div>
          {exercisePlan && exercisePlan.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
              <div className="text-xs text-gray-500 mb-1">本周计划：</div>
              <ul className="space-y-0.5 text-xs text-gray-600 dark:text-slate-300">
                {exercisePlan.map((p: any, i: number) => (
                  <li key={i}>📌 {p.day} — {p.name} {p.minutes ? `${p.minutes}分钟` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {moodTrend.length > 0 && (
          <div className="card"><ReactECharts option={moodOption} style={{ height: 220 }} /></div>
        )}
        {waterTrend.length > 0 && (
          <div className="card"><ReactECharts option={waterOption} style={{ height: 220 }} /></div>
        )}
      </div>

      {/* ===== 历史 ===== */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">📋 近期记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 dark:text-slate-400 border-b dark:border-slate-700">
              <th className="py-2">日期</th><th>🛏</th><th>🏃</th><th>😊</th><th>🍳</th><th>💧</th><th>⚖</th><th>备注</th>
            </tr></thead>
            <tbody>
              {history.slice(0, 14).map((h: any) => (
                <tr key={h.id} className="border-b dark:border-slate-700 last:border-0 text-gray-600 dark:text-slate-300">
                  <td className="py-2 text-gray-800 dark:text-slate-200">{h.log_date}</td>
                  <td>{h.sleep_hours || '-'}h</td>
                  <td>{h.exercise_minutes || '-'}分</td>
                  <td>{MOOD_EMOJI[h.mood] || '😐'}</td>
                  <td>{h.breakfast ? '✅' : '-'}</td>
                  <td>{h.water_cups || '-'}杯</td>
                  <td>{h.weight || '-'}</td>
                  <td className="text-gray-400 text-xs max-w-[100px] truncate">{h.note}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-400">还没有打卡记录</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 运动计划弹窗 */}
      {planDialog && (
        <Modal onClose={() => setPlanDialog(false)} title="设定本周运动计划">
          <ExercisePlanForm plan={exercisePlan} onSave={savePlan} onCancel={() => setPlanDialog(false)} />
        </Modal>
      )}
    </div>
  )
}

function ExercisePlanForm({ plan, onSave, onCancel }: { plan: any[] | null; onSave: (p: any) => void; onCancel: () => void }) {
  const [items, setItems] = useState<any[]>(plan || [
    { day: '周一', name: '', minutes: 30 },
    { day: '周三', name: '', minutes: 30 },
    { day: '周五', name: '', minutes: 30 }
  ])

  const add = () => setItems([...items, { day: '周一', name: '', minutes: 30 }])
  const update = (i: number, k: string, v: any) => {
    const next = [...items]; next[i] = { ...next[i], [k]: v }; setItems(next)
  }
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <select className="input w-20 text-sm" value={p.day} onChange={e => update(i, 'day', e.target.value)}>
            {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input className="input flex-1 text-sm" placeholder="运动项目" value={p.name} onChange={e => update(i, 'name', e.target.value)} />
          <input className="input w-20 text-sm" type="number" placeholder="分钟" value={p.minutes} onChange={e => update(i, 'minutes', Number(e.target.value))} />
          <button className="text-xs text-rose-400 hover:text-rose-600" onClick={() => remove(i)}>×</button>
        </div>
      ))}
      <button className="text-xs text-indigo-500 hover:underline" onClick={add}>＋ 添加计划</button>
      <div className="flex gap-2 justify-end pt-2">
        <button className="btn-ghost text-sm" onClick={onCancel}>取消</button>
        <button className="btn-primary text-sm" onClick={() => onSave(items)}>保存计划</button>
      </div>
    </div>
  )
}
