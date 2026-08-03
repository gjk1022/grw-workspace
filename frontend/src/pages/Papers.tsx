import CrudPage from '../components/CrudPage'

const STAGES = ['选题', '文献调研', '实验设计', '数据分析', '论文写作', '投稿', '审稿', '发表']

export default function Papers() {
  return (
    <CrudPage
      resource="papers"
      title="论文进度管理"
      columns={[
        { key: 'title', label: '论文标题', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
        { key: 'target_journal', label: '目标期刊' },
        { key: 'stage', label: '当前阶段', render: (v) => <span className="tag">{v}</span> },
        { key: 'progress', label: '完成度', render: (v) => (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${v || 0}%` }}/>
            </div>
            <span className="text-xs text-gray-500">{v || 0}%</span>
          </div>
        )},
        { key: 'modify_log', label: '最近修改', render: (v) => <span className="text-xs text-gray-500 line-clamp-1">{v}</span> }
      ]}
      fields={[
        { key: 'title', label: '论文标题', required: true, full: true },
        { key: 'target_journal', label: '目标期刊' },
        { key: 'stage', label: '当前阶段', options: STAGES, required: true },
        { key: 'progress', label: '完成度(%)', type: 'number' },
        { key: 'submission_date', label: '投稿时间', type: 'date' },
        { key: 'modify_log', label: '修改记录', type: 'textarea', full: true },
        { key: 'description', label: '论文简介', type: 'textarea', full: true }
      ]}
    />
  )
}
