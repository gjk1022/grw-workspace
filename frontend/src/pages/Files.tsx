import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'

type Folder = { id: number; name: string }
type File = { id: number; filename: string; file_path: string; file_size: number; folder_id: number; created_at: string }

export default function Files() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [activeFolder, setActiveFolder] = useState<number>(0)
  const [showAdd, setShowAdd] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFolders = () => api.get('/folders').then(r => setFolders(r.data))
  const loadFiles = (fid = activeFolder) => api.get(`/files?folder_id=${fid}`).then(r => setFiles(r.data))

  useEffect(() => { loadFolders() }, [])
  useEffect(() => { loadFiles() }, [activeFolder])

  const createFolder = async () => {
    if (!folderName.trim()) return
    await api.post('/folders', { name: folderName.trim() })
    setFolderName(''); setShowAdd(false); loadFolders()
  }
  const delFolder = async (id: number) => {
    if (!confirm('删除文件夹将把文件移到根目录，确认？')) return
    await api.delete(`/folders/${id}`)
    if (activeFolder === id) setActiveFolder(0)
    loadFolders(); loadFiles(0)
  }
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', f)
    await api.post(`/files/upload?folder_id=${activeFolder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setUploading(false)
    loadFiles()
    if (fileRef.current) fileRef.current.value = ''
  }
  const delFile = async (id: number) => {
    if (!confirm('删除文件？')) return
    await api.delete(`/files/${id}`)
    loadFiles()
  }
  const moveFile = async (fileId: number, toFolderId: number) => {
    await api.put(`/files/${fileId}/move`, { folder_id: toFolderId })
    loadFiles()
  }
  const selectFolder = (id: number) => {
    setActiveFolder(id)
  }

  const activeName = activeFolder === 0 ? '根目录' : folders.find(f => f.id === activeFolder)?.name || ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">文件中心</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeFolder === 0 ? '全部文件' : `📂 ${activeName}`} · {files.length} 个文件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-sm" onClick={() => setShowAdd(true)}>＋ 新建文件夹</button>
          <label className="btn-primary text-sm cursor-pointer">
            {uploading ? '上传中…' : '＋ 上传文件'}
            <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* 文件夹导航 */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            activeFolder === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
          }`}
          onClick={() => selectFolder(0)}
        >
          📁 根目录
        </button>
        {folders.map(f => (
          <div key={f.id} className="group relative">
            <button
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeFolder === f.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200'
              }`}
              onClick={() => selectFolder(f.id)}
            >
              📂 {f.name}
            </button>
            <button className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center justify-center" onClick={() => delFolder(f.id)}>×</button>
          </div>
        ))}
      </div>

      {/* 文件列表 */}
      {files.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          此文件夹为空，上传文件或移动文件到这里
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map(f => (
            <div key={f.id} className="card text-center group relative py-4">
              <button className="absolute top-1.5 right-1.5 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition" onClick={() => delFile(f.id)}>×</button>
              <a className="block" href={f.file_path} target="_blank" rel="noopener">
                <div className="text-3xl mb-2">📄</div>
                <div className="text-xs text-gray-700 dark:text-slate-300 line-clamp-2 mb-1">{f.filename}</div>
                <div className="text-[10px] text-gray-400">{f.created_at?.slice(0, 10)}</div>
              </a>
              {/* 移动到其他文件夹 */}
              {folders.length > 0 && (
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition">
                  <select className="text-[10px] border rounded px-1 py-0.5 dark:bg-slate-700 dark:border-slate-600" value="" onChange={e => {
                    if (e.target.value) moveFile(f.id, Number(e.target.value))
                  }}>
                    <option value="">移动到…</option>
                    <option value="0">根目录</option>
                    {folders.filter(x => x.id !== activeFolder).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新建文件夹弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">新建文件夹</h3>
            <input className="input mb-3" placeholder="文件夹名称" value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFolder()} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setShowAdd(false)}>取消</button>
              <button className="btn-primary" onClick={createFolder}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
