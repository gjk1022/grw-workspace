import { useState } from 'react'
import api from '../lib/api'

// ===== 场景检测 =====
const SCENES: { key: string; label: string; icon: string; keywords: string[] }[] = [
  { key: 'task', label: '安排任务', icon: '📋', keywords: ['帮我', '你来做', '你做', '负责', '处理', '完成', '搞一下', '安排'] },
  { key: 'critic', label: '指出问题/批评', icon: '⚠️', keywords: ['不对', '有问题', '需要改', '不行', '错误', '重新', '修改', '改一下', '纠正'] },
  { key: 'progress', label: '询问进度', icon: '📊', keywords: ['怎么样', '做到哪', '进展', '进度', '完成没', '好了没', '情况', '到什么程度'] },
  { key: 'temp_ask', label: '临时提问', icon: '💬', keywords: ['在吗', '有空', '方便', '在不在', '忙不忙', '找你', '问一下', '问个事'] },
  { key: 'thanks', label: '表达感谢', icon: '🙏', keywords: ['谢谢', '辛苦', '感谢', '多谢', '费心', '麻烦你了'] },
  { key: 'errand', label: '布置杂事', icon: '🏃', keywords: ['取一下', '送一下', '帮忙', '帮我拿', '跑一趟', '打印', '交一下', '顺便'] },
  { key: 'delay', label: '请求延期', icon: '⏰', keywords: ['延期', '推迟', '晚一点', '来不及', '赶不上', 'deadline', '超时'] },
  { key: 'leave', label: '请假', icon: '🏥', keywords: ['请假', '休息', '病假', '事假', '不在', '外出'] },
  { key: 'unknown', label: '不知道的事', icon: '❓', keywords: ['知道吗', '了解吗', '听说过', '会不会', '懂不懂'] },
]

// ===== 话术库 =====
type Script = { text: string; safety: number }
const SCRIPT_BANK: Record<string, { tips: string[]; scripts: Script[] }> = {
  task: {
    tips: ['先确认收到，再给时间节点', '不懂就问，显得靠谱反而加分'],
    scripts: [
      { text: '好的老师，我马上安排处理。', safety: 1 },
      { text: '收到老师，我先梳理一下具体步骤，有疑问再向您请教！', safety: 1 },
      { text: '好的老师，我会在X号前完成，到时候发给您查看。', safety: 1 },
      { text: '老师，具体是哪个方向需要我处理呢？我确认后立刻开始。', safety: 2 },
    ]
  },
  critic: {
    tips: ['不要辩解，先认领问题', '表达会修正 + 以后注意'],
    scripts: [
      { text: '谢谢老师提醒，我马上修改调整。', safety: 1 },
      { text: '收到老师的建议，我仔细核对修改，避免再出现这类问题。', safety: 1 },
      { text: '抱歉老师，是我考虑不周，我立刻完善，后续会注意这点。', safety: 1 },
      { text: '好的老师，我把整个方案再过一遍，看看还有没有类似疏漏。', safety: 2 },
    ]
  },
  progress: {
    tips: ['有进度说进度，有问题说问题', '给预估完成时间'],
    scripts: [
      { text: '老师，目前进度到XX环节，预计X天能完成。', safety: 1 },
      { text: '正在推进中，遇到了XX小问题，我正在解决，完成后第一时间汇报。', safety: 1 },
      { text: '还差最后一步收尾，整理好就发给您，辛苦老师啦。', safety: 2 },
      { text: '老师，我把草稿先发给您看看，您有空帮我提提意见。', safety: 2 },
    ]
  },
  temp_ask: {
    tips: ['先表态度，再说安排', '短期迅速响应，长期有交代'],
    scripts: [
      { text: '在的，老师您请讲。', safety: 1 },
      { text: '老师，有新工作安排吗？如果急的话，我先把手头的工作放一放。', safety: 1 },
      { text: '方便的老师，我手头有一篇论文在整理，您这个大概需要多长时间？', safety: 2 },
    ]
  },
  thanks: {
    tips: ['谦虚回应，不邀功', '感谢指导重于感谢表态'],
    scripts: [
      { text: '老师您客气了。', safety: 1 },
      { text: '谢谢老师指点，辛苦您了。', safety: 1 },
      { text: '多亏老师耐心指导，我学到了很多。', safety: 2 },
    ]
  },
  errand: {
    tips: ['爽快答应，别墨迹'],
    scripts: [
      { text: '好的老师，我马上去。', safety: 1 },
      { text: '收到老师，我现在就去处理。', safety: 1 },
    ]
  },
  delay: {
    tips: ['给理由 + 给新时间 + 给保证'],
    scripts: [
      { text: '老师，由于XX原因，我可能无法在原定时间内完成任务。预计需要延期到XX日，我会加班加点确保质量，请您理解。', safety: 1 },
      { text: '老师，确实进度比预想的慢，主要是XX环节卡住了。我已经找到解决方案，预计XX日补上进度。', safety: 1 },
    ]
  },
  leave: {
    tips: ['给理由 + 不影响工作的保证'],
    scripts: [
      { text: '老师您好，我因为XX原因需要请假XX天，确保任务不会耽误。希望您能批准，谢谢。', safety: 1 },
      { text: '老师，我需要请假X天去XX，手上的实验/任务已经安排好，有急事可以电话联系我。', safety: 1 },
    ]
  },
  unknown: {
    tips: ['严禁说"我不知道"', '说"我确认后汇报"'],
    scripts: [
      { text: '老师，我详细了解一下，然后立刻向您汇报。', safety: 1 },
      { text: '这方面我了解得还不够深入，我查一下资料再回复您。', safety: 1 },
    ]
  },
}

// ===== 通用原则话术 =====
const UNIVERSAL: Script[] = [
  { text: '老师，以上我都说清楚了吗？', safety: 1 },
]
const PRINCIPLES = [
  { emoji: '👤', text: '任何回复必须带"老师"称谓' },
  { emoji: '🚫', text: '禁用：嗯嗯、哦哦、哈哈、行、晓得、OK、1、收到 等网络/口语用语' },
  { emoji: '📐', text: '回应公式：有回应 + 有行动 + 有交代' },
  { emoji: '🔑', text: '万能公式：礼貌开场 + 表明身份 + 表明来意 + 询问/求助 + 备选方案 + 感谢收尾' },
]

function detectScene(text: string): typeof SCENES[0] {
  for (const s of SCENES) {
    if (s.keywords.some(kw => text.includes(kw))) return s
  }
  return { key: 'general', label: '未识别', icon: '💬', keywords: [] }
}

export default function Advisor() {
  const [input, setInput] = useState('')
  const [scene, setScene] = useState<any>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [imageResult, setImageResult] = useState('')
  const [pasted, setPasted] = useState(false)

  const analyze = () => {
    if (!input.trim()) return
    const s = detectScene(input)
    setScene(s)
  }

  // 核心分析逻辑：接收 base64，调后端视觉分析
  const runAnalysis = async (base64: string) => {
    setImagePreview(base64)
    setAnalyzing(true)
    setImageResult('')
    try {
      const r = await api.post('/advisor/analyze-image', { image: base64 })
      if (r.data.ok) {
        setImageResult(r.data.analysis)
      } else {
        setImageResult('⚠️ ' + r.data.message)
      }
    } catch (err: any) {
      setImageResult('⚠️ 分析失败：' + (err.response?.data?.message || err.message || '网络错误'))
    }
    setAnalyzing(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await runAnalysis(reader.result as string)
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  // 粘贴截图（Ctrl+V）
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const reader = new FileReader()
          reader.onload = () => { setPasted(true); runAnalysis(reader.result as string) }
          reader.readAsDataURL(file)
          return
        }
      }
    }
  }

  const copyText = async (text: string, idx: number) => {
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  const bank = SCRIPT_BANK[scene?.key] || null
  const suggestions: Script[] = bank ? [...bank.scripts].sort((a, b) => a.safety - b.safety) : []

  return (
    <div className="space-y-5 max-w-4xl" onPaste={handlePaste}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">导师消息应答助手</h1>
        <p className="text-sm text-gray-500 mt-1">输入导师原话 → 场景自动识别 → 按安全程度给出话术建议</p>
      </div>

      {/* 话术核心原则 */}
      <div className="card bg-amber-50/50 dark:bg-amber-900/5 border-amber-200 dark:border-amber-800">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-2">📚 话术库核心原则</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-200">
              <span className="flex-shrink-0">{p.emoji}</span>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 截图分析区 */}
      <div className="card">
        <label className="label">📸 聊天记录截图分析</label>
        <p className="text-xs text-gray-400 mb-3">上传或直接 <kbd className="px-1 bg-gray-100 dark:bg-slate-600 rounded">Ctrl+V</kbd> 粘贴截图，AI 自动提取文字并给出回复建议（需先在设置页配置支持视觉的 AI）</p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 btn-primary cursor-pointer">
            <span>{analyzing ? '分析中…' : '🖼 上传截图'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={analyzing} />
          </label>
          <span className="text-xs text-gray-400">或在本页任意位置按 Ctrl+V 粘贴截图</span>
          {pasted && <span className="text-xs text-emerald-500">✓ 已从剪贴板读取</span>}
        </div>
        {imagePreview && (
          <div className="mt-3 flex gap-3">
            <img src={imagePreview} alt="截图预览" className="max-h-48 rounded-lg border border-gray-200 dark:border-slate-600" />
          </div>
        )}
        {imageResult && (
          <div className="mt-3 bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400 font-medium">🤖 分析结果</div>
              <button className="text-xs text-indigo-500 hover:text-indigo-600" onClick={() => copyText(imageResult, 999)}>
                {copied === 999 ? '已复制 ✓' : '复制全部'}
              </button>
            </div>
            <div className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{imageResult}</div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="card">
        <label className="label">导师原话</label>
        <textarea className="input min-h-[80px]" placeholder='例如："这周实验怎么样了""这个图不对，重新画一下"'
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze() } }} />
        <div className="mt-3 flex items-center gap-2">
          <button className="btn-primary flex items-center gap-1" onClick={analyze}>🔍 识别场景并生成话术</button>
          <span className="text-xs text-gray-400">支持回车快捷分析</span>
        </div>
      </div>

      {/* 场景识别结果 */}
      {scene && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{scene.icon}</span>
            <span className="font-semibold text-gray-800 dark:text-slate-100">
              检测场景：{scene.label}
            </span>
            {scene.key !== 'general' && bank?.tips && (
              <span className="text-xs text-gray-400 ml-2">{bank.tips.join(' · ')}</span>
            )}
          </div>

          {scene.key === 'general' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">未匹配到特定场景，这里是一些通用话术：</p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-2">🧩 万能公式模板</div>
                <div className="space-y-2">
                  {UNIVERSAL.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-slate-200">{s.text}</span>
                      <button className="btn-primary text-xs py-1 px-3" onClick={() => copyText(s.text, i + 100)}>
                        {copied === i + 100 ? '已复制 ✓' : '复制'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                建议使用万能公式：礼貌开场 + 表明身份 + 表明来意 + 询问/求助 + 备选方案 + 感谢收尾
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  s.safety === 1 ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-gray-50 dark:bg-slate-700'
                }`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {s.safety === 1 && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">最稳妥</span>}
                    <span className="text-sm text-gray-700 dark:text-slate-200">{s.text}</span>
                  </div>
                  <button className="btn-primary text-xs py-1 px-3 flex-shrink-0 ml-2" onClick={() => copyText(s.text, i)}>
                    {copied === i ? '已复制 ✓' : '复制'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
