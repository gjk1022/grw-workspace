/// <reference types="vite/client" />
import axios from 'axios'

const DEFAULT_BASE = window.location.hostname === 'localhost' ? '/api' : 'https://grw-workspace-production.up.railway.app/api'

/** 获取当前 API 地址：优先用户自定义，其次默认 */
function getBase() {
  try {
    const custom = localStorage.getItem('grw_api_base')
    if (custom) return custom
  } catch {}
  return DEFAULT_BASE
}

const api = axios.create({
  baseURL: getBase(),
  timeout: 30000
})

// 每次请求前重新读取自定义 API 地址，支持运行时更换
api.interceptors.request.use(config => {
  config.baseURL = getBase()
  return config
})

/** 奖励积分（静默调用，失败不报错） */
export function awardPoints(points: number) {
  if (points <= 0) return
  api.post('/growth/award', { points }).catch(() => {})
}

export default api
