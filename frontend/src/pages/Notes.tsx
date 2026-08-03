import { useEffect, useState } from 'react'
import api, { awardPoints } from '../lib/api'

const PROGRESS = [
  { key: 'unread', label: '未阅读', icon: '📥', nextLabel: '开始阅读' },
  { key: 'reading', label: '阅读中', icon: '📖', nextLabel: '标记已读' },
  { key: 'completed', label: '已读完', icon: '✅', nextLabel: '还原未读' },
]
const NEXT_STATUS: Record<string, string> = { unread: 'reading', reading: 'completed', completed: 'unread' }
const DEPTHS = [
  { key: 'deep', label: '精读', icon: '🔬', desc: '全文阅读·填核心结论和个人启发' },
  { key: 'wide', label: '泛读', icon: '📄', desc: '了解要点即可' },
]

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export default function Notes() {
  const [lits, setLits] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [upFiles, setUpFiles] = useState<Record<number, any>>({})
  const [folderFilter, setFolderFilter] = useState('all')

  const load = () => api.get('/literatures').then(r => setLits(r.data || []))
  useEffect(() => { load() }, [])

  const allFolders = [...new Set(lits.map(l => l.folder || '').filter(Boolean))] as string[]
  const filtered = folderFilter === 'all' ? lits : lits.filter(l => (l.folder || '') === folderFilter || (folderFilter === 'uncat' && !l.folder))

  const save = async (v: any) => {
    if (editing?.id) await api.put(`/literatures/${editing.id}`, v)
    else { await api.post('/literatures', v); awardPoints(3) }
    setShowAdd(false); setEditing(null); load()
  }
  const del = async (id: number) => { if (!confirm('确认删除此文献？')) return; await api.delete(`/literatures/${id}`); load() }
  const toggleRead = async (lit: any) => {
    const next = NEXT_STATUS[lit.status] || 'reading'
    await api.put(`/literatures/${lit.id}/read`, { status: next })
    if (next === 'completed') awardPoints(2)
    load()
  }
  const uploadPdf = async (id: number) => {
    const f = upFiles[id]; if (!f) return
    const fd = new FormData(); fd.append('file', f)
    await api.post(`/literatures/${id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setUpFiles(prev => { const n = { ...prev }; delete n[id]; return n }); load()
  }
  const toggleTag = async (lit: any, tag: string) => {
    const tags = (lit.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
    const next = tags.includes(tag) ? tags.filter((t: string) => t !== tag) : [...tags, tag]
    await api.put(`/literatures/${lit.id}`, { tags: next.join(',') })
    load()
  }

  // 分组：文件夹 → 深度 → 状态
  const groups: Record<string, Record<string, Record<string, any[]>>> = {}
  filtered.forEach(l => {
    const f = l.folder || '未分类'
    const d = l.depth || 'wide'
    const s = ['unread', 'reading', 'completed'].includes(l.status) ? l.status : 'unread'
    if (!groups[f]) groups[f] = {}
    if (!groups[f][d]) groups[f][d] = {}
    if (!groups[f][d][s]) groups[f][d][s] = []
    groups[f][d][s].push(l)
  })
  const sortedFolders = Object.keys(groups).sort((a, b) => a === '未分类' ? 1 : b === '未分类' ? -1 : a.localeCompare(b))

  // 导出
  const [exporting, setExporting] = useState(false)
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const buildMarkdown = (data: any) => {
    const lines: string[] = []
    const title = data.folder === 'all' ? '全部主题' : (data.folder || '未分类')
    lines.push(`# 文献精读笔记 — ${title}`)
    lines.push('')
    lines.push(`> 导出时间：${new Date().toLocaleString('zh-CN')}　·　共 ${data.count} 篇文献`)
    lines.push('')
    data.items.forEach((it: any, i: number) => {
      lines.push(`## ${i + 1}. ${it.title}`)
      if (it.authors) lines.push(`- **作者**: ${it.authors}`)
      if (it.source || it.year) lines.push(`- **来源**: ${it.source}${it.year ? ` (${it.year})` : ''}`)
      if (it.doi) lines.push(`- **DOI**: ${it.doi}`)
      if (it.folder) lines.push(`- **分类**: ${it.folder}`)
      if (it.read_at) lines.push(`- **阅读时间**: ${it.read_at.slice(0, 10)}`)
      lines.push('')
      it.notes.forEach((n: any, j: number) => {
        lines.push(`### 笔记 #${j + 1}`)
        if (n.abstract) { lines.push(`**摘要**:`); lines.push(n.abstract); lines.push('') }
        if (n.keywords) { lines.push(`**关键词**: ${n.keywords}`); lines.push('') }
        if (n.innovation) { lines.push(`**创新点**:`); lines.push(n.innovation); lines.push('') }
        if (n.main_content) { lines.push(`**主要研究内容**:`); lines.push(n.main_content); lines.push('') }
        if (n.core_conclusion) { lines.push(`**核心结论**:`); lines.push(n.core_conclusion); lines.push('') }
        if (n.personal_insight) { lines.push(`**个人启发**:`); lines.push(n.personal_insight); lines.push('') }
        if (n.method) { lines.push(`**方法**:`); lines.push(n.method); lines.push('') }
        if (n.content) { lines.push(`**其他**:`); lines.push(n.content); lines.push('') }
        lines.push('---'); lines.push('')
      })
    })
    return lines.join('\n')
  }
  const buildHtml = (data: any) => {
    const blocks = data.items.map((it: any, i: number) => `
      <article class="paper"><h2>${i + 1}. ${escapeHtml(it.title)}</h2>
      <div class="meta">${it.authors ? `<span><b>作者：</b>${escapeHtml(it.authors)}</span>` : ''}${it.source || it.year ? `<span><b>来源：</b>${escapeHtml(it.source||'')}${it.year?` (${escapeHtml(it.year)})`:''}</span>` : ''}${it.doi?`<span><b>DOI：</b>${escapeHtml(it.doi)}</span>`:''}</div>
      ${it.notes.map((n: any, j: number) => `<div class="note"><h3>笔记 #${j+1}</h3>
        ${n.abstract?`<div class="field"><b>摘要：</b><div class="body">${escapeHtml(n.abstract).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.keywords?`<div class="field"><b>关键词：</b>${escapeHtml(n.keywords)}</div>`:''}
        ${n.innovation?`<div class="field"><b>创新点：</b><div class="body">${escapeHtml(n.innovation).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.main_content?`<div class="field"><b>主要研究内容：</b><div class="body">${escapeHtml(n.main_content).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.core_conclusion?`<div class="field"><b>核心结论：</b><div class="body">${escapeHtml(n.core_conclusion).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.personal_insight?`<div class="field"><b>个人启发：</b><div class="body">${escapeHtml(n.personal_insight).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.method?`<div class="field"><b>方法：</b><div class="body">${escapeHtml(n.method).replace(/\n/g,'<br/>')}</div></div>`:''}
        ${n.content?`<div class="field"><b>其他：</b><div class="body">${escapeHtml(n.content).replace(/\n/g,'<br/>')}</div></div>`:''}
      </div>`).join('')}</article>`).join('')
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><title>文献精读笔记 — ${escapeHtml(data.folder==='all'?'全部':(data.folder||'未分类'))}</title>
<style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:800px;margin:32px auto;color:#222;line-height:1.7;padding:0 16px}h1{text-align:center;border-bottom:2px solid #6366f1;padding-bottom:12px}h2{color:#6366f1;margin-top:28px}.paper{margin-bottom:30px;page-break-inside:avoid}.meta{display:flex;gap:4px 12px;flex-wrap:wrap;font-size:13px;color:#666;margin:8px 0}.meta span{background:#f4f4f8;padding:2px 8px;border-radius:4px}.note{background:#fafbff;border-left:3px solid #818cf8;padding:10px 14px;margin-top:10px;border-radius:4px}.field{margin:6px 0}.field b{color:#6366f1}.body{margin:4px 0 0 4px;white-space:pre-wrap}@media print{body{font-size:11pt}.paper{page-break-inside:avoid}}</style></head><body>
<h1>文献精读笔记 — ${escapeHtml(data.folder==='all'?'全部':(data.folder||'未分类'))}</h1>
<p style="text-align:center;color:#666;font-size:13px">导出时间：${new Date().toLocaleString('zh-CN')} · 共 ${data.count} 篇</p>
${data.count===0?'<div class="empty">无精读笔记</div>':blocks}</body></html>`
  }
  const exportMd = async () => {
    setExporting(true)
    try {
      const target = folderFilter === 'uncat' ? '' : folderFilter
      const r = await api.get('/notes/export', { params: { folder: target || 'all' } })
      if (r.data.count === 0) { alert('该主题下暂无精读笔记可导出'); return }
      const md = buildMarkdown(r.data)
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `精读笔记_${r.data.folder === 'all' ? '全部' : (r.data.folder || '未分类')}_${new Date().toISOString().slice(0, 10)}.md`
      a.click(); URL.revokeObjectURL(a.href)
    } finally { setExporting(false) }
  }
  const exportPdf = async () => {
    setExporting(true)
    try {
      const target = folderFilter === 'uncat' ? '' : folderFilter
      const r = await api.get('/notes/export', { params: { folder: target || 'all' } })
      if (r.data.count === 0) { alert('该主题下暂无精读笔记可导出'); return }
      const html = buildHtml(r.data)
      const w = window.open('', '_blank', 'width=900,height=800')
      if (!w) { alert('请允许弹窗以导出 PDF'); return }
      w.document.open(); w.document.write(html); w.document.close()
      w.addEventListener('load', () => { setTimeout(() => w.print(), 250) })
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">文献阅读</h1>
          <p className="text-sm text-gray-500 mt-1">共 {filtered.length} 篇 · 精读/泛读分类</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm border" onClick={exportMd} disabled={exporting}>📝 导出MD</button>
          <button className="btn-ghost text-sm border" onClick={exportPdf} disabled={exporting}>📄 导出PDF</button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowAdd(true) }}>＋ 添加文献</button>
        </div>
      </div>

      {/* 文件夹筛选 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">📂：</span>
        <button className={`px-2.5 py-1 rounded-md text-xs font-medium ${folderFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600'}`} onClick={() => setFolderFilter('all')}>全部</button>
        {allFolders.map(f => (
          <button key={f} className={`px-2.5 py-1 rounded-md text-xs font-medium ${folderFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600'}`} onClick={() => setFolderFilter(folderFilter === f ? 'all' : f)}>{f}</button>
        ))}
        <button className={`px-2.5 py-1 rounded-md text-xs ${folderFilter === 'uncat' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`} onClick={() => setFolderFilter(folderFilter === 'uncat' ? 'all' : 'uncat')}>未分类</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">此分类下暂无文献</div>
      ) : (
        sortedFolders.map(folderName => {
          const depthMap = groups[folderName]
          return (
            <div key={folderName} className="space-y-2">
              <div className="flex items-center gap-2 mt-2">
                <span className="text-lg">📂</span>
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{folderName}</span>
                <span className="text-xs text-gray-400">({Object.values(depthMap).flatMap(d => Object.values(d).flat()).length} 篇)</span>
              </div>
              <div className="ml-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-4">
                {DEPTHS.map(depth => {
                  const zoneMap = depthMap[depth.key]
                  if (!zoneMap) return null
                  const totalInDepth = Object.values(zoneMap).flat().length
                  if (totalInDepth === 0) return null
                  return (
                    <div key={depth.key}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span>{depth.icon}</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">{depth.label}</span>
                        <span className="text-[10px] text-gray-400">· {depth.desc}</span>
                        <span className="text-[10px] text-gray-400">({totalInDepth}篇)</span>
                      </div>
                      <div className="ml-4 space-y-3">
                        {PROGRESS.map(prog => {
                          const items = zoneMap[prog.key] || []
                          if (items.length === 0) return null
                          return (
                            <div key={prog.key}>
                              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">{prog.icon} {prog.label} ({items.length})</div>
                              <div className="space-y-2">
                                {items.map(l => (
                                  <LitCard key={l.id} lit={l} onToggleRead={toggleRead} onEdit={() => { setEditing(l); setShowAdd(true) }} onDelete={() => del(l.id)} onRefresh={load} upFile={upFiles[l.id]} onFileChange={(f: any) => setUpFiles(prev => ({ ...prev, [l.id]: f }))} onUpload={() => uploadPdf(l.id)} onDepthChange={(d: string) => { api.put(`/literatures/${l.id}`, { depth: d }).then(load) }} onTagToggle={(tag: string) => toggleTag(l, tag)} />
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title={editing ? '编辑文献' : '添加文献'}>
          <form onSubmit={e => { e.preventDefault(); save(formData(e.target as any)); }} className="space-y-3">
            <div>
              <label className="label">标题 *</label>
              <input name="title" className="input" defaultValue={editing?.title || ''} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">作者</label><input name="authors" className="input" defaultValue={editing?.authors || ''} /></div>
              <div><label className="label">年份</label><input name="year" className="input" defaultValue={editing?.year || ''} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">来源/期刊</label><input name="source" className="input" defaultValue={editing?.source || ''} /></div>
              <div><label className="label">DOI</label><input name="doi" className="input" defaultValue={editing?.doi || ''} placeholder="10.xxxx/xxxxx" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">阅读深度</label>
                <select name="depth" className="input" defaultValue={editing?.depth || 'wide'}>
                  {DEPTHS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">阅读进度</label>
                <select name="status" className="input" defaultValue={editing?.status || 'unread'}>
                  {PROGRESS.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">重点 & 引用标记</label>
                <LitFormTags editing={editing} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">引用信息</label><input name="cite" className="input" defaultValue={editing?.cite || ''} /></div>
              <div>
                <label className="label">文件夹</label>
                <input name="folder" className="input" defaultValue={editing?.folder || ''} placeholder="如：AI论文" list="folder-suggest" />
                <datalist id="folder-suggest">{allFolders.map(f => <option key={f} value={f} />)}</datalist>
              </div>
            </div>
            <div><label className="label">简介/笔记</label><textarea name="notes" className="input min-h-[60px]" defaultValue={editing?.notes || ''} /></div>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setShowAdd(false)}>取消</button><button type="submit" className="btn-primary">{editing ? '保存' : '添加'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function formData(form: HTMLFormElement) {
  const fd = new FormData(form); const obj: any = {}; fd.forEach((v, k) => { obj[k] = v }); return obj
}

// ===== 文献卡片 =====
function LitCard({ lit, onToggleRead, onEdit, onDelete, onRefresh, upFile, onFileChange, onUpload, onDepthChange, onTagToggle }: any) {
  const [showNote, setShowNote] = useState(false)
  const [showPdf, setShowPdf] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [noteForm, setNoteForm] = useState({ abstract: '', keywords: '', innovation: '', main_content: '', content: '', core_conclusion: '', personal_insight: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)

  const loadNotes = async () => { const r = await api.get(`/literatures/${lit.id}/notes`); setNotes(r.data || []) }
  const openNotes = () => { setShowNote(true); if (notes.length === 0) loadNotes() }
  const addNote = async () => {
    const nf = noteForm
    if (!nf.abstract.trim() && !nf.content.trim() && !nf.innovation.trim() && !nf.core_conclusion.trim() && !nf.personal_insight.trim()) return
    setSavingNote(true)
    await api.post('/notes', {
      literature_id: lit.id, title: lit.title + ' 笔记',
      abstract: nf.abstract.trim(), keywords: nf.keywords.trim(),
      innovation: nf.innovation.trim(), main_content: nf.main_content.trim(),
      core_conclusion: nf.core_conclusion.trim(), personal_insight: nf.personal_insight.trim(), content: nf.content.trim()
    })
    setNoteForm({ abstract: '', keywords: '', innovation: '', main_content: '', content: '', core_conclusion: '', personal_insight: '' })
    setShowNoteForm(false); setSavingNote(false); loadNotes()
  }

  const isDeep = (lit.depth || 'wide') === 'deep'
  const tags = (lit.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean)
  const progress = PROGRESS.find(p => p.key === lit.status) || PROGRESS[0]

  return (
    <div className="card py-3 px-4 hover:shadow-sm transition group">
      <div className="flex items-start gap-3">
        {/* 阅读进度切换：unread→reading→completed→unread */}
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition ${
            lit.status === 'completed' ? 'bg-emerald-500 border-emerald-500'
            : lit.status === 'reading' ? 'bg-amber-500 border-amber-500'
            : 'border-gray-300 hover:border-amber-400'
          }`}
          onClick={() => onToggleRead(lit)}
          title={`当前: ${progress.label}，点击切换为 ${lit.status === 'completed' ? 'unread' : lit.status === 'reading' ? 'completed' : 'reading'}`}
        >
          {lit.status === 'completed' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          {lit.status === 'reading' && <span className="text-white text-[9px] font-bold">⋯</span>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800 dark:text-slate-200">{lit.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {lit.authors && <span>{lit.authors.split(',')[0]} 等 · </span>}
            {lit.source}{lit.year && ` (${lit.year})`}
          </div>

          {/* 标签行：深度 + 重点标记 + folder + doi */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* 深度切换 */}
            <button onClick={e => { e.stopPropagation(); onDepthChange(isDeep ? 'wide' : 'deep') }}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition ${
                isDeep ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-600' : 'border-gray-200 dark:border-slate-600 text-gray-500'
              }`} title={isDeep ? '点击切换为泛读' : '点击切换为精读'}>
              {isDeep ? '🔬 精读' : '📄 泛读'}
            </button>
            {/* 重点/已引用 切换按钮 */}
            {(() => {
              const hasImportant = tags.includes('重点论文')
              const hasCited = tags.includes('已引用')
              return (
                <>
                  <button onClick={e => { e.stopPropagation(); onTagToggle('重点论文') }}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                      hasImportant ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'border-gray-200 dark:border-slate-600 text-gray-400'
                    }`}>{hasImportant ? '⭐ 重点' : '☆ 重点'}</button>
                  <button onClick={e => { e.stopPropagation(); onTagToggle('已引用') }}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                      hasCited ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600' : 'border-gray-200 dark:border-slate-600 text-gray-400'
                    }`}>{hasCited ? '📎 已引用' : '🔗 已引用'}</button>
                </>
              )
            })()}
            {lit.folder && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">📂 {lit.folder}</span>}
            {lit.doi && <span className="text-[10px] text-gray-400">DOI: {lit.doi}</span>}
            {lit.read_at && <span className="text-[10px] text-emerald-500">📅 {lit.read_at.slice(0, 10)}</span>}
          </div>

          {/* PDF 区域 */}
          <div className="mt-2 text-xs flex items-center gap-2">
            {lit.file_path ? (
              <>
                <button className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400" onClick={() => setShowPdf(true)}>👁️ 预览</button>
                <a className="text-gray-400 hover:text-gray-600" href={lit.file_path} target="_blank" rel="noopener">📄 新窗口</a>
                <button className="text-gray-300 hover:text-rose-500" onClick={async e => { e.preventDefault(); await api.delete(`/literatures/${lit.id}/pdf`); onRefresh() }}>🗑️</button>
              </>
            ) : (
              <label className="inline-flex items-center gap-1 text-gray-400 hover:text-indigo-500 cursor-pointer">
                📤 上传 PDF<input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { onFileChange(f); setTimeout(() => onUpload(), 100) } }} />
              </label>
            )}
          </div>
        </div>

        {/* PDF 预览弹窗 */}
        {showPdf && lit.file_path && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPdf(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b dark:border-slate-700">
                <span className="text-sm font-medium truncate">{lit.title}</span>
                <div className="flex gap-2"><a className="btn-ghost text-xs" href={lit.file_path} target="_blank" rel="noopener">新窗口</a><button className="btn-ghost text-xs" onClick={() => setShowPdf(false)}>关闭</button></div>
              </div>
              <iframe src={lit.file_path} className="flex-1 w-full rounded-b-2xl" />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button className="btn-ghost text-xs" onClick={e => { e.stopPropagation(); openNotes() }}>笔记</button>
          <button className="btn-ghost text-xs" onClick={e => { e.stopPropagation(); onEdit() }}>编辑</button>
          <button className="btn-ghost text-xs text-rose-500" onClick={async e => { e.preventDefault(); e.stopPropagation(); if (!confirm('删除？')) return; await api.delete(`/literatures/${lit.id}`); onRefresh() }}>删除</button>
        </div>
      </div>

      {/* 笔记弹窗 */}
      {showNote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowNote(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">📝 {lit.title}</h3>
              <button className="btn-ghost text-xs" onClick={() => setShowNote(false)}>×</button>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-sm space-y-1">
                    {n.abstract && <FieldRow label="摘要" v={n.abstract} />}
                    {n.keywords && <FieldRow label="关键词" v={n.keywords} />}
                    {n.innovation && <FieldRow label="创新点" v={n.innovation} />}
                    {n.main_content && <FieldRow label="主要研究内容" v={n.main_content} />}
                    {n.core_conclusion && <FieldRow label="核心结论" v={n.core_conclusion} />}
                    {n.personal_insight && <FieldRow label="个人启发" v={n.personal_insight} />}
                    {n.content && <FieldRow label="笔记" v={n.content} />}
                    <div className="text-xs text-gray-400 mt-1">{n.created_at?.slice(0, 16)}</div>
                  </div>
                ))}
              </div>
            ) : <div className="text-sm text-gray-400 mb-4">暂无笔记</div>}
            {!showNoteForm ? (
              <button className="btn-primary text-sm w-full" onClick={() => setShowNoteForm(true)}>＋ 添加笔记</button>
            ) : (
              <div className="space-y-2">
                <input className="input text-sm" placeholder="摘要（Abstract）" value={noteForm.abstract} onChange={e => setNoteForm({ ...noteForm, abstract: e.target.value })} />
                <input className="input text-sm" placeholder="关键词（逗号分隔）" value={noteForm.keywords} onChange={e => setNoteForm({ ...noteForm, keywords: e.target.value })} />
                <textarea className="input text-sm min-h-[50px]" placeholder="创新点" value={noteForm.innovation} onChange={e => setNoteForm({ ...noteForm, innovation: e.target.value })} />
                <textarea className="input text-sm min-h-[60px]" placeholder="主要研究内容" value={noteForm.main_content} onChange={e => setNoteForm({ ...noteForm, main_content: e.target.value })} />
                <textarea className="input text-sm min-h-[50px]" placeholder="核心结论" value={noteForm.core_conclusion} onChange={e => setNoteForm({ ...noteForm, core_conclusion: e.target.value })} />
                <textarea className="input text-sm min-h-[50px]" placeholder="个人启发" value={noteForm.personal_insight} onChange={e => setNoteForm({ ...noteForm, personal_insight: e.target.value })} />
                <textarea className="input text-sm min-h-[50px]" placeholder="其他笔记…" value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} />
                <div className="flex gap-2 justify-end">
                  <button className="btn-ghost text-xs" onClick={() => setShowNoteForm(false)}>取消</button>
                  <button className="btn-primary text-sm" onClick={addNote} disabled={savingNote}>保存</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LitFormTags({ editing }: { editing: any }) {
  const [hasImportant, setImportant] = useState(false)
  const [hasCited, setCited] = useState(false)
  useEffect(() => {
    const tags = (editing?.tags || '').split(',').map((t: string) => t.trim())
    setImportant(tags.includes('重点论文'))
    setCited(tags.includes('已引用'))
  }, [editing])

  const build = () => {
    const arr: string[] = []
    if (hasImportant) arr.push('重点论文')
    if (hasCited) arr.push('已引用')
    return arr.join(',')
  }

  return (
    <div className="flex items-center gap-3 mt-1">
      <input type="hidden" name="tags" value={build()} />
      <button type="button" onClick={() => setImportant(!hasImportant)}
        className={`text-xs px-3 py-1.5 rounded-lg border transition ${hasImportant ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-gray-200 text-gray-400'}`}>
        {hasImportant ? '⭐ 重点论文' : '☆ 重点论文'}
      </button>
      <button type="button" onClick={() => setCited(!hasCited)}
        className={`text-xs px-3 py-1.5 rounded-lg border transition ${hasCited ? 'border-violet-400 bg-violet-50 text-violet-600' : 'border-gray-200 text-gray-400'}`}>
        {hasCited ? '📎 已引用' : '🔗 已引用'}
      </button>
    </div>
  )
}

function FieldRow({ label, v }: { label: string; v: string }) {
  return <div className="text-gray-700 dark:text-slate-300"><span className="text-xs text-gray-400 font-medium">{label}：</span><span className="line-clamp-3">{v}</span></div>
}
