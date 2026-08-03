import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import api from '../lib/api'

export default function Growth() {
  const [data, setData] = useState<any>({})

  useEffect(() => {
    api.get('/dashboard').then(r => {
      setData({
        radar: r.data.radar,
        points: r.data.points_week,
        papers: r.data.papers_count,
        lit: r.data.literatures_count
      })
    })
  }, [])

  const radarOption = {
    title: { text: '成长能力雷达', left: 'left', textStyle: { fontSize: 14 } },
    radar: { indicator: Object.keys(data.radar || {}).map(k => ({ name: k, max: 100 })) },
    series: [{
      type: 'radar',
      data: [{ value: Object.values(data.radar || {}), name: '能力',
        areaStyle: { color: 'rgba(99,102,241,0.3)' },
        lineStyle: { color: '#6366f1' } }]
    }]
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">成长中心</h1>
        <p className="text-sm text-gray-500 mt-1">基于多维度数据形成的个人成长画像</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="本周积分" value={data.points || 0} icon="⭐" color="from-amber-400 to-orange-500" />
        <Tile label="论文数量" value={data.papers || 0} icon="📄" color="from-indigo-400 to-violet-500" />
        <Tile label="文献阅读" value={data.lit || 0} icon="📚" color="from-sky-400 to-blue-500" />
        <Tile label="连续打卡" value="7" icon="🔥" color="from-rose-400 to-pink-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <ReactECharts option={radarOption} style={{ height: 360 }} />
        </div>

        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-800">积分来源</h3>
          {[
            { label: '阅读论文', value: 3, color: 'bg-indigo-500' },
            { label: '完成任务', value: 2, color: 'bg-emerald-500' },
            { label: '学习时间', value: 5, color: 'bg-amber-500' },
            { label: '写作记录', value: 1, color: 'bg-rose-500' }
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600">{r.label}</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${r.color}`} style={{ width: `${r.value * 15}%` }}/>
              </div>
              <div className="w-8 text-right text-sm font-semibold">+{r.value}</div>
            </div>
          ))}
          <div className="border-t pt-3 text-sm text-gray-500">连续打卡 + 1 天 · 长期坚持</div>
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, icon, color }: any) {
  return (
    <div className="card relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-10`} />
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
