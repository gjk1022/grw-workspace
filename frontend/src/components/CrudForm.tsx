import { useState } from 'react'

type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[]; full?: boolean }

export default function CrudForm({
  fields,
  initial,
  onSubmit,
  onCancel,
  submitText = '保存'
}: {
  fields: Field[]
  initial?: any
  onSubmit: (v: any) => void
  onCancel: () => void
  submitText?: string
}) {
  const [v, setV] = useState<any>(initial || {})
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'col-span-2' : ''}>
            <label className="label">
              {f.label}{f.required && <span className="text-rose-500">*</span>}
            </label>
            {f.options ? (
              <select
                className="input"
                value={v[f.key] ?? ''}
                onChange={e => setV({ ...v, [f.key]: e.target.value })}
              >
                <option value="">请选择</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                className="input min-h-[90px]"
                value={v[f.key] ?? ''}
                onChange={e => setV({ ...v, [f.key]: e.target.value })}
              />
            ) : (
              <input
                type={f.type || 'text'}
                className="input"
                value={v[f.key] ?? ''}
                onChange={e => setV({ ...v, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={() => onSubmit(v)}>{submitText}</button>
      </div>
    </div>
  )
}
