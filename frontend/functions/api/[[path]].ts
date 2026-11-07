// Pages Function: repassa /api/* para o Worker da API (service binding `API`, ver wrangler.toml).
// A requisição segue intacta, com o cf-connecting-ip definido pela borda (rate limit do login).
type Fetcher = { fetch(request: Request): Promise<Response> }

export const onRequest = ({ request, env }: { request: Request; env: { API: Fetcher } }) =>
  env.API.fetch(request)
