import { useEffect, useState } from 'react'
import api from '../lib/api'

/**
 * 复盘弹窗组件
 * - 周日 18:00 后自动弹出周复盘
 * - 每月最后一天自动弹出月复盘
 * - 已写过则不再弹
 * - 复盘三问：最大成果 / 最大时间浪费 / 下周期停止做哪一件事
 */
export default function ReviewPopup() {
  const [show, setShow] = useState(false)
  const [type, setType] = useState<'week' | 'month'>('week')
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    checkShouldPopup()
  }, [])

  const checkShouldPopup = async () => {
    const now = new Date()
    const hour = now.getHours()

    // 周日 18:00 后 → 周复盘
    const isSunday = now.getDay() === 0
    const isLastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate()

    let reviewType: 'week' | 'month' | null = null

    if (isLastDayOfMonth) {
      reviewType = 'month'
    } else if (isSunday && hour >= 18) {
      reviewType = 'week'
    }

    if (!reviewType) return

    // 查是否已有复盘
    const periodStart = reviewType === 'week' ? getWeekMonday() : getMonthFirst()
    try {
      const r = await api.get('/reviews')
      const exists = r.data.some((rv: any) =>
        rv.review_date === periodStart && rv.review_type === (reviewType === 'week' ? 'weekly' : 'monthly')
      )
      if (!exists) {
        setType(reviewType)
        setShow(true)
      }
    } catch { /* silent */ }
  }

  const getWeekMonday = () => {
    const d = new Date()
    const dow = d.getDay() === 0 ? 7 : d.getDay()
    d.setDate(d.getDate() - dow + 1)
    return d.toISOString().slice(0, 10)
  }
  const getMonthFirst = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }

  const save = async () => {
    const q1 = answers.q1.trim()
    const q2 = answers.q2.trim()
    const q3 = answers.q3.trim()
    if (!q1 && !q2 && !q3) return

    setSaving(true)
    const periodStart = type === 'week' ? getWeekMonday() : getMonthFirst()
    const title = type === 'week'
      ? `周复盘 ${periodStart}`
      : `月复盘 ${periodStart}`

    const content = [
      `① 本${type === 'week' ? '周' : '月'}最大成果：`,
      q1 || '—',
      '',
      `② 最大时间浪费：`,
      q2 || '—',
      '',
      `③ 下${type === 'week' ? '周' : '月'}要停止做的一件事：`,
      q3 || '—',
    ].join('\n')

    await api.post('/reviews', {
      title,
      content,
      completed: q1,
      problems: q2,
      improvements: q3,
      review_date: periodStart,
      review_type: type === 'week' ? 'weekly' : 'monthly',
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setShow(false), 800)
  }

  if (!show) return null

  const weekLabel = type === 'week' ? '周日复盘' : '月末复盘'
  const periodLabel = type === 'week' ? '周' : '月'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-2xl mb-1">{type === 'week' ? '📝' : '🗓️'}</div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{weekLabel}</h2>
          <p className="text-sm text-gray-500 mt-1">
            静下心来，回顾这一个{periodLabel} —— 复盘三问
          </p>
        </div>

        {saved ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-emerald-600 font-semibold">复盘已保存</div>
            <div className="text-xs text-gray-400 mt-1">坚持复盘，持续进步</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label flex items-center gap-1">
                <span className="text-amber-500">①</span> 这{periodLabel}最大的成果是什么？
              </label>
              <textarea className="input min-h-[70px] text-sm" placeholder="写下一个具体的、让你有成就感的成果…"
                value={answers.q1} onChange={e => setAnswers({ ...answers, q1: e.target.value })} />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <span className="text-rose-500">②</span> 最大的时间浪费是什么？
              </label>
              <textarea className="input min-h-[70px] text-sm" placeholder="什么占用了你的时间却没有产出？…"
                value={answers.q2} onChange={e => setAnswers({ ...answers, q2: e.target.value })} />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <span className="text-indigo-500">③</span> 下{periodLabel}要停止做哪一件事？
              </label>
              <textarea className="input min-h-[70px] text-sm" placeholder="断舍离——哪个习惯或事务应该停止？…"
                value={answers.q3} onChange={e => setAnswers({ ...answers, q3: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-ghost text-sm" onClick={() => setShow(false)}>
                {answers.q1 || answers.q2 || answers.q3 ? '残忍跳过' : '稍后再说'}
              </button>
              <button className="btn-primary text-sm" onClick={save} disabled={saving}>
                {saving ? '保存中…' : '完成复盘 ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
