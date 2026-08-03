import CrudPage from '../components/CrudPage'
import { awardPoints } from '../lib/api'

export default function Projects() {
  return (
    <CrudPage
      resource="projects"
      title="项目管理"
      pointsForNew={3}
      columns={[
        { key: 'name', label: '项目名称', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
        { key: 'start_date', label: '开始' },
        { key: 'end_date', label: '结束' },
        { key: 'progress', label: '进度', render: (v) => (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${v || 0}%` }}/>
            </div>
            <span className="text-xs text-gray-500">{v || 0}%</span>
          </div>
        )},
        { key: 'status', label: '状态', render: (v) => v === 'done' ? <span className="tag" style={{ background: '#d1fae5', color: '#047857' }}>已完成</span> : <span className="tag">进行中</span> }
      ]}
      fields={[
        { key: 'name', label: '项目名称', required: true, full: true },
        { key: 'description', label: '项目简介', type: 'textarea', full: true },
        { key: 'start_date', label: '开始时间', type: 'date' },
        { key: 'end_date', label: '结束时间', type: 'date' },
        { key: 'progress', label: '进度(%)', type: 'number' },
        { key: 'status', label: '状态', options: ['active', 'done', 'paused'] },
        { key: 'tasks', label: '任务列表', type: 'textarea', full: true },
        { key: 'files', label: '文件资料', type: 'textarea', full: true },
        { key: 'outcomes', label: '成果记录', type: 'textarea', full: true }
      ]}
    />
  )
}
