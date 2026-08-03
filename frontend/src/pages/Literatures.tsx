import CrudPage from '../components/CrudPage'

const STATUS = { unread: '未读', reading: '阅读中', completed: '已完成', important: '重点论文', cited: '已引用' }

export default function Literatures() {
  return (
    <CrudPage
      resource="literatures"
      title="文献库"
      columns={[
        { key: 'title', label: '标题', render: (v) => <span className="font-medium text-gray-800 line-clamp-1">{v}</span> },
        { key: 'authors', label: '作者', render: (v) => <span className="text-sm text-gray-500 line-clamp-1">{v}</span> },
        { key: 'source', label: '来源' },
        { key: 'year', label: '年份' },
        { key: 'tags', label: '标签', render: (v) => v ? <span className="tag">{v}</span> : '-' },
        { key: 'status', label: '状态', render: (v) => (
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: statusColor(v).bg, color: statusColor(v).color }}>
            {STATUS[v as keyof typeof STATUS] || v}
          </span>
        )}
      ]}
      fields={[
        { key: 'title', label: '论文标题', required: true, full: true },
        { key: 'authors', label: '作者', full: true },
        { key: 'source', label: '来源/期刊/会议' },
        { key: 'year', label: '年份' },
        { key: 'status', label: '阅读状态', options: Object.keys(STATUS) },
        { key: 'tags', label: '标签（逗号分隔）' },
        { key: 'cite', label: '引用信息' },
        { key: 'notes', label: '阅读笔记', type: 'textarea', full: true }
      ]}
    />
  )
}

function statusColor(s: string) {
  const map: any = {
    unread: { bg: '#f3f4f6', color: '#4b5563' },
    reading: { bg: '#fef3c7', color: '#a16207' },
    completed: { bg: '#d1fae5', color: '#047857' },
    important: { bg: '#fee2e2', color: '#b91c1c' },
    cited: { bg: '#ede9fe', color: '#6d28d9' }
  }
  return map[s] || map.unread
}
