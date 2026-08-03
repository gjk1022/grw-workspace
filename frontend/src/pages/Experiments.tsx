import { useEffect, useState } from 'react'
import api, { awardPoints } from '../lib/api'

function Modal({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export default function Experiments() {
  const [list, setList] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [form, setForm] = useState<any>({})
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => api.get('/experiments').then(r => setList(r.data || []))
  useEffect(() => { load() }, [])

  const openForm = (e?: any) => {
    if (e) {
      setEditing(e)
      setForm({
        name: e.name || '', exp_date: e.exp_date || '', software: e.software || '',
        model_version: e.model_version || '', repo_url: e.repo_url || '', git_version: e.git_version || '',
        parameters: e.parameters || '', conditions: e.conditions || '',
        raw_data_path: e.raw_data_path || '', data_file: e.data_file || '',
        result_image: e.result_image || '', conclusion: e.conclusion || ''
      })
      setUploadFiles([])
    } else {
      setEditing(null)
      setForm({ name: '', exp_date: '', software: '', model_version: '', repo_url: '', git_version: '',
        parameters: '', conditions: '', raw_data_path: '', data_file: '', result_image: '', conclusion: '' })
      setUploadFiles([])
    }
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    let saved: any
    if (editing?.id) {
      saved = (await api.put(`/experiments/${editing.id}`, form)).data
    } else {
      saved = (await api.post('/experiments', form)).data
      awardPoints(5)
    }
    // 如果有上传文件
    if (uploadFiles.length > 0) {
      setUploading(true)
      const fd = new FormData()
      uploadFiles.forEach(f => fd.append('files', f))
      await api.post(`/experiments/${editing?.id || saved.id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploading(false)
    }
    setSaving(false)
    setShowForm(false)
    setEditing(null)
    load()
  }

  const del = async (id: number) => {
    if (!confirm('确认删除此实验记录？')) return
    await api.delete(`/experiments/${id}`)
    load()
  }

  const setF = (k: string, v: any) => setForm((prev: any) => ({ ...prev, [k]: v }))
  const parseAttachments = (s: string) => { try { return JSON.parse(s) } catch { return [] } }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">实验 / 模拟索引</h1>
          <p className="text-sm text-gray-500 mt-1">共 {list.length} 条记录 · 含代码版本与附件管理</p>
        </div>
        <button className="btn-primary" onClick={() => openForm()}>＋ 新建实验</button>
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">还没有实验记录，点击「新建实验」开始</div>
      ) : (
        <div className="space-y-3">
          {list.map((e: any) => {
            const isOpen = expanded === e.id
            const atts = parseAttachments(e.attachments || '')
            return (
              <div key={e.id} className="card py-3 px-4 hover:shadow-sm transition">
                {/* 摘要行 */}
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : e.id)}>
                  <span className="text-lg mt-0.5">{isOpen ? '🔽' : '🔬'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 dark:text-slate-200">{e.name}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                      {e.exp_date && <span>📅 {e.exp_date}</span>}
                      {e.software && <span>💻 {e.software}</span>}
                      {e.model_version && <span>🔖 {e.model_version}</span>}
                      {e.git_version && <span className="text-indigo-500 font-mono">#{e.git_version.slice(0, 7)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="btn-ghost text-xs" onClick={e2 => { e2.stopPropagation(); openForm(e) }}>编辑</button>
                    <button className="btn-ghost text-xs text-rose-500" onClick={e2 => { e2.stopPropagation(); del(e.id) }}>删除</button>
                  </div>
                </div>

                {/* 展开明细 */}
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3 pl-8">
                    {/* 代码版本 */}
                    {(e.repo_url || e.git_version) && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">🔗 代码版本管理</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {e.repo_url && (
                            <a href={e.repo_url} target="_blank" rel="noopener" className="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[300px]">
                              {e.repo_url}
                            </a>
                          )}
                          {e.git_version && (
                            <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-700 dark:text-slate-300 font-mono">
                              {e.git_version}
                            </code>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 参数 */}
                    {e.parameters && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">⚙️ 关键参数</div>
                        <pre className="text-xs text-gray-600 dark:text-slate-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 font-mono leading-relaxed">{e.parameters}</pre>
                      </div>
                    )}

                    {/* 条件 */}
                    {e.conditions && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">🧪 计算条件</div>
                        <pre className="text-xs text-gray-600 dark:text-slate-300 whitespace-pre-wrap bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">{e.conditions}</pre>
                      </div>
                    )}

                    {/* 数据路径 */}
                    {(e.raw_data_path || e.data_file) && (
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600 dark:text-slate-300">
                        {e.raw_data_path && <span>📂 原始数据：<code className="text-indigo-500">{e.raw_data_path}</code></span>}
                        {e.data_file && <span>📄 数据文件：<code className="text-indigo-500">{e.data_file}</code></span>}
                        {e.result_image && <span>🖼️ 结果图：<code className="text-indigo-500">{e.result_image}</code></span>}
                      </div>
                    )}

                    {/* 结论 */}
                    {e.conclusion && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">📝 结论</div>
                        <p className="text-sm text-gray-700 dark:text-slate-300">{e.conclusion}</p>
                      </div>
                    )}

                    {/* 附件 */}
                    {atts.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">📎 附件 ({atts.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {atts.map((url: string, i: number) => {
                            const name = url.split('/').pop() || `附件${i + 1}`
                            const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(url)
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener"
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:underline">
                                {isImg ? '🖼️' : '📄'} {name}
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 新建/编辑表单 */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? '编辑实验' : '新建实验'}>
          <div className="space-y-3">
            <div>
              <label className="label">实验名称 *</label>
              <input className="input" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="如：MOF-5 吸附模拟" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">实验日期</label>
                <input className="input" type="date" value={form.exp_date} onChange={e => setF('exp_date', e.target.value)} />
              </div>
              <div>
                <label className="label">软件/工具</label>
                <input className="input" value={form.software} onChange={e => setF('software', e.target.value)} placeholder="如 VASP, GROMACS" />
              </div>
              <div>
                <label className="label">模型版本</label>
                <input className="input" value={form.model_version} onChange={e => setF('model_version', e.target.value)} placeholder="如 v1.2.3" />
              </div>
            </div>

            {/* 代码版本管理 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">🔗 代码仓库地址</label>
                <input className="input text-sm" value={form.repo_url} onChange={e => setF('repo_url', e.target.value)} placeholder="https://github.com/xxx/xxx" />
              </div>
              <div>
                <label className="label">🔖 Git Commit ID / 版本号</label>
                <input className="input text-sm font-mono" value={form.git_version} onChange={e => setF('git_version', e.target.value)} placeholder="abc1234 或 v2.0.1" />
              </div>
            </div>

            {/* 参数 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">⚙️ 关键参数设置</label>
                <textarea className="input min-h-[80px] text-sm font-mono" value={form.parameters}
                  onChange={e => setF('parameters', e.target.value)}
                  placeholder={"温度: 300 K\n压力: 1 atm\n迭代次数: 5000\n收敛标准: 1e-6"} />
              </div>
              <div>
                <label className="label">🧪 实验条件</label>
                <textarea className="input min-h-[80px] text-sm" value={form.conditions}
                  onChange={e => setF('conditions', e.target.value)}
                  placeholder="如：NVT系综，时间步长1fs，总时长10ns" />
              </div>
            </div>

            {/* 数据路径 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">📂 原始数据路径</label>
                <input className="input text-sm" value={form.raw_data_path} onChange={e => setF('raw_data_path', e.target.value)}
                  placeholder="D:/data/exp001/" />
              </div>
              <div>
                <label className="label">📄 数据文件</label>
                <input className="input text-sm" value={form.data_file} onChange={e => setF('data_file', e.target.value)} />
              </div>
              <div>
                <label className="label">🖼️ 结果图片路径</label>
                <input className="input text-sm" value={form.result_image} onChange={e => setF('result_image', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">📝 实验结论</label>
              <textarea className="input min-h-[60px]" value={form.conclusion}
                onChange={e => setF('conclusion', e.target.value)}
                placeholder="实验结果总结、发现的规律、待改进点等" />
            </div>

            {/* 附件上传 */}
            <div>
              <label className="label">📎 上传附件（截图、日志、数据表格等，可多选）</label>
              <input type="file" multiple onChange={e => {
                if (e.target.files) setUploadFiles(Array.from(e.target.files))
              }} className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 dark:file:bg-indigo-900/30 file:text-indigo-600 dark:file:text-indigo-300 file:hover:bg-indigo-100 cursor-pointer" />
              {uploadFiles.length > 0 && (
                <div className="mt-1 text-xs text-gray-400">
                  已选 {uploadFiles.length} 个文件：{uploadFiles.map(f => f.name).join(', ')}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>取消</button>
              <button className="btn-primary" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? (uploading ? '上传附件中…' : '保存中…') : (editing ? '保存' : '创建')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
