import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { QuarterlyProgressViewModel } from '../../api/client'
import { hours, monthLabel } from '../../format'

/** A previsão só existe no trimestre corrente (nos outros é igual ao realizado): a barra some fora dele. */
export function QuarterBarsChart({ months }: { months: QuarterlyProgressViewModel['months'] }) {
  const showForecast = months.some((m) => m.isCurrent)
  const data = months.map((m) => ({
    ...m,
    label: monthLabel(m.month).split(' ')[0],
    forecastHours: m.isCurrent ? m.forecastHours : null,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={4}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b6b6b' }} />
        <YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} />
        <Tooltip formatter={(v) => hours(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="goalHours" name="Meta" fill="#d4d4d4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="doneHours" name="Realizado" fill="#1fa64a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        {showForecast && (
          <Bar dataKey="forecastHours" name="Previsão" fill="#9fdcb2" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
