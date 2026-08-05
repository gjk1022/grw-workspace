import axios from 'axios'

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? '/api' : 'https://grw-workspace-production.up.railway.app/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000
})

/** 奖励积分（静默调用，失败不报错） */
export function awardPoints(points: number) {
  if (points <= 0) return
  api.post('/growth/award', { points }).catch(() => {})
}

export default api
