import { useEffect, useState } from 'react'
import api, { awardPoints } from '../lib/api'

const SCENES = ['引言', '方法', '结果', '讨论', '摘要']
const SCENE_COLORS: Record<string, string> = {
  '引言': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  '方法': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  '结果': 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
  '讨论': 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
  '摘要': 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300',
}

export default function English() {
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
  const todayStr = today()

  const [logs, setLogs] = useState<any[]>([])
  const [todayLog, setTodayLog] = useState<any>(null)
  const [totalHours, setTotalHours] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)
  const [sentences, setSentences] = useState<any[]>([])
  const [sForm, setSForm] = useState({ text: '', translation: '', scene: '引言', source: '' })
  const [sSaving, setSSaving] = useState(false)
  const [sceneFilter, setSceneFilter] = useState('all')
  const [logForm, setLogForm] = useState({ words: 0, reading_minutes: 0, listening_minutes: 0, note: '' })
  const [logSaving, setLogSaving] = useState(false)

  const load = () => {
    api.get('/english').then(r => {
      setLogs(r.data || [])
      const t = (r.data || []).find((l: any) => l.log_date === todayStr)
      setTodayLog(t || null)
      setCheckedIn(t?.checked_in === 1)
      if (t) setLogForm({ words: t.words||0, reading_minutes: t.reading_minutes||0, listening_minutes: t.listening_minutes||0, note: t.note||'' })
      else setLogForm({ words: 0, reading_minutes: 0, listening_minutes: 0, note: '' })
    }).catch(() => {})
    api.get('/english/total').then(r => setTotalHours(r.data.total_hours || 0)).catch(() => {})
    api.get('/sentences').then(r => setSentences(r.data || [])).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const toggleCheckIn = async () => {
    const v = checkedIn ? 0 : 1
    setCheckedIn(!!v)
    if (todayLog?.id) {
      await api.put(`/english/${todayLog.id}`, { checked_in: v })
    } else {
      await api.post('/english', { log_date: todayStr, checked_in: v, words: 0, reading_minutes: 0, listening_minutes: 0 })
      awardPoints(2)
    }
    load()
  }
  const saveLog = async () => {
    setLogSaving(true)
    const data = { ...logForm, checked_in: checkedIn ? 1 : 0 }
    if (todayLog?.id) {
      await api.put(`/english/${todayLog.id}`, data)
    } else {
      await api.post('/english', { ...data, log_date: todayStr })
      awardPoints(2)
    }
    setLogSaving(false)
    load()
  }
  const addSentence = async () => {
    if (!sForm.text.trim()) return
    setSSaving(true)
    await api.post('/sentences', sForm)
    setSForm({ text: '', translation: '', scene: '引言', source: '' })
    setSSaving(false)
    api.get('/sentences').then(r => setSentences(r.data || [])).catch(() => {})
  }
  const delSentence = async (id: number) => {
    await api.delete(`/sentences/${id}`)
    api.get('/sentences').then(r => setSentences(r.data || [])).catch(() => {})
  }

  const filteredSentences = sceneFilter === 'all' ? sentences : sentences.filter((s: any) => s.scene === sceneFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">英语学习</h1>
          <p className="text-sm text-gray-500 mt-1">总学习时长 {totalHours} 小时</p>
        </div>
      </div>

      {/* 今日打卡 + 学习记录 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-sm text-gray-500 mb-3">📅 今日打卡</div>
          <button onClick={toggleCheckIn} className={`text-4xl transition ${checkedIn ? '' : 'grayscale opacity-40'}`}>
            {checkedIn ? '✅' : '⬜'}
          </button>
          <div className={`text-sm font-medium mt-2 ${checkedIn ? 'text-emerald-600' : 'text-gray-400'}`}>
            {checkedIn ? '今日已打卡 ✓' : '今天还没打卡'}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-3">📊 今日学习记录</div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-400">单词</div>
              <input type="number" className="input text-center w-full text-sm" value={logForm.words}
                onChange={e => setLogForm({ ...logForm, words: Number(e.target.value) })} />
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">阅读(分)</div>
              <input type="number" className="input text-center w-full text-sm" value={logForm.reading_minutes}
                onChange={e => setLogForm({ ...logForm, reading_minutes: Number(e.target.value) })} />
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">听力(分)</div>
              <input type="number" className="input text-center w-full text-sm" value={logForm.listening_minutes}
                onChange={e => setLogForm({ ...logForm, listening_minutes: Number(e.target.value) })} />
            </div>
          </div>
          <input className="input text-sm mb-2" placeholder="备注…" value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })} />
          <button className="btn-primary text-sm w-full" onClick={saveLog} disabled={logSaving}>保存记录</button>
        </div>
      </div>

      {/* 句法积累 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100">📝 句法积累</h3>
          <div className="flex items-center gap-1.5">
            {['all', ...SCENES].map(s => (
              <button key={s} className={`text-[10px] px-2 py-0.5 rounded-full border ${sceneFilter === s ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                onClick={() => setSceneFilter(s)}>{s === 'all' ? '全部' : s}</button>
            ))}
          </div>
        </div>

        {/* 添加句子 */}
        <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div className="md:col-span-2">
              <input className="input text-sm" placeholder="英文句子" value={sForm.text} onChange={e => setSForm({ ...sForm, text: e.target.value })} />
            </div>
            <div>
              <input className="input text-sm" placeholder="翻译（可选）" value={sForm.translation} onChange={e => setSForm({ ...sForm, translation: e.target.value })} />
            </div>
            <div>
              <select className="input text-sm" value={sForm.scene} onChange={e => setSForm({ ...sForm, scene: e.target.value })}>
                {SCENES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input className="input flex-1 text-sm" placeholder="出处（可选）" value={sForm.source} onChange={e => setSForm({ ...sForm, source: e.target.value })} />
            <button className="btn-primary text-sm flex-shrink-0" onClick={addSentence} disabled={sSaving}>＋ 收藏</button>
          </div>
        </div>

        {/* 句子列表 */}
        {filteredSentences.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">暂无句法积累</div>
        ) : (
          <div className="space-y-2">
            {filteredSentences.map((s: any) => (
              <div key={s.id} className="flex items-start gap-3 py-2 border-b dark:border-slate-700 last:border-0 group">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">{s.text}</div>
                  {s.translation && <div className="text-xs text-gray-400 mt-0.5">{s.translation}</div>}
                  <div className="flex items-center gap-2 mt-1">
                    {s.scene && <span className={`text-[10px] px-1.5 py-0.5 rounded ${SCENE_COLORS[s.scene] || 'bg-gray-50 text-gray-500'}`}>{s.scene}</span>}
                    {s.source && <span className="text-[10px] text-gray-400">{s.source}</span>}
                  </div>
                </div>
                <button className="btn-ghost text-xs text-rose-400 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={() => delSentence(s.id)}>删除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 历史记录 */}
      {logs.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">📋 近期记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 dark:text-slate-400 border-b dark:border-slate-700">
                <th className="py-2">日期</th><th>打卡</th><th>单词</th><th>阅读</th><th>听力</th><th>备注</th>
              </tr></thead>
              <tbody>
                {logs.slice(0, 14).map((l: any) => (
                  <tr key={l.id} className="border-b dark:border-slate-700 last:border-0 text-gray-600 dark:text-slate-300">
                    <td className="py-2">{l.log_date}</td>
                    <td>{l.checked_in ? '✅' : '-'}</td>
                    <td>{l.words || 0}</td>
                    <td>{l.reading_minutes || 0}分</td>
                    <td>{l.listening_minutes || 0}分</td>
                    <td className="text-xs text-gray-400 max-w-[120px] truncate">{l.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
