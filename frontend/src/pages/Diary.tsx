import { useEffect, useState } from 'react'
import api, { awardPoints } from '../lib/api'

function fmtDate() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const TABS = [
  { key: 'memo', label: '快速备忘录', icon: '⚡' },
  { key: 'research', label: '科研日志', icon: '🔬' },
  { key: 'essay', label: '随笔', icon: '✏️' },
]

export default function Diary() {
  const today = fmtDate()
  const [tab, setTab] = useState('memo')
  const [diaries, setDiaries] = useState<any[]>([])
  const [healthToday, setHealthToday] = useState<any>(null)

  // 备忘录快写
  const [memoText, setMemoText] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)

  // 日记编辑
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/diaries').then(r => setDiaries(r.data || []))
    api.get(`/day-overview?date=${today}`).then(r => setHealthToday(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const memos = diaries.filter((d: any) => d.diary_type === 'memo')
  const researches = diaries.filter((d: any) => d.diary_type === 'research')
  const essays = diaries.filter((d: any) => d.diary_type === 'essay')
  const current = tab === 'memo' ? memos : tab === 'research' ? researches : essays

  const saveMemo = async () => {
    if (!memoText.trim()) return
    setMemoSaving(true)
    await api.post('/diaries', { title: memoText.trim().slice(0, 30), content: memoText.trim(), diary_date: today, diary_type: 'memo' })
    awardPoints(2)
    setMemoText('')
    setMemoSaving(false)
    load()
  }
  const convertMemo = (memo: any) => {
    setEditing(memo)
    setForm({ title: memo.title || '', content: memo.content || '', diary_date: memo.diary_date, diary_type: memo.diary_type || 'essay',
      mood: memo.mood || 3, gratitude: memo.gratitude || '', achievement: memo.achievement || '', error_solution: memo.error_solution || '', tags: memo.tags || '' })
    setShowForm(true)
  }
  const openForm = (d?: any) => {
    if (d) {
      setEditing(d)
      setForm({ title: d.title || '', content: d.content || '', diary_date: d.diary_date, diary_type: d.diary_type || 'essay',
        mood: d.mood || 3, gratitude: d.gratitude || '', achievement: d.achievement || '', error_solution: d.error_solution || '', tags: d.tags || '' })
    } else {
      setEditing(null)
      setForm({ title: '', content: '', diary_date: today, diary_type: tab === 'memo' ? 'essay' : tab, mood: healthToday?.health?.mood || 3,
        gratitude: '', achievement: '', error_solution: '', tags: '' })
    }
    setShowForm(true)
  }
  const saveDiary = async () => {
    setSaving(true)
    if (editing?.id) await api.put(`/diaries/${editing.id}`, form)
    else { await api.post('/diaries', form); awardPoints(2) }
    setSaving(false); setShowForm(false); setEditing(null); load()
  }
  const delDiary = async (id: number) => { if (!confirm('删除？')) return; await api.delete(`/diaries/${id}`); load() }
  const healthCard = healthToday?.health || null
  const healthBlock = healthCard ? (
    <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-1">
      <span>😴 睡眠 {healthCard.sleep_hours || '-'}h</span>
      <span>🏃 运动 {healthCard.exercise_minutes || 0}分</span>
      <span>💧 {healthCard.water_cups || 0}杯水</span>
      <span>{['','😡','😣','😐','😊','😀'][healthCard.mood] || '😐'} 心情 {healthCard.mood || '-'}/5</span>
    </div>
  ) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">日记随笔</h1>
        <button className="btn-primary text-sm" onClick={() => openForm()}>＋ 写日记</button>
      </div>

      {/* 三标签切换 */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} className={`px-4 py-1.5 text-sm rounded-md font-medium transition ${tab === t.key ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
            onClick={() => setTab(t.key)}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* 快速备忘录 */}
      {tab === 'memo' && (
        <div className="card">
          <div className="flex items-center gap-3">
            <textarea className="input flex-1 min-h-[44px] text-sm resize-none" placeholder="随手记一笔… 回车即保存"
              value={memoText} onChange={e => setMemoText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveMemo() } }} />
            <button className="btn-primary text-sm flex-shrink-0" onClick={saveMemo} disabled={memoSaving}>记下</button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {current.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">暂无记录</div>
      ) : (
        <div className="space-y-3">
          {current.map((d: any) => (
            <div key={d.id} className="card py-3 px-4 group hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{d.diary_date}</span>
                    {d.title && <span className="font-medium text-sm text-gray-800 dark:text-slate-200">{d.title}</span>}
                    {d.tags && d.tags.split(',').map((t: string) => (
                      <span key={t} className="tag text-xs">{t.trim()}</span>
                    ))}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300 mt-1 line-clamp-3 whitespace-pre-wrap">
                    {d.content}
                  </div>
                  {d.gratitude && (
                    <div className="text-xs mt-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded px-2 py-1 inline-block">
                      🙏 {d.gratitude}
                    </div>
                  )}
                  {d.achievement && (
                    <div className="text-xs mt-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 rounded px-2 py-1 inline-block ml-1">
                      🎉 {d.achievement}
                    </div>
                  )}
                  {d.error_solution && (
                    <div className="text-xs mt-1 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/10 rounded px-2 py-1">
                      💡 {d.error_solution}
                    </div>
                  )}
                  {/* 自动关联当日健康数据 */}
                  {d.diary_date === today && healthBlock}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2">
                  {d.diary_type === 'memo' && <button className="btn-ghost text-xs text-indigo-500" onClick={() => convertMemo(d)}>展开为日记</button>}
                  <button className="btn-ghost text-xs" onClick={() => openForm(d)}>编辑</button>
                  <button className="btn-ghost text-xs text-rose-500" onClick={() => delDiary(d.id)}>删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 日记编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editing ? '编辑' : '新建'}日记</h2>
            <div className="space-y-3">
              <div>
                <label className="label">类型</label>
                <select value={form.diary_type} onChange={e => setForm({ ...form, diary_type: e.target.value })} className="input">
                  <option value="essay">✏️ 随笔</option>
                  <option value="research">🔬 科研日志</option>
                  <option value="memo">⚡ 备忘录</option>
                </select>
              </div>
              <div>
                <label className="label">标题</label>
                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">日期</label>
                <input type="date" className="input" value={form.diary_date} onChange={e => setForm({ ...form, diary_date: e.target.value })} />
              </div>
              {form.diary_type === 'research' && (
                <div>
                  <label className="label">💡 实验现象 / 报错 & 解决方案</label>
                  <textarea className="input min-h-[100px]" value={form.error_solution} onChange={e => setForm({ ...form, error_solution: e.target.value })}
                    placeholder="客观冷静地记录：做了什么 → 遇到什么现象/报错 → 如何解决的" />
                </div>
              )}
              <div>
                <label className="label">正文</label>
                <textarea className="input min-h-[120px]" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              </div>
              {form.diary_type === 'essay' && (
                <>
                  <div>
                    <label className="label">🙏 今天值得感恩的事</label>
                    <input className="input" value={form.gratitude} onChange={e => setForm({ ...form, gratitude: e.target.value })} placeholder="哪怕很小…" />
                  </div>
                  <div>
                    <label className="label">🎉 今天值得高兴的小事</label>
                    <input className="input" value={form.achievement} onChange={e => setForm({ ...form, achievement: e.target.value })} placeholder="无论多小…" />
                  </div>
                </>
              )}
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setShowForm(false)}>取消</button>
                <button className="btn-primary" onClick={saveDiary} disabled={saving}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
