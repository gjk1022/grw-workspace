import { useEffect, useState } from 'react'
import api, { awardPoints } from '../lib/api'
import CrudForm from '../components/CrudForm'
import ReviewPopup from '../components/ReviewPopup'

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function weekRange() {
  const d = new Date()
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  const mon = new Date(d); mon.setDate(d.getDate() - dow + 1)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) }
}
function monthRange() {
  const d = new Date()
  const first = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const last = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0')
  const isLastDay = d.getDate() === lastDay
  return { first, last, isLastDay }
}

export default function Goals() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')

  return (
    <div className="space-y-4">
      <ReviewPopup />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">计划中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            {view === 'day' ? '日计划 / 今日任务' : view === 'week' ? '周计划 / 周日复盘' : '月计划 / 月末复盘'}
          </p>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
        {[
          { key: 'day' as const, label: '📅 日', tip: '今日任务' },
          { key: 'week' as const, label: '📆 周', tip: '周日复盘' },
          { key: 'month' as const, label: '🗓️ 月', tip: '月末复盘' },
        ].map(v => (
          <button key={v.key}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${
              view === v.key ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
            onClick={() => setView(v.key)}
            title={v.tip}
          >{v.label}</button>
        ))}
      </div>

      {view === 'day' && <DayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}
    </div>
  )
}

// ===== 日视图 =====
function DayView() {
  const [tasks, setTasks] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const today = todayStr()

  const load = () => api.get('/tasks').then(r => {
    setTasks(r.data || [])
  })

  const pending = tasks.filter(t => t.status !== 'done')
  const doneList = tasks.filter(t => t.status === 'done')
  const done = doneList.length
  const overdueCount = pending.filter(t =>
    (t.plan_date || t.deadline) && ((t.plan_date && t.plan_date < today) || (t.deadline && t.deadline < today))
  ).length
  useEffect(() => { load() }, [])

  const toggleDone = async (t: any) => {
    setToggling(t.id)
    await api.put(`/tasks/${t.id}`, { status: t.status === 'done' ? 'pending' : 'done', progress: t.status === 'done' ? 0 : 100 })
    if (t.status !== 'done') awardPoints(5)
    setToggling(null); load()
  }
  const handleProgress = async (t: any, val?: number, finalize?: boolean) => {
    // 拖拽时实时推送，finalize 时最终确认
    if (finalize) {
      await api.put(`/tasks/${t.id}`, { progress: t.progress })
      return
    }
    if (val !== undefined) {
      const newVal = Math.round(val / 10) * 10
      await api.put(`/tasks/${t.id}`, { progress: newVal }).catch(() => {})
      load()
    }
  }
  const save = async (v: any) => {
    if (editing?.id) await api.put(`/tasks/${editing.id}`, v)
    else await api.post('/tasks', { ...v, plan_date: today })
    setShowAdd(false); setEditing(null); load()
  }
  const del = async (id: number) => { if (!confirm('确认删除？')) return; await api.delete(`/tasks/${id}`); load() }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-slate-400">
          今日 {done}/{tasks.length} 项完成{done === tasks.length && tasks.length > 0 && ' 🎉'}
        </div>
        <button className="btn-primary text-sm" onClick={() => { setEditing(null); setShowAdd(true) }}>＋ 新建任务</button>
      </div>

      {tasks.length === 0 && <div className="card text-center py-12 text-gray-400">今日暂无任务，点击「新建任务」添加</div>}

      {pending.map(t => (
        <TaskCard key={t.id} t={t} toggling={toggling} onToggle={toggleDone} onEdit={() => { setEditing(t); setShowAdd(true) }} onDel={() => del(t.id)} onProgress={handleProgress} />
      ))}
      {done > 0 && (
        <div className="text-xs text-gray-400 mt-2 font-medium">✓ 已完成 ({done})</div>
      )}
      {doneList.map(t => (
        <TaskCard key={t.id} t={t} toggling={toggling} onToggle={toggleDone} onEdit={() => { setEditing(t); setShowAdd(true) }} onDel={() => del(t.id)} onProgress={handleProgress} />
      ))}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title={editing ? '编辑任务' : '新建任务'}>
          <CrudForm
            fields={[
              { key: 'title', label: '标题', required: true, full: true },
              { key: 'type', label: '类型', options: ['academic', 'reading', 'experiment', 'communication', 'other'] },
              { key: 'priority', label: '优先级', options: ['high', 'medium', 'low'] },
              { key: 'tag', label: '分类标签', options: ['核心科研', '文献阅读', '日常事务', '实验模拟', '论文写作', '组会准备', '离上岸更近', '自我提升'] },
              { key: 'description', label: '描述', type: 'textarea', full: true }
            ]}
            initial={{ plan_date: today, status: 'pending', progress: 0 }}
            onSubmit={save} onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}
    </div>
  )
}

// ===== 周视图 =====
function WeekView() {
  const [tasks, setTasks] = useState<any[]>([])
  const { start, end } = weekRange()
  const isSunday = new Date().getDay() === 0
  const [showReview, setShowReview] = useState(false)
  const [review, setReview] = useState('')

  const load = () => api.get('/tasks').then(r => {
    setTasks(r.data.filter((t: any) => (t.plan_date >= start && t.plan_date <= end) || (t.deadline >= start && t.deadline <= end)))
  })
  useEffect(() => { load() }, [])

  const saveReview = async () => {
    if (!review.trim()) return
    await api.post('/reviews', { title: `周复盘 ${start} ~ ${end}`, content: review.trim(), review_date: start, review_type: 'weekly' })
    alert('✅ 周复盘已保存')
    setShowReview(false); setReview('')
  }

  const done = tasks.filter(t => t.status === 'done').length

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 dark:text-slate-400">
        本周：{start} ~ {end} · {done}/{tasks.length} 项完成
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">本周暂无任务</div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => <TaskCardReadOnly key={t.id} t={t} />)}
        </div>
      )}

      {isSunday && (
        <div className="card border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-300">📝 周日复盘</div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">今天是周日，回顾本周完成情况</div>
            </div>
            <button className="btn-primary text-sm" onClick={() => setShowReview(true)}>写复盘</button>
          </div>

          {showReview && (
            <div className="mt-4 space-y-3">
              <textarea className="input min-h-[120px] text-sm" placeholder="本周完成了什么？遇到什么困难？下周有什么计划？" value={review} onChange={e => setReview(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost text-sm" onClick={() => setShowReview(false)}>取消</button>
                <button className="btn-primary text-sm" onClick={saveReview}>保存复盘</button>
              </div>
            </div>
          )}
        </div>
      )}
      {!isSunday && <div className="text-xs text-gray-400 text-center py-4">周日在此处写周复盘</div>}
    </div>
  )
}

// ===== 月视图 =====
function MonthView() {
  const [tasks, setTasks] = useState<any[]>([])
  const { first, last, isLastDay } = monthRange()
  const [showReview, setShowReview] = useState(false)
  const [review, setReview] = useState('')

  const load = () => api.get('/tasks').then(r => {
    setTasks(r.data.filter((t: any) => (t.plan_date >= first && t.plan_date <= last)))
  })
  useEffect(() => { load() }, [])

  const saveReview = async () => {
    if (!review.trim()) return
    await api.post('/reviews', { title: `月复盘 ${first?.slice(0, 7)}`, content: review.trim(), review_date: first, review_type: 'monthly' })
    alert('✅ 月复盘已保存')
    setShowReview(false); setReview('')
  }

  const done = tasks.filter(t => t.status === 'done').length

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 dark:text-slate-400">
        本月：{first} ~ {last} · {done}/{tasks.length} 项完成
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">本月暂无任务</div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => <TaskCardReadOnly key={t.id} t={t} />)}
        </div>
      )}

      {isLastDay && (
        <div className="card border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-indigo-800 dark:text-indigo-300">📝 月末复盘</div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">今天是月末，回顾本月整体进展</div>
            </div>
            <button className="btn-primary text-sm" onClick={() => setShowReview(true)}>写复盘</button>
          </div>
          {showReview && (
            <div className="mt-4 space-y-3">
              <textarea className="input min-h-[140px] text-sm" placeholder="本月总体进展如何？关键成果是什么？下月计划？" value={review} onChange={e => setReview(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost text-sm" onClick={() => setShowReview(false)}>取消</button>
                <button className="btn-primary text-sm" onClick={saveReview}>保存复盘</button>
              </div>
            </div>
          )}
        </div>
      )}
      {!isLastDay && <div className="text-xs text-gray-400 text-center py-4">月末在此处写月复盘</div>}
    </div>
  )
}

// ===== 任务卡片（可交互）+ 进度条 + 分类标签 =====
function TaskCard({ t, toggling, onToggle, onEdit, onDel, onProgress }: any) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className={`card flex flex-col py-3 px-4 hover:shadow-sm transition group ${t.status === 'done' ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(t) }}
          title={t.status === 'done' ? '点击取消完成' : '点击标记完成'}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition ${toggling === t.id ? 'scale-90 opacity-50' : ''} ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500 hover:bg-rose-400 hover:border-rose-400' : t.priority === 'high' ? 'border-rose-400' : 'border-gray-300'}`}
        >
          {t.status === 'done' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-slate-200'}`}>{t.title}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {t.tag && (
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-300 font-medium">
                {t.tag}
              </span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.priority === 'high' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : t.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600'}`}>
              {t.priority === 'high' ? '高优先' : t.priority === 'medium' ? '中优先' : '低优先'}
            </span>
            <span className="text-[10px] text-gray-400">{t.progress || 0}%</span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
          <button className="btn-ghost text-xs" onClick={(e) => { e.stopPropagation(); onEdit() }}>编辑</button>
          <button className="btn-ghost text-xs text-rose-500" onClick={(e) => { e.stopPropagation(); onDel() }}>删除</button>
        </div>
      </div>
      {/* 手动拖拽进度条 */}
      {t.status !== 'done' && (
        <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <input
            type="range" min="0" max="100" step="10"
            value={t.progress || 0}
            onChange={e => {
              const v = Number(e.target.value)
              setDragging(true)
              onProgress?.(t, v)
            }}
            onMouseUp={() => { if (dragging) { setDragging(false); onProgress?.(t, undefined, true) } }}
            onTouchEnd={() => { if (dragging) { setDragging(false); onProgress?.(t, undefined, true) } }}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-slate-600
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow
              [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition"
            style={{
              background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${t.progress || 0}%, #d1d5db ${t.progress || 0}%, #d1d5db 100%)`
            }}
          />
          <span className="text-[10px] text-gray-400 w-8 text-right flex-shrink-0">{t.progress || 0}%</span>
        </div>
      )}
    </div>
  )
}

function TaskCardReadOnly({ t }: any) {
  return (
    <div className={`card flex items-center gap-3 py-2.5 px-4 text-sm ${t.status === 'done' ? 'opacity-60' : ''}`}>
      <span className={`w-4 h-4 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-emerald-500' : t.priority === 'high' ? 'bg-rose-400' : 'bg-gray-300'}`} />
      <span className={`flex-1 ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-300'}`}>{t.title}</span>
      <span className="text-xs text-gray-400">{t.plan_date}</span>
    </div>
  )
}
