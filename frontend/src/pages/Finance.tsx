import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import api, { awardPoints } from '../lib/api'
import { Modal } from './Health'

const MAIN_CATS = [
  { key: 'living', label: '🏠 生活开销', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    subs: ['日常吃饭', '购物', '娱乐', '交通', '住房', '通讯', '医疗', '其他'] },
  { key: 'academic', label: '📚 学术开销', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    subs: ['买书', '版面费', '参会差旅', '实验耗材', '软件许可', '培训课程', '其他'] },
  { key: 'reimburse', label: '💰 待报销', color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    subs: ['会议注册费', '差旅垫付', '实验采购', '办公用品', '其他'] },
  { key: 'income', label: '💵 收入来源', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    subs: ['奖学金', '劳务费', '兼职收入', '稿费', '红包', '投资理财', '其他'] },
]

export default function Finance() {
  const [list, setList] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [mainFilter, setMainFilter] = useState('all')

  const load = async () => { setList((await api.get('/finances')).data) }
  useEffect(() => { load() }, [])

  const openForm = (e?: any) => {
    if (e) {
      setEditing(e)
      setForm({ finance_date: e.finance_date, type: e.type, category: e.category, amount: e.amount, note: e.note || '', main_category: e.main_category || 'living' })
    } else {
      setEditing(null)
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      setForm({ finance_date: today, type: 'expense', category: '', amount: '', note: '', main_category: 'living' })
    }
    setShow(true)
  }
  const save = async () => {
    setSaving(true)
    if (editing?.id) await api.put(`/finances/${editing.id}`, form)
    else { await api.post('/finances', form); awardPoints(1) }
    setSaving(false); setShow(false); setEditing(null); load()
  }

  const filtered = mainFilter === 'all' ? list : list.filter(r => r.main_category === mainFilter || (!r.main_category && mainFilter === 'living'))

  // 三级统计
  const totals: Record<string, number> = {}
let totalIncome = 0
  filtered.forEach(r => {
    if (r.type === 'expense') totals[r.main_category || 'living'] = (totals[r.main_category || 'living'] || 0) + Number(r.amount)
    else if (r.type === 'income') totalIncome += Number(r.amount)
  })

  // 月度
  const monthly: Record<string, { income: number; expense: number }> = {}
  filtered.forEach(r => {
    const m = (r.finance_date || '').slice(0, 7); if (!m) return
    monthly[m] = monthly[m] || { income: 0, expense: 0 }
    if (r.type === 'income') monthly[m].income += Number(r.amount)
    else monthly[m].expense += Number(r.amount)
  })
  const months = Object.keys(monthly).sort()
  const barOption = {
    title: { text: '月度收支', left: 'left', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' }, legend: { top: 5, right: 0 },
    grid: { left: 30, right: 30, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', data: months.map(m => monthly[m].income), type: 'bar', itemStyle: { color: '#10b981', borderRadius: [4,4,0,0] } },
      { name: '支出', data: months.map(m => monthly[m].expense), type: 'bar', itemStyle: { color: '#ef4444', borderRadius: [4,4,0,0] } }
    ]
  }
  const pieOption = {
    title: { text: '三级分类支出', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: ['40%','70%'],
      data: Object.entries(totals).map(([k,v]) => ({ name: MAIN_CATS.find(c=>c.key===k)?.label || k, value: v })) }]
  }

  const mainLabel = (k: string) => MAIN_CATS.find(c => c.key === k)
  const subs = MAIN_CATS.find(c => c.key === form.main_category)?.subs || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">日常记账</h1>
        <button className="btn-primary" onClick={() => openForm()}>＋ 记一笔</button>
      </div>

      {/* 三级分类筛选 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button className={`px-3 py-1 rounded-md text-xs font-medium ${mainFilter==='all'?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-slate-700 text-gray-600'}`} onClick={()=>setMainFilter('all')}>全部</button>
        {MAIN_CATS.map(c => (
          <button key={c.key} className={`px-3 py-1 rounded-md text-xs font-medium ${mainFilter===c.key?'bg-indigo-600 text-white':'bg-gray-100 dark:bg-slate-700 text-gray-600'}`} onClick={()=>setMainFilter(mainFilter===c.key?'all':c.key)}>{c.label}</button>
        ))}
      </div>

      {/* 三级分类汇总卡片 */}
      <div className="grid grid-cols-4 gap-3">
        {MAIN_CATS.map(c => {
          const total = totals[c.key] || 0
          return (
            <div key={c.key} className={`card text-center ${c.color} bg-opacity-50`}>
              <div className="text-lg">{c.label.slice(0,2)}</div>
              <div className="text-sm mt-1">{c.label.slice(2)}</div>
              <div className="text-xl font-bold mt-1">¥{(typeof totalIncome !== 'undefined' || total !== 0) ? total.toFixed(0):0}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card"><ReactECharts option={barOption} style={{ height: 280 }} /></div>
        <div className="card"><ReactECharts option={pieOption} style={{ height: 280 }} /></div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">明细</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 dark:text-slate-400 border-b dark:border-slate-700">
              <th className="py-2">日期</th><th>一级分类</th><th>二级分类</th><th>金额</th><th>备注</th><th className="text-right">操作</th>
            </tr></thead>
            <tbody>
              {filtered.map(r => {
                const mc = mainLabel(r.main_category || 'living')
                return (
                  <tr key={r.id} className="border-b dark:border-slate-700 last:border-0">
                    <td className="py-2">{r.finance_date}</td>
                    <td><span className={`text-xs px-1.5 py-0.5 rounded ${mc?.color || ''}`}>{mc?.label || '生活开销'}</span></td>
                    <td className="text-gray-700 dark:text-slate-300">{r.category || '-'}</td>
                    <td className={`font-medium ${r.type==='income'?'text-emerald-600':'text-rose-600'}`}>{r.type==='income'?'+':'-'}¥{Number(r.amount).toFixed(2)}</td>
                    <td className="text-xs text-gray-400 max-w-[100px] truncate">{r.note}</td>
                    <td className="text-right">
                      <button className="btn-ghost text-xs" onClick={() => openForm(r)}>编辑</button>
                      <button className="btn-ghost text-xs text-rose-500" onClick={async () => { await api.delete(`/finances/${r.id}`); load() }}>删除</button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">暂无记录</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <Modal onClose={() => setShow(false)} title={editing ? '编辑记录' : '记一笔'}>
          <div className="space-y-3">
            <div>
              <label className="label">日期</label>
              <input type="date" className="input" value={form.finance_date} onChange={e => setForm({...form, finance_date: e.target.value})} />
            </div>
            <div>
              <label className="label">类型</label>
              <div className="flex gap-2">
                <button type="button"
                  className={`flex-1 text-sm px-3 py-2 rounded-lg border transition ${form.type === 'expense' ? 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                  onClick={() => setForm({...form, type: 'expense', main_category: 'living', category: ''})}>
                  📤 支出
                </button>
                <button type="button"
                  className={`flex-1 text-sm px-3 py-2 rounded-lg border transition ${form.type === 'income' ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                  onClick={() => setForm({...form, type: 'income', main_category: 'income', category: ''})}>
                  📥 收入
                </button>
              </div>
            </div>
            {form.type === 'expense' ? (<>
            <div>
              <label className="label">一级分类</label>
              <div className="grid grid-cols-3 gap-2">
                {MAIN_CATS.map(c => (
                  <button key={c.key} type="button"
                    className={`text-sm px-3 py-2 rounded-lg border transition ${form.main_category === c.key ? `${c.color} border-current` : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                    onClick={() => setForm({...form, main_category: c.key, category: ''})}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">二级分类</label>
              <div className="flex flex-wrap gap-1.5">
                {subs.map(s => (
                  <button key={s} type="button"
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${form.category === s ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                    onClick={() => setForm({...form, category: s})}>{s}</button>
                ))}
              </div>
              <input className="input text-sm mt-2" placeholder="或自定义输入…"
                value={subs.includes(form.category) ? '' : form.category}
                onChange={e => setForm({...form, category: e.target.value})} />
            </div>
            </> ) : (
            <div>
              <label className="label">收入分类</label>
              <div className="flex flex-wrap gap-1.5">
                {MAIN_CATS.find(c => c.key === 'income')!.subs.map(s => (
                  <button key={s} type="button"
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${form.category === s ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'border-gray-200 dark:border-slate-600 text-gray-500'}`}
                    onClick={() => setForm({...form, category: s})}>{s}</button>
                ))}
              </div>
              <input className="input text-sm mt-2" placeholder="或自定义输入…"
                value={subs.includes(form.category) ? '' : form.category}
                onChange={e => setForm({...form, category: e.target.value})} />
            </div>
            )}
            <div>
              <label className="label">金额（元）</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <label className="label">备注</label>
              <textarea className="input min-h-[50px] text-sm" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShow(false)}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving}>保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
