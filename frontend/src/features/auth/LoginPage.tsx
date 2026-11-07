import { type FormEvent, useState } from 'react'
import { login } from '../../api/client'

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap d-flex align-items-center justify-content-center bg-white px-3">
      <form className="w-100" style={{ maxWidth: 360 }} onSubmit={submit}>
        <div className="text-center mb-4">
          <img src="/logo.png" alt="Kahuy" width={72} height={72} style={{ objectFit: 'contain' }} />
          <h1 className="h4 mt-3 mb-1 fw-bold">kahuy</h1>
          <p className="text-secondary small mb-0">Suas horas, sua meta.</p>
        </div>
        <label htmlFor="password" className="form-label label">
          Senha
        </label>
        <input
          id="password"
          type="password"
          className={`form-control form-control-lg ${error ? 'is-invalid' : ''}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
        {error && <div className="invalid-feedback d-block">{error}</div>}
        <button type="submit" className="btn btn-primary btn-lg w-100 mt-3" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
