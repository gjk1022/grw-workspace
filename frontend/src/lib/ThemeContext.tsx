import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'lake' | 'light' | 'dark' | 'ocean' | 'forest' | 'warm'

const THEMES: Theme[] = ['lake', 'light', 'dark', 'ocean', 'forest', 'warm']

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'lake', toggle: () => {}, setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('grw-theme') as Theme) || 'lake'
  })

  useEffect(() => {
    document.documentElement.classList.remove(...THEMES)
    document.documentElement.classList.add(theme)
    localStorage.setItem('grw-theme', theme)
  }, [theme])

  const toggle = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
