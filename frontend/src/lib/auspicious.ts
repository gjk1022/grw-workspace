// 投稿择吉计算器 — 天干地支 / 五行 / 十二建除 / 生肖冲合 / 时辰 / 方位

const HS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const EB = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

// 五行对应
const STEM_WX: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' }
const BRANCH_WX: Record<string, string> = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' }

// 十二时辰
const SHI_CHEN = ['子时 23-01', '丑时 01-03', '寅时 03-05', '卯时 05-07', '辰时 07-09', '巳时 09-11', '午时 11-13', '未时 13-15', '申时 15-17', '酉时 17-19', '戌时 19-21', '亥时 21-23']

// 吉利方位
const DIRECTION_WX: Record<string, string> = { '木': '东', '火': '南', '土': '中', '金': '西', '水': '北' }

// 十二建除
const JZ = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']
const JZ_YI: Record<string, string[]> = {
  '建': ['出行', '祈福'], '除': ['求医', '沐浴'], '满': ['祭祀'],
  '平': ['嫁娶'], '定': ['签约', '入学', '投稿'],
  '执': ['捕捉'], '破': ['拆卸'], '危': ['登高'],
  '成': ['开市', '签约', '投稿'], '收': ['纳财'],
  '开': ['开工', '投稿', '签约'], '闭': []
}
const JZ_JI: Record<string, string[]> = {
  '建': ['动土'], '除': ['嫁娶', '签约'], '满': ['开市'],
  '平': ['安葬', '出行'], '定': ['开市'], '执': ['嫁娶'],
  '破': ['嫁娶', '开市', '签约', '投稿'], '危': ['嫁娶', '出行'],
  '成': [], '收': ['开市'], '开': [], '闭': ['开市', '出行', '投稿']
}

const LIUHE: Record<string, string> = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' }
const LIUCHONG: Record<string, string> = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' }

const WX_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
const WX_KE: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

const ref1900 = new Date(1900, 0, 1)
function dayGZ(d: Date) {
  const days = Math.floor((d.getTime() - ref1900.getTime()) / 86400000)
  return { stem: HS[((days % 10) + 10) % 10], branch: EB[((days % 12) + 12) % 12] }
}
function jzOf(d: Date) { const days = Math.floor((d.getTime() - ref1900.getTime()) / 86400000); return JZ[((days % 12) + 12) % 12] }
function yearBranch(y: number) { return EB[(y - 4) % 12] }
function yearZodiac(y: number) { return ZODIAC[(y - 4) % 12] }

export interface AuspiciousResult {
  date: string; score: number; level: string; jianzhu: string; gz: string
  reasons: string[]; taboos: string[]
  bestHour: string; direction: string
}

function dayWX(d: Date) {
  const gz = dayGZ(d)
  return { stemWx: STEM_WX[gz.stem], branchWx: BRANCH_WX[gz.branch] }
}

function scoreDate(target: Date, birth: Date): AuspiciousResult {
  const reasons: string[] = [], taboos: string[] = []
  let score = 60
  const tGZ = dayGZ(target), bGZ = dayGZ(birth)
  const jz = jzOf(target)

  // 十二建除
  if (JZ_YI[jz].includes('投稿')) { score += 20; reasons.push(`${jz}日：传统宜投稿`) }
  else if (JZ_JI[jz].includes('投稿')) { score -= 25; taboos.push(`${jz}日：传统忌投稿`) }
  else { reasons.push(`${jz}日：平常日`) }

  // 六合
  if (LIUHE[tGZ.branch] === bGZ.branch) { score += 15; reasons.push(`与生日地支${bGZ.branch}六合，气场和顺`) }
  // 六冲
  if (LIUCHONG[tGZ.branch] === bGZ.branch) { score -= 25; taboos.push(`与生日地支${bGZ.branch}相冲，注意避让`) }

  // 五行匹配：日主五行生助则加分
  const birthWx = BRANCH_WX[bGZ.branch]
  const targetWx = dayWX(target)
  if (WX_SHENG[targetWx.stemWx] === birthWx || targetWx.stemWx === birthWx) { score += 8; reasons.push(`日五行${targetWx.stemWx}与喜用神${birthWx}相生`) }
  if (WX_KE[targetWx.stemWx] === birthWx) { score -= 8; taboos.push(`日五行${targetWx.stemWx}克喜用神${birthWx}`) }

  // 周末
  const dow = target.getDay()
  if (dow === 0 || dow === 6) { score -= 10; taboos.push('周末，编辑部可能处理较慢') }
  else { score += 5; reasons.push('工作日，编辑处理高效') }

  // 月初
  if (target.getDate() <= 5) { score += 5; reasons.push('月初，编辑部节奏平稳') }

  // 吉时：与日支六合的时辰
  const heHour = LIUHE[tGZ.branch]
  const heIdx = EB.indexOf(heHour)
  const bestHour = heIdx >= 0 ? SHI_CHEN[heIdx] : SHI_CHEN[0]

  // 方位：日天干五行对应方位
  const dirWx = STEM_WX[tGZ.stem]
  const direction = DIRECTION_WX[dirWx] || '东'

  let level = '中'
  if (score >= 95) level = '大吉'
  else if (score >= 85) level = '吉'
  else if (score >= 70) level = '中'
  else if (score >= 55) level = '小凶'
  else level = '凶'

  return { date: target.toISOString().slice(0, 10), score, level, jianzhu: jz, gz: tGZ.stem + tGZ.branch, reasons, taboos, bestHour, direction }
}

export function calcAllDates(birth: string, daysAhead = 60): AuspiciousResult[] {
  if (!birth) return []
  const b = new Date(birth), today = new Date(); today.setHours(0, 0, 0, 0)
  const results: AuspiciousResult[] = []
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    results.push(scoreDate(d, b))
  }
  return results
}

export function getTopDates(birth: string, count = 5, daysAhead = 60): AuspiciousResult[] {
  return calcAllDates(birth, daysAhead)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}

export function getAvoidDates(all: AuspiciousResult[]): AuspiciousResult[] {
  return all.filter(d => d.level === '凶' || d.level === '小凶')
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
}

export function getGoodDates(all: AuspiciousResult[]): AuspiciousResult[] {
  return all.filter(d => d.level === '大吉' || d.level === '吉')
}

export const PAPER_TYPES = [
  '原创研究 (Research Article)',
  '综述 (Review)',
  '快报 (Letter/Communication)',
  '案例 (Case Study)',
  '学位论文相关',
  '会议扩展 (Conference Extended)',
  '方法学 (Methods)',
  '数据论文 (Data Paper)',
  '观点评论 (Perspective/Opinion)',
  '预印本投稿 (Preprint)',
  '修改重投 (Revision)',
  '期刊转投 (Transfer)',
]
export const TIPS = ['投稿前完整阅读目标期刊近 3 期 author guidelines', '预留 1-2 周返修时间，避免撞节假日', '避免在期刊主编更替 / 重大公告前后投稿', '论文查重通过后再选日期']
