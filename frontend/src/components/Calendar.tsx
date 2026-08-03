/**
 * 可复用月历组件
 * - MonthCalendar：月历网格 + 任务节点着色
 * - compact=true 用于仪表盘紧凑展示（仅色点）
 * - compact=false 用于日历视图页面（显示任务标题）
 */
import { useState } from 'react'

export type CalTask = {
  id: number
  title: string
  status: string
  priority: string
  plan_date?: string | null
  deadline?: string | null
  progress?: number
  tag?: string | null
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDateKey(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekdayCn(s: string): string {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return w[parseDateKey(s).getDay()]
}

/** 构建 6×7 = 42 个日期格子（周一为每周起始） */
export function buildMonthCells(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month - 1, 1 - offset)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    cells.push(d)
  }
  return cells
}

/** 任务节点着色：完成=绿，高优先=红，中=琥珀，低=蓝 */
export function taskStatusClass(t: CalTask): string {
  if (t.status === 'done') return 'bg-emerald-500'
  if (t.priority === 'high') return 'bg-rose-500'
  if (t.priority === 'medium') return 'bg-amber-500'
  return 'bg-sky-500'
}

export function MonthCalendar(props: {
  year: number
  month: number
  tasksByDate: Record<string, CalTask[]>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday?: () => void
  compact?: boolean
}) {
  const { year, month, tasksByDate, selectedDate, onSelectDate, onPrevMonth, onNextMonth, onToday, compact } = props
  const today = dateKey(new Date())
  const cells = buildMonthCells(year, month)

  return (
    <div>
      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button className="btn-ghost text-base px-2 leading-none" onClick={onPrevMonth} aria-label="上一月">‹</button>
          <div className="font-semibold text-gray-800 dark:text-slate-100 text-base px-1">
            {year} 年 {month} 月
          </div>
          <button className="btn-ghost text-base px-2 leading-none" onClick={onNextMonth} aria-label="下一月">›</button>
        </div>
        {onToday && (
          <button className="text-xs text-indigo-600 dark:text-indigo-300 hover:underline" onClick={onToday}>今天</button>
        )}
      </div>

      {/* 星期表头（周一为始） */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK.map((w, i) => (
          <div key={w} className={`text-center text-xs py-1 ${i >= 5 ? 'text-rose-400' : 'text-gray-400'}`}>{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          const key = dateKey(d)
          const inMonth = d.getMonth() + 1 === month
          const isToday = key === today
          const isSel = key === selectedDate
          const tasks = tasksByDate[key] || []
          return (
            <button
              key={idx}
              onClick={() => onSelectDate(key)}
              className={`text-left rounded-lg border transition-all
                ${compact ? 'min-h-[50px] p-1' : 'min-h-[92px] p-1.5'}
                ${isSel ? 'border-indigo-500 ring-1 ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-slate-700'}
                ${inMonth ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/40 opacity-50'}
                hover:border-indigo-300`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium flex items-center justify-center
                  ${isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white' : inMonth ? 'text-gray-600 dark:text-slate-300' : 'text-gray-400'}`}>
                  {d.getDate()}
                </span>
                {tasks.length > 0 && !compact && (
                  <span className="text-[10px] text-gray-400">{tasks.length}</span>
                )}
              </div>

              <div className="mt-1">
                {compact ? (
                  <div className="flex flex-wrap gap-0.5">
                    {tasks.slice(0, 5).map(t => (
                      <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${taskStatusClass(t)}`} />
                    ))}
                  </div>
                ) : (
                  <>
                    {tasks.slice(0, 3).map(t => (
                      <div key={t.id} className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight flex items-center gap-1 mb-0.5
                        ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-200'} bg-gray-50 dark:bg-slate-700`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${taskStatusClass(t)}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">+{tasks.length - 3} 项</div>
                    )}
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 图例组件（状态色说明） */
export function CalendarLegend() {
  const items = [
    { c: 'bg-rose-500', t: '高优先' },
    { c: 'bg-amber-500', t: '中优先' },
    { c: 'bg-sky-500', t: '低优先' },
    { c: 'bg-emerald-500', t: '已完成' }
  ]
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
      {items.map(i => (
        <span key={i.t} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${i.c}`} />{i.t}
        </span>
      ))}
    </div>
  )
}
