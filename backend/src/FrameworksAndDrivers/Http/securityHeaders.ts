// Sem imports de propósito: o frontend/vite.config.ts importa este arquivo para gerar o _headers
// do Pages com a mesma CSP da API.
export const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "frame-ancestors 'none'",
].join('; ')
