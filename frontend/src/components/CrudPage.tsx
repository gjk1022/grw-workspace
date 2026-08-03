import { useState, useEffect } from 'react'
import api, { awardPoints } from '../lib/api'
import CrudForm from './CrudForm'

type Column = { key: string; label: string; render?: (v: any, r: any) => any; width?: string }
type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; full?: boolean }

export default function CrudPage({
  resource,
  title,
  columns,
  fields,
  pointsForNew
}: {
  resource: string
  title: string
  columns: Column[]
  fields: Field[]
  pointsForNew?: number
}) {
  const [list, setList] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await api.get(`/${resource}`)
    setList(r.data)
    setLoading(false)
  }
  useEffect(() => { load() }, [resource])

  const save = async (v: any) => {
    if (editing?.id) await api.put(`/${resource}/${editing.id}`, v)
    else { await api.post(`/${resource}`, v); if (pointsForNew) awardPoints(pointsForNew) }
    setShowForm(false); setEditing(null); load()
  }
  const del = async (id: number) => {
    if (!confirm('确认删除？')) return
    await api.delete(`/${resource}/${id}`)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">共 {list.length} 条记录</p>
        </div>
        <button
          className="btn-primary flex items-center gap-1"
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          <span>＋</span> 新建
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {columns.map(c => (
                <th key={c.key} className="py-2 pr-3" style={c.width ? { width: c.width } : {}}>{c.label}</th>
              ))}
              <th className="py-2 text-right w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length + 1} className="py-6 text-center text-gray-400">加载中…</td></tr>}
            {!loading && list.length === 0 && <tr><td colSpan={columns.length + 1} className="py-6 text-center text-gray-400">暂无数据，点击右上角新建</td></tr>}
            {list.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map(c => (
                  <td key={c.key} className="py-3 pr-3 align-top">
                    {c.render ? c.render(r[c.key], r) : (r[c.key] || '-')}
                  </td>
                ))}
                <td className="py-3 text-right whitespace-nowrap">
                  <button className="btn-ghost text-xs" onClick={() => { setEditing(r); setShowForm(true) }}>编辑</button>
                  <button className="btn-ghost text-xs text-rose-500" onClick={() => del(r.id)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editing ? '编辑' : '新建'} {title}</h2>
            <CrudForm fields={fields} initial={editing} onSubmit={save} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
