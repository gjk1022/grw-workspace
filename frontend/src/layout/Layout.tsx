import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../lib/api'

type NavItem = {
  group: string
  items: { to: string; label: string; icon: string }[]
}

const nav: NavItem[] = [
  {
    group: '概览',
    items: [
      { to: '/dashboard', label: '仪表盘', icon: '🏠' }
    ]
  },
  {
    group: '核心',
    items: [
      { to: '/goals', label: '计划中心', icon: '🎯' },
      { to: '/calendar', label: '日历视图', icon: '📅' },
      { to: '/papers', label: '论文进度', icon: '📄' },
      { to: '/growth', label: '成长中心', icon: '📈' }
    ]
  },
  {
    group: '科研',
    items: [
      { to: '/notes', label: '文献阅读', icon: '📝' },
      { to: '/meetings', label: '组会纪要', icon: '🗒️' },
      { to: '/projects', label: '项目管理', icon: '🧪' },
      { to: '/experiments', label: '实验/模拟索引', icon: '🔬' },
      { to: '/advisor', label: '导师消息应答助手', icon: '💬' },
      { to: '/journal', label: '投稿择刊助手', icon: '🎓' }
    ]
  },
  {
    group: '生活',
    items: [
      { to: '/health', label: '健康打卡', icon: '💪' },
      { to: '/english', label: '英语学习', icon: '🔤' },
      { to: '/diary', label: '日记随笔', icon: '✏️' },
      { to: '/finance', label: '日常记账', icon: '💰' },
      { to: '/inspiration', label: '灵感素材库', icon: '✨' }
    ]
  },
  {
    group: '我的',
    items: [
      { to: '/files', label: '文件中心', icon: '📁' },
      { to: '/settings', label: '系统设置', icon: '⚙️' }
    ]
  }
]

export default function Layout() {
  const [me, setMe] = useState<any>({})
  const [lvl, setLvl] = useState<any>(null)
  const [time, setTime] = useState('')
  const location = useLocation()

  useEffect(() => {
    api.get('/me').then(r => setMe(r.data)).catch(() => {})
    api.get('/me/level').then(r => setLvl(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      const week = ['日','一','二','三','四','五','六'][d.getDay()]
      setTime(`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} 周${week}`)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-full">
      {/* 左侧深色侧边栏 */}
      <aside className="w-60 bg-gradient-to-b from-indigo-950 to-slate-900 text-slate-200 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">G</div>
            <div>
              <div className="font-semibold text-white text-sm">PHD Workbench</div>
              <div className="text-xs text-slate-400">Graduate Research Workspace</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs">{me.name?.[0] || '研'}</div>
            <div>
              <div className="text-sm font-medium">{me.name || '研究生'}</div>
              {me.stage && (
                <div className="text-[11px] text-slate-400">
                  {me.stage}
                  {me.enrollment_date && (
                    <span className="ml-1">
                      · 入学{Math.floor((Date.now() - new Date(me.enrollment_date).getTime()) / 86400000)}天
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {(me.school || me.department || me.major) && (
            <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
              {me.school && <div>🏫 {me.school}</div>}
              {me.department && <div>📚 {me.department}{me.major ? ` · ${me.major}` : ''}</div>}
            </div>
          )}
          {lvl && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="text-amber-300">{lvl.title}</span>
                  <span className="text-slate-500">Lv.{lvl.level}</span>
                </span>
                <span className="text-amber-300">{lvl.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${lvl.progress}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>距下一级：{lvl.next_level_exp} EXP</span>
                <span className="text-emerald-400">🔥 {lvl.streak_days} 连续记录</span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {nav.map(group => (
            <div key={group.group} className="px-3 mb-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 px-3 mb-1">{group.group}</div>
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-300 hover:bg-white/5'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 text-[11px] text-slate-500 border-t border-white/10">
          © 2026 GRW · 长期使用的科研OS
        </div>
      </aside>

      {/* 主区域 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center gap-4">
          <div className="text-sm text-gray-500 dark:text-slate-400">
            📅 {time}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-slate-500">{location.pathname}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-sm font-semibold">
              {me.name?.[0] || '研'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
