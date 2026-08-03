import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : 'http://localhost:8000/api',
  timeout: 15000
})

/** 奖励积分（静默调用，失败不报错） */
export function awardPoints(points: number) {
  if (points <= 0) return
  api.post('/growth/award', { points }).catch(() => {})
}

export default api
