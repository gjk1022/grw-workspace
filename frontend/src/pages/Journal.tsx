import { useState } from 'react'
import api from '../lib/api'
import { Send, Sparkles } from '../components/icons'
import { calcAllDates, getTopDates, getAvoidDates, getGoodDates, PAPER_TYPES, TIPS, AuspiciousResult } from '../lib/auspicious'

const LEVEL_STYLE: Record<string, string> = {
  '大吉': 'bg-emerald-500 text-white', '吉': 'bg-emerald-400 text-white',
  '中': 'bg-amber-400 text-white', '小凶': 'bg-orange-400 text-white', '凶': 'bg-rose-400 text-white'
}
const LEVEL_BG: Record<string, string> = {
  '大吉': 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10',
  '吉': 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/5',
  '中': 'border-amber-200 bg-amber-50/30 dark:bg-amber-900/5',
  '小凶': 'border-orange-200 bg-orange-50/30 dark:bg-orange-900/5',
  '凶': 'border-rose-200 bg-rose-50/30 dark:bg-rose-900/5'
}

export default function Journal() {
  // 择刊助手
  const [field, setField] = useState('计算机软件')
  const [abstract, setAbstract] = useState('')
  const [keywords, setKeywords] = useState('')
  const [answer, setAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // 择吉计算器
  const [birthdate, setBirthdate] = useState('')
  const [daysAhead, setDaysAhead] = useState(60)
  const [allDates, setAllDates] = useState<AuspiciousResult[]>([])

  const aiSubmit = async () => {
    if (!abstract.trim()) return
    setAiLoading(true)
    const r = await api.post('/ai/ask', { module: 'journal', question: abstract, extra: { field, abstract, keywords } })
    setAnswer(r.data.answer)
    setAiLoading(false)
  }
  const [topDates, setTopDates] = useState<AuspiciousResult[]>([])
  const [avoidDates, setAvoidDates] = useState<AuspiciousResult[]>([])
  const [tab, setTab] = useState<'browse' | 'recommend' | 'avoid'>('recommend')

  const calc = () => {
    if (!birthdate) { alert('请填写出生日期'); return }
    const all = calcAllDates(birthdate, daysAhead)
    setAllDates(all)
    setTopDates(getTopDates(birthdate, 5, daysAhead))
    setAvoidDates(getAvoidDates(all))
  }

  const goodOnly = getGoodDates(allDates)

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">投稿择刊助手 & 择吉计算器</h1>
        <p className="text-sm text-gray-500 mt-1">AI 推荐期刊 · 天干地支择吉 · 五行匹配 · 仅供趣味参考</p>
      </div>

      {/* ===== 择刊助手（AI）===== */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2 mb-3"><Sparkles size={14}/> 择刊助手</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">研究方向</label><input className="input" value={field} onChange={e => setField(e.target.value)} /></div>
          <div><label className="label">关键词</label><input className="input" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="逗号分隔" /></div>
        </div>
        <div className="mt-3"><label className="label">论文摘要</label><textarea className="input min-h-[100px]" placeholder="粘贴摘要…" value={abstract} onChange={e => setAbstract(e.target.value)} /></div>
        <div className="mt-3"><button className="btn-primary flex items-center gap-1" onClick={aiSubmit} disabled={aiLoading}><Send size={14}/> {aiLoading ? '生成中…' : 'AI 推荐期刊'}</button></div>
      </div>

      {answer && (
        <div className="card"><h3 className="font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2"><Sparkles size={14}/> AI 推荐</h3>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-300 leading-7">{answer}</pre>
          <div className="mt-3 text-xs text-gray-400">本建议基于内置示例模型生成，正式投稿前请查阅目标期刊最新 scope。</div>
        </div>
      )}

      {/* ===== 择吉计算器 ===== */}
      <div className="card"><h3 className="font-semibold text-gray-800 mb-3">📅 投稿择吉计算器</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">您的出生日期</label>
            <input type="date" className="input" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
          </div>
          <div>
            <label className="label">前瞻天数</label>
            <select className="input" value={daysAhead} onChange={e => setDaysAhead(Number(e.target.value))}>
              <option value={30}>30 天</option><option value={60}>60 天</option><option value={90}>90 天</option>
            </select>
          </div>
          <div>
            <label className="label">论文类型</label>
            <select className="input">
              {PAPER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={calc}>📅 计算择吉</button>
        </div>
      </div>

      {allDates.length > 0 && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card text-center py-3"><div className="text-xs text-gray-400">大吉/吉</div><div className="text-2xl font-bold text-emerald-600">{goodOnly.length}</div></div>
            <div className="card text-center py-3"><div className="text-xs text-gray-400">中平</div><div className="text-2xl font-bold text-amber-600">{allDates.filter(d => d.level === '中').length}</div></div>
            <div className="card text-center py-3"><div className="text-xs text-gray-400">不宜</div><div className="text-2xl font-bold text-rose-600">{avoidDates.length}</div></div>
            <div className="card text-center py-3"><div className="text-xs text-gray-400">最高分</div><div className="text-2xl font-bold text-indigo-600">{Math.max(...allDates.map(d => d.score))}</div></div>
          </div>

          {/* 标签切换 */}
          <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
            {[
              { key: 'recommend' as const, label: '⭐ 投稿吉日推荐', icon: '' },
              { key: 'browse' as const, label: '📅 逐日浏览', icon: '' },
              { key: 'avoid' as const, label: '⚠️ 避开日期', icon: '' },
            ].map(t => (
              <button key={t.key} className={`px-4 py-1.5 text-sm rounded-md font-medium ${tab === t.key ? 'bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
                onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {/* 推荐吉日 */}
          {tab === 'recommend' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-slate-100">🏆 投稿吉日推荐（前 5）</h3>
              {topDates.map((d, i) => (
                <div key={d.date} className={`card border-l-4 ${LEVEL_BG[d.level]} ${d.level === '大吉' ? 'border-l-emerald-500' : d.level === '吉' ? 'border-l-emerald-400' : 'border-l-amber-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${LEVEL_STYLE[d.level]}`}>{d.level}</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{d.date}</span>
                      <span className="text-xs text-gray-400">{d.gz}日 · {d.jianzhu}日</span>
                      <span className="text-xs text-indigo-500">🕐 最佳时辰：{d.bestHour}</span>
                    </div>
                    <span className={`font-bold ${d.score >= 85 ? 'text-emerald-600' : 'text-gray-600'} text-lg`}>{d.score}分</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      {d.reasons.map((r, j) => <div key={j} className="text-gray-600 dark:text-slate-300">✅ {r}</div>)}
                      <div className="text-indigo-500">🧭 吉利方位：面朝{d.direction}</div>
                    </div>
                    <div className="space-y-0.5">
                      {d.taboos.map((t, j) => <div key={j} className="text-rose-500">⚠️ {t}</div>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 逐日浏览 */}
          {tab === 'browse' && (
            <div className="space-y-1.5">
              <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">📅 近期每日宜忌（{allDates.length} 天）</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[600px] overflow-y-auto scrollbar-thin">
                {allDates.map(d => (
                  <div key={d.date} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${d.level === '大吉'||d.level==='吉'?'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/5':'border-gray-100 dark:border-slate-700'} ${d.level==='凶'||d.level==='小凶'?'border-rose-200 bg-rose-50/20 dark:bg-rose-900/5':''}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] px-1 py-0.5 rounded ${LEVEL_STYLE[d.level]} flex-shrink-0`}>{d.level}</span>
                      <span className="text-xs text-gray-700 dark:text-slate-300">{d.date}</span>
                      <span className="text-[10px] text-gray-400">{d.gz} {d.jianzhu}日</span>
                    </div>
                    <span className="text-xs text-gray-500">{d.score}分</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 避开日期 */}
          {tab === 'avoid' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-slate-100">⚠️ 不适宜投稿的日期</h3>
              {avoidDates.map(d => (
                <div key={d.date} className={`card border-l-4 border-l-rose-500 ${LEVEL_BG[d.level]}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${LEVEL_STYLE[d.level]}`}>{d.level}</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{d.date}</span>
                      <span className="text-xs text-gray-400">{d.jianzhu}日 · {d.score}分</span>
                    </div>
                  </div>
                  <div className="mt-1 text-xs space-y-0.5">
                    {d.taboos.map((t, j) => <div key={j} className="text-rose-500">🚫 {t}</div>)}
                    {d.taboos.length === 0 && <div className="text-gray-400">综合评分较低</div>}
                  </div>
                </div>
              ))}
              {avoidDates.length === 0 && <div className="text-gray-400 text-sm py-4">该区间内暂无明显不宜日期</div>}
            </div>
          )}

          {/* 投稿建议 */}
          <div className="card"><h3 className="font-semibold text-sm mb-2">💡 投稿小贴士</h3>
            <div className="text-xs text-gray-500 space-y-0.5">{TIPS.map((t, i) => <div key={i}>• {t}</div>)}</div>
          </div>
        </>
      )}

      {/* 免责声明 */}
      <div className="card border-2 border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-900/5 text-center">
        <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">⚠️ 免责声明</div>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
          本功能基于中国传统占卜文化与神秘学设计，仅供趣味参考和心理调节。
          科研成败最终取决于个人努力与专业判断，玄学加持不超过 15%。
          <strong className="text-rose-500">切勿当真，理性看待。</strong>
        </p>
      </div>
    </div>
  )
}
