import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyProgressViewModel } from '../../api/client'
import { dayLabel, hours } from '../../format'

type Props = { data: MonthlyProgressViewModel['dailyCumulative']; today?: string }

// Uma linha ideal por faixa de GOAL_TIERS: a primeira é a meta, a segunda a supermeta.
const IDEAL_STYLES = [
  { name: 'Meta', stroke: '#1b1b1b', dash: '6 4' },
  { name: 'Supermeta', stroke: '#9a9a9a', dash: '2 3' },
]

/** O realizado para em `today` (mês corrente) ou some ('' = mês futuro); as linhas ideais vão até o fim. */
export function CumulativeChart({ data, today }: Props) {
  const tiers = data[0]?.ideal.map((i) => i.percent) ?? []
  const points = data.map((p) => ({
    date: p.date,
    doneHours: today !== undefined && p.date > today ? null : p.doneHours,
    ...Object.fromEntries(p.ideal.map((i) => [`ideal${i.percent}`, i.hours])),
  }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="#eee" vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fontSize: 12, fill: '#6b6b6b' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} />
        {/* legenda e tooltip na ordem das linhas (Realizado, Meta, Supermeta), não alfabética */}
        <Tooltip formatter={(v) => hours(Number(v))} labelFormatter={(l) => `Dia ${dayLabel(String(l))}`} itemSorter={() => 0} />
        <Legend wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
        <Line type="stepAfter" dataKey="doneHours" name="Realizado" stroke="#1fa64a" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        {tiers.map((percent, i) => {
          const style = IDEAL_STYLES[i] ?? { name: '', stroke: '#c4c4c4', dash: '2 3' }
          return (
            <Line
              key={percent}
              type="linear"
              dataKey={`ideal${percent}`}
              name={`${style.name ? `${style.name} ` : ''}(${percent}%)`}
              stroke={style.stroke}
              strokeDasharray={style.dash}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}
