import { Bar, BarChart, type BarShapeProps, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { QuarterlyProgressViewModel } from '../../api/client'
import type { Scenario } from '../../components/ScenarioToggle'
import { hours, monthLabel } from '../../format'

type Month = QuarterlyProgressViewModel['months'][number]
/** Onde a barra Meta de cada mês ficou: base e escala (px por hora), para posicionar o esperado. */
type MetaGeometry = { x: number; baseline: number; pxPerHour: number }

/**
 * Meta × entregue ou previsto por mês (segue o botão Entregue / Previsto). No trimestre corrente, uma
 * linha tracejada no mês atual marca o esperado até hoje (100%), atravessando as barras do mês.
 */
export function QuarterBarsChart({ months, view }: { months: QuarterlyProgressViewModel['months']; view: Scenario }) {
  const current = months.find((m) => m.isCurrent)
  const data = months.map((m) => ({ ...m, label: monthLabel(m.month).split(' ')[0] }))

  // A barra Meta (desenhada primeiro) guarda a geometria; a última barra do mês atual desenha a linha
  // por cima de todas. Recalculado a cada render, então acompanha o redimensionamento.
  const meta = new Map<string, MetaGeometry>()
  const metaShape = (p: BarShapeProps) => {
    const m = p.payload as Month
    if (m.goalHours > 0) meta.set(m.month, { x: p.x ?? 0, baseline: (p.y ?? 0) + (p.height ?? 0), pxPerHour: (p.height ?? 0) / m.goalHours })
    return <Rectangle {...p} />
  }
  const expectedShape = (p: BarShapeProps) => {
    const m = p.payload as Month
    const g = meta.get(m.month)
    if (!m.isCurrent || !g || m.expectedHours <= 0) return <Rectangle {...p} />
    const y = g.baseline - m.expectedHours * g.pxPerHour
    const x2 = (p.x ?? 0) + (p.width ?? 0) + 6
    return (
      <g>
        <Rectangle {...p} />
        <line x1={g.x - 6} x2={x2} y1={y} y2={y} stroke="#1b1b1b" strokeWidth={2} strokeDasharray="6 4" />
        <text x={x2} y={y - 6} textAnchor="end" fontSize={11} fontWeight={600} fill="#1b1b1b" paintOrder="stroke" stroke="#f7f7f7" strokeWidth={3}>
          esperado hoje · {hours(m.expectedHours)}
        </text>
      </g>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={4}>
          <CartesianGrid stroke="#eee" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b6b6b' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} />
          {/* legenda e tooltip na ordem das barras (Meta, depois Entregue ou Previsto), não alfabética */}
          <Tooltip formatter={(v) => hours(Number(v))} itemSorter={() => 0} />
          <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
          <Bar dataKey="goalHours" name="Meta" fill="#d4d4d4" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={metaShape} />
          {view === 'forecast' ? (
            <Bar dataKey="forecastHours" name="Previsto" fill="#9fdcb2" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={expectedShape} />
          ) : (
            <Bar dataKey="doneHours" name="Entregue" fill="#1fa64a" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={expectedShape} />
          )}
        </BarChart>
      </ResponsiveContainer>
      {current && current.expectedHours > 0 && (
        <p className="small text-secondary text-center mb-0">
          <span className="fw-semibold text-dark">– – –</span> esperado até hoje em {monthLabel(current.month).split(' ')[0]?.toLowerCase()}{' '}
          (100%): {hours(current.expectedHours)}
        </p>
      )}
    </div>
  )
}
