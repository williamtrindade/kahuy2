import { useCallback, useState } from 'react'
import { logout, UnauthorizedError } from './api/client'
import { Layout, type View } from './components/Layout'
import { LoginPage } from './features/auth/LoginPage'
import { MonthlyPage } from './features/monthly/MonthlyPage'
import { QuarterlyPage } from './features/quarterly/QuarterlyPage'

export function App() {
  const [authenticated, setAuthenticated] = useState(true)
  const [view, setView] = useState<View>('monthly')

  const onError = useCallback((err: unknown) => {
    if (err instanceof UnauthorizedError) setAuthenticated(false)
  }, [])

  if (!authenticated) return <LoginPage onSuccess={() => setAuthenticated(true)} />

  return (
    <Layout
      view={view}
      onNavigate={setView}
      onLogout={() => logout().finally(() => setAuthenticated(false))}
    >
      {view === 'monthly' ? <MonthlyPage onError={onError} /> : <QuarterlyPage onError={onError} />}
    </Layout>
  )
}
