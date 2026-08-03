import CrudPage from '../components/CrudPage'

export default function Meetings() {
  return (
    <CrudPage
      resource="meetings"
      title="组会纪要"
      columns={[
        { key: 'meeting_time', label: '时间' },
        { key: 'topic', label: '主题', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
        { key: 'advisor_opinion', label: '导师意见', render: (v) => <span className="text-sm text-gray-500 line-clamp-1">{v}</span> },
        { key: 'todos', label: '待办', render: (v) => <span className="text-sm text-gray-500 line-clamp-1">{v}</span> }
      ]}
      fields={[
        { key: 'meeting_time', label: '会议时间', type: 'datetime-local' },
        { key: 'topic', label: '会议主题', required: true, full: true },
        { key: 'content', label: '讨论内容', type: 'textarea', full: true },
        { key: 'advisor_opinion', label: '导师意见', type: 'textarea', full: true },
        { key: 'todos', label: '待完成任务', type: 'textarea', full: true },
        { key: 'next_plan', label: '下一步计划', type: 'textarea', full: true }
      ]}
    />
  )
}
