import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { awardPoints } from '../lib/api'
import { MonthCalendar, CalendarLegend, CalTask, dateKey, weekdayCn } from '../components/Calendar'
import CrudForm from '../components/CrudForm'

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

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const initDate = searchParams.get('date') || dateKey(now)

  const [viewYear, setViewYear] = useState(Number(initDate.slice(0, 4)))
  const [viewMonth, setViewMonth] = useState(Number(initDate.slice(5, 7)))
  const [selectedDate, setSelectedDate] = useState(initDate)
  const [tasksByDate, setTasksByDate] = useState<Record<string, CalTask[]>>({})
  const [overview, setOverview] = useState<any>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  // ---------- 加载当月任务节点 ----------
  const addToMap = (map: Record<string, CalTask[]>, date: string | undefined | null, task: CalTask) => {
    if (date) (map[date] = map[date] || []).push(task)
  }
  const loadMonth = (y: number, m: number) => {
    api.get(`/tasks/calendar?year=${y}&month=${m}`).then(r => {
      const map: Record<string, CalTask[]> = {}
      r.data.forEach((t: CalTask) => {
        addToMap(map, t.plan_date, t)          // plan_date 必显示
        if (t.deadline && t.deadline !== t.plan_date) {
          addToMap(map, t.deadline, t)          // deadline 若不同也显示
        }
      })
      setTasksByDate(map)
    }).catch(() => {})
  }
  useEffect(() => { loadMonth(viewYear, viewMonth) }, [viewYear, viewMonth])

  // ---------- 加载当日概览 ----------
  const loadOverview = (date: string) => {
    setLoadingOverview(true)
    api.get(`/day-overview?date=${date}`)
      .then(r => setOverview(r.data))
      .finally(() => setLoadingOverview(false))
  }
  useEffect(() => { loadOverview(selectedDate) }, [selectedDate])

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 1) { m = 12; y-- } else if (m > 12) { m = 1; y++ }
    setViewYear(y); setViewMonth(m)
  }
  const goToday = () => {
    const t = new Date()
    setViewYear(t.getFullYear())
    setViewMonth(t.getMonth() + 1)
    setSelectedDate(dateKey(t))
  }
  const selectDate = (d: string) => {
    setSelectedDate(d)
    setSearchParams({ date: d })
  }

  // ---------- 任务联动操作 ----------
  const refreshAll = () => {
    loadMonth(viewYear, viewMonth)
    loadOverview(selectedDate)
  }

  const toggleDone = async (t: any) => {
    setToggling(t.id)
    const newStatus = t.status === 'done' ? 'pending' : 'done'
    const newProgress = newStatus === 'done' ? 100 : 0
    await api.put(`/tasks/${t.id}`, { status: newStatus, progress: newProgress })
    if (newStatus === 'done') awardPoints(5)
    setToggling(null)
    // 乐观更新：同步改写 tasksByDate 和 overview 中的任务状态
    const upd = (ts: any[]) => ts.map(x => x.id === t.id ? { ...x, status: newStatus, progress: newProgress } : x)
    setTasksByDate(prev => {
      const next: Record<string, CalTask[]> = {}
      for (const k of Object.keys(prev)) next[k] = upd(prev[k])
      return next
    })
    if (overview?.tasks) setOverview({ ...overview, tasks: upd(overview.tasks) })
  }
  const saveTask = async (v: any) => {
    if (editing?.id) await api.put(`/tasks/${editing.id}`, v)
    else await api.post('/tasks', { ...v, plan_date: selectedDate })
    setShowAdd(false); setEditing(null)
    refreshAll()
  }
  const delTask = async (id: number) => {
    if (!confirm('确认删除该任务？')) return
    await api.delete(`/tasks/${id}`)
    refreshAll()
  }

  const ov = overview || { tasks: [], literatures: [], diaries: [], study_minutes: 0 }
  const priorityLabel = (p: string) => p === 'high' ? '高' : p === 'medium' ? '中' : '低'
  const litStatusLabel = (s: string) =>
    s === 'completed' ? '✅ 已读完' : s === 'reading' ? '📖 阅读中' : s === 'important' ? '⭐ 重点' : s === 'cited' ? '📎 已引用' : '📥 未读'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">日历视图</h1>
          <p className="text-sm text-gray-500 mt-1">月历网格 · 任务联动 · 每日概览</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => { setEditing(null); setShowAdd(true) }}>
          ＋ 在 {selectedDate} 新建任务
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 月历网格 */}
        <div className="card lg:col-span-2">
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDate={selectDate}
            onPrevMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
            onToday={goToday}
          />
        </div>

        {/* 每日概览 */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-500">每日概览</div>
              <div className="font-semibold text-gray-800 dark:text-slate-100">
                {selectedDate} <span className="text-xs font-normal text-gray-400">{weekdayCn(selectedDate)}</span>
              </div>
            </div>
            <button className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline" onClick={() => { setEditing(null); setShowAdd(true) }}>
              ＋ 任务
            </button>
          </div>

          {loadingOverview ? (
            <div className="text-gray-400 text-sm py-8 text-center">加载中…</div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
              {/* ===== 摘要卡片（与仪表盘风格对齐）===== */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400">⏱️ 学习时长</div>
                  <div className="font-bold text-lg text-indigo-600 dark:text-indigo-300 mt-0.5">
                    {Math.floor((ov.study_minutes || 0) / 60)}h{(ov.study_minutes || 0) % 60}m
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400">📌 任务完成</div>
                  <div className="font-bold text-lg text-gray-800 dark:text-slate-100 mt-0.5">
                    {(ov.tasks || []).filter((t: any) => t.status === 'done').length}/{ov.tasks?.length || 0}
                  </div>
                  {(ov.tasks?.length || 0) > 0 && (
                    <div className="h-1 bg-gray-200 dark:bg-slate-600 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((ov.tasks.filter((t: any) => t.status === 'done').length / ov.tasks.length) * 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400">📚 阅读文献</div>
                  <div className="font-bold text-lg text-gray-800 dark:text-slate-100 mt-0.5">
                    {ov.literatures?.length || 0}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">篇</span>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-400">💪 心情</div>
                  <div className="text-2xl mt-0.5">
                    {ov.health?.mood ? ['😀','😊','😐','😣','😡'][(ov.health.mood || 3) - 1] : '—'}
                  </div>
                </div>
              </div>
              {ov.health && (
                <div className="text-[11px] text-gray-400 text-center -mt-2">
                  睡眠 {ov.health.sleep_hours || 0}h · 运动 {ov.health.exercise_minutes || 0}分
                </div>
              )}

              {/* 分隔线 */}
              <hr className="border-gray-100 dark:border-slate-700" />

              {/* 当日任务（可勾选 / 编辑 / 删除 = 任务联动） */}
              <div>
                <div className="text-xs text-gray-400 mb-1.5">📌 当日任务</div>
                {(ov.tasks || []).length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">当天暂无任务</div>
                ) : (
                  <div className="space-y-2">
                    {(ov.tasks || []).map((t: any) => (
                      <div key={t.id} className={`group rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition ${t.status === 'done' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleDone(t)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${toggling === t.id ? 'scale-90 opacity-50' : ''} ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : t.priority === 'high' ? 'border-rose-400' : 'border-gray-300'}`}
                          >
                            {t.status === 'done' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </button>
                          <span className={`flex-1 text-sm truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-slate-200'}`}>{t.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.priority === 'high' ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400' : t.priority === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-sky-50 text-sky-600'}`}>{priorityLabel(t.priority)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button className="text-xs text-gray-400 hover:text-indigo-500" onClick={() => { setEditing(t); setShowAdd(true) }}>编辑</button>
                            <button className="text-xs text-gray-400 hover:text-rose-500" onClick={() => delTask(t.id)}>删除</button>
                          </div>
                        </div>
                        {/* 进度条 + 标签 */}
                        <div className="flex items-center gap-2 mt-1 ml-[28px]">
                          {t.tag && (
                            <span className="text-[10px] px-1.5 py-px rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-indigo-600 dark:text-indigo-300 font-medium flex-shrink-0">{t.tag}</span>
                          )}
                          <div className="flex-1 h-1 bg-gray-100 dark:bg-slate-600 rounded-full overflow-hidden min-w-[30px]">
                            <div className={`h-full rounded-full transition-all duration-300 ${t.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`} style={{ width: `${t.progress || 0}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 w-7 text-right flex-shrink-0">{t.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 当日阅读文献 */}
              {(ov.literatures || []).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">📚 当日阅读文献</div>
                  <ul className="space-y-1 text-sm">
                    {(ov.literatures || []).map((l: any) => (
                      <li key={l.id} className="text-gray-700 dark:text-slate-300 truncate">
                        {litStatusLabel(l.status)} {l.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 当日日记 */}
              {(ov.diaries || []).length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5">✏️ 当日日记</div>
                  <ul className="space-y-1 text-sm">
                    {(ov.diaries || []).map((d: any) => (
                      <li key={d.id} className="text-gray-700 dark:text-slate-300 truncate">📝 {d.title || d.content?.slice(0, 20)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(ov.tasks || []).length === 0 && (ov.literatures || []).length === 0 && (ov.diaries || []).length === 0 && !ov.health && (
                <div className="text-center text-gray-300 dark:text-slate-600 py-8 text-sm">
                  <div className="text-3xl mb-2">🌙</div>
                  这一天很清闲
                </div>
              )}

              {/* 底部快捷链接：跳转仪表盘查看当日 */}
              {ov.tasks?.length > 0 && (
                <div className="pt-2 border-t border-gray-50 dark:border-slate-700">
                  <a href={`#/dashboard`} className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1">
                    🏠 在仪表盘查看今日全部动态 →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 图例 */}
      <div className="card">
        <CalendarLegend />
      </div>

      {/* 新建 / 编辑任务弹窗 */}
      {showAdd && (
        <Modal onClose={() => { setShowAdd(false); setEditing(null) }} title={editing ? '编辑任务' : `新建任务 · ${selectedDate}`}>
          <CrudForm
            fields={[
              { key: 'title', label: '标题', required: true, full: true },
              { key: 'type', label: '类型', options: ['academic', 'reading', 'experiment', 'communication', 'other'] },
              { key: 'priority', label: '优先级', options: ['high', 'medium', 'low'] },
              { key: 'tag', label: '分类标签', options: ['核心科研', '文献阅读', '日常事务', '实验模拟', '论文写作', '组会准备', '离上岸更近', '自我提升'] },
              { key: 'description', label: '描述', type: 'textarea', full: true }
            ]}
            initial={editing ? { ...editing, plan_date: editing.plan_date || selectedDate } : { plan_date: selectedDate, status: 'pending', progress: 0 }}
            onSubmit={saveTask}
            onCancel={() => { setShowAdd(false); setEditing(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
