import CrudPage from '../components/CrudPage'

export default function Inspiration() {
  return (
    <CrudPage
      resource="inspirations"
      title="灵感素材库"
      columns={[
        { key: 'kind', label: '类型', render: (v) => <span className="tag">{v}</span> },
        { key: 'title', label: '标题', render: (v) => <span className="font-medium text-gray-800">{v}</span> },
        { key: 'content', label: '内容', render: (v) => <span className="line-clamp-1 text-sm text-gray-500">{v}</span> },
        { key: 'link', label: '链接', render: (v) => v ? <a className="text-indigo-600 underline text-xs" href={v} target="_blank">{v.slice(0, 30)}</a> : '-' },
        { key: 'tags', label: '标签', render: (v) => v ? <span className="tag">{v}</span> : '-' }
      ]}
      fields={[
        { key: 'kind', label: '类型', options: ['图片', '网站', '想法', '创新点', '文艺', '金句', '段子', '音乐', '影视', '设计', '其他'], required: true },
        { key: 'title', label: '标题', required: true, full: true },
        { key: 'content', label: '内容描述', type: 'textarea', full: true },
        { key: 'image', label: '图片URL' },
        { key: 'link', label: '链接URL' },
        { key: 'tags', label: '标签（逗号分隔）' }
      ]}
    />
  )
}
