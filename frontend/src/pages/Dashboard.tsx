import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import api, { awardPoints } from '../lib/api'
import { Sparkles, TrendingUp } from '../components/icons'
import ClockWidget from '../components/ClockWidget'
import { MonthCalendar, CalendarLegend, CalTask, dateKey } from '../components/Calendar'
import ReviewPopup from '../components/ReviewPopup'

const TYPE_ICON: any = {
  task: '📌', paper: '📄', literature: '📚', project: '🧪'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const [todayTasks, setTodayTasks] = useState<any[]>([])
  const [radar, setRadar] = useState<any>(null)
  const [me, setMe] = useState<any>({})
  const [showReport, setShowReport] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [reportSaving, setReportSaving] = useState(false)
  const [reportSaved, setReportSaved] = useState(false)
  const [reportNote, setReportNote] = useState('')

  // 仪表盘日历：当月任务节点
  const nowD = new Date()
  const [calYear, setCalYear] = useState(nowD.getFullYear())
  const [calMonth, setCalMonth] = useState(nowD.getMonth() + 1)
  const [calTasks, setCalTasks] = useState<Record<string, CalTask[]>>({})
  const [calSelected, setCalSelected] = useState(dateKey(nowD))

  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

  const load = () => api.get('/dashboard').then(r => setData(r.data))
   const loadTodayTasks = () => {
    const t = new Date()
    const today = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
    api.get('/tasks').then(r => {
      const items = (r.data || []).filter((x: any) => (x.plan_date === today || x.deadline === today))
        .sort((a: any, b: any) => {
          const ap = a.priority === 'high' ? 0 : a.priority === 'medium' ? 1 : 2
          const bp = b.priority === 'high' ? 0 : b.priority === 'medium' ? 1 : 2
          return ap - bp
        })
      setTodayTasks(items)
    })
  }

  const updateProgress = async (task: any, newPct: number) => {
    const pct = Math.max(0, Math.min(100, newPct))
    const newStatus = pct === 100 ? 'done' : 'pending'
    await api.put(`/tasks/${task.id}`, { progress: pct, status: newStatus })
    if (pct === 100 && task.status !== 'done') awardPoints(5)
    loadTodayTasks()
  }

  const drinkWater = async () => {
    const today = new Date()
    const ts = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const cups = (data.health_today.water_cups || 0) + 1
    if (data.health_today.id) {
      await api.put(`/health/${data.health_today.id}`, { water_cups: cups, log_date: ts })
    } else {
      await api.post('/health', { log_date: ts, water_cups: cups })
    }
    load()
  }

  useEffect(() => { load(); loadTodayTasks(); api.get('/dashboard/radar').then(r => setRadar(r.data)).catch(() => {}); api.get('/me').then(r => setMe(r.data)).catch(() => {}) }, [])

  const loadCalTasks = (y: number, m: number) => {
    api.get(`/tasks/calendar?year=${y}&month=${m}`).then(r => {
      const map: Record<string, CalTask[]> = {}
      const addM = (d: string | undefined | null, t: CalTask) => { if (d) (map[d] = map[d] || []).push(t) }
      r.data.forEach((t: CalTask) => {
        addM(t.plan_date, t)
        if (t.deadline && t.deadline !== t.plan_date) addM(t.deadline, t)
      })
      setCalTasks(map)
    }).catch(() => {})
  }
  useEffect(() => { loadCalTasks(calYear, calMonth) }, [calYear, calMonth])

  const openReport = async () => {
    const r = await api.get('/daily-report/preview')
    setReport(r.data)
    setReportSaved(false)
    setReportNote('')
    setShowReport(true)
  }
  const saveReport = async () => {
    setReportSaving(true)
    const content = reportNote.trim()
      ? report.content.replace('💡 随笔：', `💡 随笔：\n${reportNote.trim()}`)
      : report.content
    await api.post('/daily-report/save', { title: report.title, content })
    setReportSaving(false)
    setReportSaved(true)
    setTimeout(() => setShowReport(false), 800)
  }

  const toggleTodo = async (task: any) => {
    setToggling(task.id)
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    const newProgress = newStatus === 'done' ? 100 : 0
    await api.put(`/tasks/${task.id}`, { status: newStatus, progress: newProgress })
    if (newStatus === 'done') awardPoints(5)
    setToggling(null)
    load()
    loadTodayTasks()
  }

  const bumpProgress = async (task: any, e: React.MouseEvent) => { return } // unused

  if (!data) return <div className="text-gray-400">加载中…</div>

  const radarOption = radar ? {
    title: { text: '六维成长雷达图', subtext: '每周一 0 点自动刷新 · 凹角即需补短板', left: 'left', top: 8, textStyle: { fontSize: 14, color: '#374151' }, subtextStyle: { fontSize: 11, color: '#9ca3af' } },
    tooltip: { formatter: (p: any) => { const v = p.value; const label = p.name; return `${label}: ${v}%<br/>${v>=80?'优势领域继续保持':v>=50?'稳定发展中':'需要重点提升'}` }},
    radar: {
      indicator: radar.labels.map((k: string) => ({ name: k, max: 100 })),
      radius: 85,
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.03)', 'rgba(99,102,241,0.06)'] } }
    },
    series: [{
      type: 'radar',
      data: [{ value: radar.values, name: '当前能力', areaStyle: { color: 'rgba(99,102,241,0.25)' }, lineStyle: { color: '#6366f1', width: 2 }, itemStyle: { color: '#6366f1' } }]
    }]
  } : {}

  const barOption = {
    title: { text: '近7天工作时长', left: 'left', textStyle: { fontSize: 14, color: '#374151' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.reading_trend.map((d: any) => d.date?.slice(5) || ''),
      axisLine: { lineStyle: { color: '#e5e7eb' } }
    },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6' } } },
    series: [{
      data: data.reading_trend.map((d: any) => d.minutes),
      type: 'bar',
      itemStyle: { color: '#6366f1', borderRadius: [6, 6, 0, 0] },
      barWidth: 24
    }]
  }

  return (
    <div className="space-y-5">
      <ReviewPopup />
      {/* 顶部状态栏 */}
      <div className="flex items-center gap-3 text-xs">
        <span className="bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-600">
          📅 {(() => { const n=new Date(); return `${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 周${'日一二三四五六'[n.getDay()]}` })()}
        </span>
        <span className="bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-600">
          📚 {(() => { if(!me?.semester_start) return '未设置'; const n=new Date(),s=new Date(me.semester_start); const w=Math.max(1,Math.ceil((n.getTime()-s.getTime())/(7*86400000))+1); return n<s?`距开学${Math.ceil((s.getTime()-n.getTime())/86400000)}天`:`第${w}周` })()}
        </span>
        <button className="text-gray-400 hover:text-indigo-500" onClick={()=>navigate('/settings')}>⚙</button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-1">{data.date_str} · {data.date_subtitle}</p>
        </div>
        <button className="btn-primary flex items-center gap-1" onClick={openReport}><Sparkles size={14}/> 写个日报</button>
      </div>

      {/* 签到 / 签出 组件 */}
      <ClockWidget />

      {/* 数据卡片 — 5 卡，去掉科研进度 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="今日任务" value={data.tasks_done_today} suffix={`/${data.tasks_today}`}
          icon="📌" color="from-amber-400 to-orange-500"
          onClick={() => navigate('/goals')}
        />
        {/* 本周目标：从本周每天 tasks 汇总 */}
        <StatCard
          label="本周目标"
          value={data.goals_week_done ?? 0}
          suffix={`/${data.goals_week ?? 0}`}
          icon="🎯" color="from-emerald-400 to-teal-500"
          progress={(data.goals_week ?? 0) > 0 ? Math.round(((data.goals_week_done ?? 0) / (data.goals_week ?? 1)) * 100) : 0}
        />
        <StatCard
          label="阅读数量" value={data.literatures_count} suffix="篇"
          icon="📚" color="from-sky-400 to-blue-500"
          tip={data.literatures_reading > 0 ? `其中 ${data.literatures_reading} 篇正在读` : ''}
          onClick={() => navigate('/notes')}
        />
        {/* 论文状态：改为论文详情摘要（阶段+进度） */}
        <div className="card relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => navigate('/papers')}>
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 opacity-10" />
          <div className="text-sm text-gray-500">论文状态</div>
          <div className="mt-2">
            {data.papers_detail && data.papers_detail.length > 0 ? (
              <div className="space-y-1.5">
                {data.papers_detail.slice(0, 2).map((p: any) => (
                  <div key={p.id} className="text-xs">
                    <div className="text-gray-800 font-medium truncate">{p.title}</div>
                    <div className="flex items-center justify-between text-gray-400 mt-0.5">
                      <span className="tag" style={{ fontSize: '10px' }}>{p.stage}</span>
                      <span>{p.progress}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500" style={{ width: `${p.progress}%` }}/>
                    </div>
                  </div>
                ))}
                {data.papers_detail.length > 2 && (
                  <div className="text-xs text-gray-400">等 {data.papers_detail.length} 篇</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-400">暂无论文</div>
            )}
          </div>
          <div className="mt-2 text-xl">📄</div>
        </div>
        {/* 学习时间：今天 + 本周汇总 */}
        <div className="card relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 opacity-10" />
          <div className="text-sm text-gray-500">学习时间</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-800">{(data.study_minutes_today / 60).toFixed(1)}</span>
            <span className="text-xs text-gray-400">h</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            本周汇总：{Math.floor(data.study_minutes_week / 60)}h{data.study_minutes_week % 60}m
          </div>
          <div className="mt-2 text-xl">⏱️</div>
        </div>
        {/* 喝水打卡 */}
        <div className="card relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95" onClick={drinkWater}>
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-10" />
          <div className="text-sm text-gray-500">喝水打卡</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyan-600">{data.health_today.water_cups || 0}</span>
            <span className="text-xs text-gray-400">/ 8 杯</span>
          </div>
          <div className="mt-1.5 flex gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < (data.health_today.water_cups || 0) ? 'bg-cyan-500' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">💧 点此 +1 杯</div>
        </div>
      </div>

      {/* 当月任务日历（含任务节点） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-500">📅 任务日历</div>
            <button className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline" onClick={() => navigate(`/calendar?date=${calSelected}`)}>查看完整日历 →</button>
          </div>
          <MonthCalendar
            year={calYear}
            month={calMonth}
            tasksByDate={calTasks}
            selectedDate={calSelected}
            onSelectDate={(d) => setCalSelected(d)}
            onPrevMonth={() => { let m = calMonth - 1, y = calYear; if (m < 1) { m = 12; y-- } setCalYear(y); setCalMonth(m) }}
            onNextMonth={() => { let m = calMonth + 1, y = calYear; if (m > 12) { m = 1; y++ } setCalYear(y); setCalMonth(m) }}
            onToday={() => { const t = new Date(); setCalYear(t.getFullYear()); setCalMonth(t.getMonth() + 1); setCalSelected(dateKey(t)) }}
            compact
          />
        </div>
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-500 dark:text-slate-400">📋 今日任务</div>
            <span className="text-xs text-gray-400">{todayTasks.filter((t: any) => t.status === 'done').length}/{todayTasks.length} 完成</span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
              <div className="text-3xl mb-2">🌅</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">今天没有安排任务</div>
              <button className="btn-primary text-xs mt-3" onClick={() => navigate('/goals')}>前往计划中心新建</button>
            </div>
          ) : (
            <div className="space-y-2 flex-1 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
              {todayTasks.map((t: any) => {
                const ts = todayStr()
                const overdue = t.deadline && t.deadline < ts && t.status !== 'done'
                return (
                  <div key={t.id} className={`rounded-xl p-2.5 border-l-4 transition-all ${
                    overdue ? 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10' :
                    t.status === 'done' ? 'border-l-emerald-300 bg-gray-50/50 dark:bg-slate-700/30 opacity-70' :
                    t.priority === 'high' ? 'border-l-rose-300 bg-white dark:bg-slate-800' :
                    t.priority === 'medium' ? 'border-l-amber-300 bg-white dark:bg-slate-800' :
                    'border-l-emerald-300 bg-white dark:bg-slate-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div onClick={() => toggleTodo(t)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition ${
                          t.status === 'done' ? 'bg-emerald-500 border-emerald-500' :
                          overdue ? 'border-rose-400' : t.priority === 'high' ? 'border-rose-400' : 'border-gray-300'
                        } ${toggling === t.id ? 'scale-90 opacity-50' : ''}`}
                        title={t.status === 'done' ? '取消完成' : '标记完成'}>
                        {t.status === 'done' && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${t.status === 'done' ? 'line-through text-gray-400' : overdue ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-slate-200'}`}>
                          {overdue && <span className="text-rose-500 mr-1">⚠</span>}{t.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {t.tag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">{t.tag}</span>}
                          {t.deadline && <span className={`text-[10px] ${overdue ? 'text-rose-500 font-semibold' : 'text-gray-400'}`}>{overdue ? '⏰ 已逾期' : `📅 ${t.deadline}`}</span>}
                          {t.priority && <span className={`text-[10px] px-1 py-0.5 rounded ${
                            t.priority === 'high' ? 'bg-rose-50 text-rose-500' : t.priority === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>{t.priority === 'high' ? '🔥' : t.priority === 'medium' ? '⚡' : '🌱'}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 ml-[28px] flex items-center gap-2">
                      <input type="range" min="0" max="100" value={t.progress || 0}
                        onChange={e => updateProgress(t, Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-slate-600
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer" />
                      <span className={`text-[10px] w-8 text-right font-medium flex-shrink-0 ${t.progress===100?'text-emerald-500':'text-indigo-500'}`}>{t.progress||0}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 雷达图 */}
        <div className="card lg:col-span-2">
          <ReactECharts option={radarOption} style={{ height: 360 }} />
        </div>
        {/* 右侧：近7天工作时长 + 本周积分 */}
        <div className="space-y-4">
          <div className="card">
            <ReactECharts option={barOption} style={{ height: 200 }} />
            <div className="text-xs text-gray-400 -mt-2">
              {data.study_minutes_today > 0
                ? `通过签到记录 / 今日 ${data.study_minutes_today} 分钟`
                : '点击上方签到按钮开始记录学习时间'}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500 mb-2 flex items-center gap-1"><TrendingUp size={14}/> 本周积分</div>
            <div className="text-3xl font-bold text-indigo-600">+{data.points_week}</div>
            <div className="mt-2 text-xs text-gray-400 space-y-0.5">
              <div>完成任务、阅读论文、实验记录均可获得积分</div>
              <div className="text-gray-500 font-medium">本周累计学习：{Math.floor(data.study_minutes_week / 60)}h{data.study_minutes_week % 60}m · 目标 {data.goals_week_done ?? 0}/{data.goals_week ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 今日健康 */}
        <div className="card">
          <div className="text-sm text-gray-500 mb-3">💪 今日健康</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="睡眠" value={`${data.health_today.sleep_hours || 0}h`} />
            <Stat label="运动" value={`${data.health_today.exercise_minutes || 0}分`} />
            <Stat label="心情" value={'😀 😞 😐 😣 😡'.split(' ')[(data.health_today.mood || 3) - 1] || '😐'} />
          </div>
        </div>

        {/* 最近灵感 */}
        <div className="card">
          <div className="text-sm text-gray-500 mb-3">✨ 最近灵感</div>
          {data.inspirations.length === 0 && <div className="text-gray-400 text-sm">灵感素材库还是空的</div>}
          <ul className="space-y-2 text-sm">
            {data.inspirations.map((i: any) => (
              <li key={i.id} className="line-clamp-2 text-gray-700">{i.content || i.title}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 最近动态 — 来自 4 个核心模块的聚合数据 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">最近动态</div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>📌 今日任务 · 📄 论文 · 📚 文献 · 🧪 项目</span>
          </div>
        </div>
        <ul className="divide-y">
          {data.recent.map((r: any, idx: number) => (
            <li key={idx} className="py-3 flex items-center gap-3 text-sm">
              <span className="text-xl flex-shrink-0">{TYPE_ICON[r.type] || '📌'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-800 font-medium truncate block">{r.title}</span>
                <span className="text-xs text-gray-400">
                  {r.type === 'task' && (
                    <>{r.priority === 'high' ? <span className="text-rose-500">🔴 高优先</span> : r.priority === 'medium' ? <span className="text-amber-500">🟡 中优先</span> : '🟢 低优先'} · {r.status === 'done' ? '✓ 已完成' : '进行中'}{r.plan_date ? ` · ${r.plan_date}` : ''}</>
                  )}
                  {r.type === 'paper' && (
                    <><span className="tag mr-1" style={{ display: 'inline', fontSize: '10px', padding: '1px 4px' }}>{r.stage}</span>进度 {r.progress}%</>
                  )}
                  {r.type === 'literature' && (
                    <>{r.status === 'completed' ? '✅ 已读完' : r.status === 'reading' ? '📖 阅读中' : r.status === 'important' ? '⭐ 重点' : r.status === 'cited' ? '📎 已引用' : '📥 未读'}{r.authors ? ` · ${r.authors.split(',')[0]} 等` : ''}{r.year ? ` · ${r.year}` : ''}</>
                  )}
                  {r.type === 'project' && (
                    <>{r.status === 'done' ? '✅ 已完成' : r.status === 'paused' ? '⏸ 暂停' : '🚀 进行中'} · 进度 {r.progress}%{r.start_date ? ` · 从${r.start_date}` : ''}</>
                  )}
                </span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{(r.time || '').slice(0, 16)}</span>
            </li>
          ))}
          {data.recent.length === 0 && (
            <li className="py-8 text-center text-gray-400">暂无动态，快去进行科研工作吧！</li>
          )}
        </ul>
      </div>

      {/* 日报弹窗 */}
      {showReport && report && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowReport(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">📝 今日日报</h2>
              <button className="btn-ghost text-xs" onClick={() => setShowReport(false)}>×</button>
            </div>

            {/* 统计摘要 */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              {[
                { label: '学习', val: `${report.stats.study_minutes}m`, icon: '⏱️' },
                { label: '任务', val: `${report.stats.tasks_done}/${report.stats.tasks_total}`, icon: '✅' },
                { label: '论文', val: report.stats.papers_count + '篇', icon: '📄' },
                { label: '文献', val: report.stats.literatures_count + '篇', icon: '📚' }
              ].map(s => (
                <div key={s.label} className="bg-gray-50 dark:bg-slate-700 rounded-lg py-2">
                  <div className="text-lg">{s.icon}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">{s.val}</div>
                </div>
              ))}
            </div>

            {/* 日报正文 */}
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-3 leading-relaxed max-h-60 overflow-y-auto font-sans">
              {report.content}
            </pre>

            {/* 随笔编辑 */}
            <div className="mb-4">
              <label className="label">💡 随笔（可自由编写）</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="记录今日心得、感悟、反思…"
                value={reportNote}
                onChange={e => setReportNote(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {reportSaved ? '✅ 已保存到日记随笔' : '保存后将归入「日记随笔」模块'}
              </span>
              <button
                className={`btn-primary text-sm flex items-center gap-1 ${reportSaved ? 'opacity-50' : ''}`}
                onClick={saveReport}
                disabled={reportSaved || reportSaving}
              >
                {reportSaving ? '保存中…' : reportSaved ? '已保存 ✓' : '保存到日记随笔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, icon, color, tip, progress, onClick }: any) {
  return (
    <div
      className={`card relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-10`} />
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-800">{value ?? 0}</span>
        <span className="text-xs text-gray-400">{suffix}</span>
      </div>
      {progress != null && (
        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
          <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {tip && <div className="text-xs text-gray-400 mt-1">{tip}</div>}
      <div className="mt-2 text-xl">{icon}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-800 mt-1">{value}</div>
    </div>
  )
}
