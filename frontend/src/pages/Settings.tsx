import { useEffect, useState } from 'react'
import { useTheme, Theme } from '../lib/ThemeContext'
import api from '../lib/api'

const THEME_PRESETS: { key: Theme; label: string; icon: string; desc: string }[] = [
  { key: 'light', label: '纯白浅色', icon: '☀️', desc: '干净明亮' },
  { key: 'dark', label: '深夜模式', icon: '🌙', desc: '护眼暗色' },
  { key: 'lake', label: '湖水蓝', icon: '🌊', desc: 'ins风浅蓝' },
  { key: 'ocean', label: '深海蓝', icon: '🐋', desc: '冷静专注' },
  { key: 'forest', label: '森林绿', icon: '🌿', desc: '清新自然' },
  { key: 'warm', label: '拿铁暖', icon: '☕', desc: '温暖放松' },
]

const STAGES = ['研一', '研二', '研三', '博一', '博二', '博三', '博四及以上', '已毕业']

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [me, setMe] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/me').then(r => setMe(r.data)).catch(() => {})
    setLastSync(localStorage.getItem('grw_last_sync') || '')
  }, [])

  // 云端备份
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState('')
  const CLOUD = 'https://grw-workspace-production.up.railway.app/api'

  const doSync = async () => {
    setSyncing(true)
    try {
      // 1. 导出本地数据
      const localR = await api.get('/export', { params: { format: 'json' } })
      const localData = localR.data.data

      // 2. 检测云端状态
      let cloudOk = false
      try { const r = await fetch(`${CLOUD}/dashboard`); cloudOk = r.ok } catch {}

      // 3. 上传到云端
      if (cloudOk) {
        await fetch(`${CLOUD.replace('/api','')}/api/import`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: localData })
        }).then(r => { if (!r.ok) throw new Error('云端拒绝') })
        const now = new Date().toLocaleString('zh-CN', { hour12: false })
        setLastSync(now); localStorage.setItem('grw_last_sync', now)
        alert('✅ 数据已备份到云端')
      } else {
        // 云端不可达 → 降级为本地下载
        const blob = new Blob([JSON.stringify(localData, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `grw-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(a.href)
        alert('⚠️ 云端不可达，已降级为本地下载')
      }
    } catch (e: any) {
      alert('备份失败：' + e.message)
    }
    setSyncing(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.target as HTMLFormElement)
    const payload: any = { name: fd.get('name') as string, stage: fd.get('stage') as string,
      school: fd.get('school') || '', department: fd.get('department') || '', major: fd.get('major') || '',
      enrollment_date: fd.get('enrollment_date') || '2026-09-01',
      semester_start: fd.get('semester_start') || '2026-09-01' }
    await api.put('/me', payload)
    setMe({ ...me, ...payload })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">系统设置</h1>

      {/* 个人信息 */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4">个人信息</h3>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">用户名</label>
            <input name="name" className="input" defaultValue={me.name || '研究生'} required />
          </div>
          <div>
            <label className="label">学习阶段</label>
            <select name="stage" className="input" defaultValue={me.stage || '研一'}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">学校</label>
              <input name="school" className="input" defaultValue={me.school || ''} placeholder="如：清华大学" />
            </div>
            <div>
              <label className="label">院系</label>
              <input name="department" className="input" defaultValue={me.department || ''} placeholder="如：计算机系" />
            </div>
            <div>
              <label className="label">专业</label>
              <input name="major" className="input" defaultValue={me.major || ''} placeholder="如：人工智能" />
            </div>
          </div>
          <div>
            <label className="label">入学日期（计算入学天数用）</label>
            <input name="enrollment_date" type="date" className="input" defaultValue={me.enrollment_date || '2026-09-01'} />
          </div>
          <div>
            <label className="label">本学期开始日期（计算第几周用）</label>
            <input name="semester_start" type="date" className="input" defaultValue={me.semester_start || '2026-09-01'} />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">
              {saved ? '✅ 已保存' : '修改后需手动保存'}
            </span>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '保存中…' : '保存个人信息'}
            </button>
          </div>
        </form>
      </div>

      {/* 外观 */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">🎨 主题配色</h3>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {THEME_PRESETS.map(p => (
            <button key={p.key} onClick={() => setTheme(p.key)}
              className={`p-3 rounded-xl text-center transition border-2 ${
                theme === p.key ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-600 hover:border-blue-200'
              }`}>
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-slate-300">{p.label}</div>
              <div className="text-[10px] text-gray-400">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* AI 配置 */}
      <AIConfigSection />

      {/* 数据同步 — 云端 */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white opacity-10" />
        <div className="absolute right-12 bottom-4 w-20 h-20 rounded-full bg-white opacity-5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">☁️</span>
            <h3 className="font-bold text-lg">数据同步</h3>
          </div>
          <p className="text-sm text-white/80 mb-4">将你的记录同步到云端，在其他设备上继续使用。</p>
          <button className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            disabled={syncing} onClick={doSync}>
            {syncing ? <><span className="animate-spin">⟳</span> 同步中…</> : '☁️ 立即同步'}
          </button>
          <div className="text-xs text-white/70 mt-3">上次同步：{lastSync || '从未同步'}</div>
        </div>
      </div>

      <div className="card space-y-3">
        <Item label="数据存储" value="本地 SQLite (grw.db)" />
        <Item label="后端服务" value="http://localhost:8000" />
        <Item label="前端服务" value="http://localhost:5173" />
        <Item label="关于" value="硕博成长工作台 v1.0.0 — 长期使用的个人科研OS" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100">开发提示</h3>
        <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 leading-7">
          本项目可作为个人长期使用的科研操作系统雏形。
          后续可扩展：知识图谱、移动端、PWA 离线、云端同步、协同分享。
          AI 模块当前使用本地示例回复，可在 backend/app.py 中替换 <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">ai_advisor_reply</code> / <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">ai_journal_reply</code> 为调用真实大模型 API（如 OpenAI / 通义千问 / DeepSeek 等）。
        </p>
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 last:border-0 pb-2 last:pb-0">
      <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{value}</span>
    </div>
  )
}

// ===== AI 配置卡片 =====
function AIConfigSection() {
  const [cfg, setCfg] = useState<any>(null)
  const [presets, setPresets] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const provider = cfg?.provider || 'local'
  const models = presets[provider]?.models || []

  useEffect(() => {
    Promise.all([
      api.get('/ai/config').then(r => setCfg(r.data)),
      api.get('/ai/presets').then(r => setPresets(r.data))
    ]).catch(() => {})
  }, [])

  const update = (k: string, v: string) => {
    setCfg((prev: any) => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    await api.put('/ai/config', {
      provider: cfg.provider,
      model: cfg.model,
      base_url: cfg.base_url,
      api_key: cfg.api_key === '***' ? '***' : (cfg.api_key || '')
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4">AI 接口配置</h3>
      <div className="space-y-3">
        {/* 提供商选择 */}
        <div>
          <label className="label">AI 提供商</label>
          <select className="input" value={provider} onChange={e => {
            const p = e.target.value
            const info = presets[p] || {}
            update('provider', p)
            update('base_url', info.base_url || '')
            update('model', info.models?.[0] || '')
          }}>
            {Object.entries(presets).map(([k, v]: any) => (
              <option key={k} value={k}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* 模型选择 */}
        <div>
          <label className="label">模型</label>
          {provider === 'custom' ? (
            <input className="input" value={cfg?.model || ''} onChange={e => update('model', e.target.value)} placeholder="输入模型名" />
          ) : (
            <select className="input" value={cfg?.model || ''} onChange={e => update('model', e.target.value)}>
              {models.map((m: string) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        {/* API 地址 */}
        <div>
          <label className="label">API 地址</label>
          <input className="input" value={cfg?.base_url || ''} onChange={e => update('base_url', e.target.value)} placeholder={provider === 'local' ? '本地无需配置' : 'https://api.xxx.com/v1'} disabled={provider === 'local'} />
        </div>

        {/* API Key */}
        <div>
          <label className="label">API Key {provider !== 'local' && <span className="text-rose-500">*</span>}</label>
          <input className="input" type="password" value={cfg?.api_key || ''} onChange={e => update('api_key', e.target.value)} placeholder={provider === 'local' ? '本地无需配置' : 'sk-...'} disabled={provider === 'local'} />
          <div className="text-xs text-gray-400 mt-1">
            {provider === 'local' ? '使用本地示例回复，无需 API Key' : 'Key 仅在本地存储，不会泄露'}
          </div>
        </div>

        {/* 保存 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400">{saved ? '✅ 已保存' : provider === 'local' ? '当前使用本地示例模型' : '配置后点击保存'}</span>
          <button className="btn-primary text-sm" onClick={save} disabled={saving}>{saving ? '保存中…' : '保存配置'}</button>
        </div>
      </div>

      {/* 数据导出 */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">💾 数据导入导出</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary text-sm" onClick={async () => { const r = await api.get('/export', { params: { format: 'json' } }); const b = new Blob([JSON.stringify(r.data.data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `grw-backup-${new Date().toISOString().slice(0,10)}.json`; a.click() }}>导出 JSON</button>
          <button className="btn-ghost text-sm border" onClick={async () => { const r = await api.get('/export', { params: { format: 'md' } }); const b = new Blob([r.data.content], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `grw-backup-${new Date().toISOString().slice(0,10)}.md`; a.click() }}>导出 Markdown</button>
          <label className="btn-ghost text-sm border cursor-pointer">
            📥 导入 JSON
            <input type="file" accept=".json" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const text = await file.text()
              try { const json = JSON.parse(text); const r = await api.post('/import', { data: json.data || json }); alert(`导入成功！${r.data.imported} 条数据已恢复。`); window.location.reload() }
              catch (err: any) { alert('导入失败：' + (err.response?.data?.detail || err.message || '文件格式错误')) }
            }} />
          </label>
          <label className="btn-ghost text-sm border cursor-pointer">
            📄 导入 Markdown
            <input type="file" accept=".md" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const text = await file.text()
              try { const r = await api.post('/import', { content: text }); alert(`导入成功！${r.data.imported} 条数据已恢复。`); window.location.reload() }
              catch (err: any) { alert('导入失败：' + (err.response?.data?.detail || err.message || '文件格式错误')) }
            }} />
          </label>
        </div>
        <div className="text-xs text-gray-400 mt-2">导出全部数据表用于备份，导入 JSON 文件恢复数据（⚠ 会覆盖现有数据）</div>
      </div>

      {/* 个性化设置 */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">⚙️ 个性化设置</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">连续不运动几天开始提醒</label>
            <input type="number" min={1} max={14} className="input" defaultValue={3}
              onChange={async e => { const v = Number(e.target.value); if (v > 0) await api.put('/me/settings', { exercise_warn_days: v }) }} />
            <div className="text-xs text-gray-400 mt-1">默认 3 天</div>
          </div>
          <div>
            <label className="label">连续情绪不佳几天开始提醒</label>
            <input type="number" min={1} max={14} className="input" defaultValue={3}
              onChange={async e => { const v = Number(e.target.value); if (v > 0) await api.put('/me/settings', { mood_warn_days: v }) }} />
            <div className="text-xs text-gray-400 mt-1">默认 3 天</div>
          </div>
        </div>
      </div>
    </div>
  )
}
