import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const config = {
  requests: { label: 'Requests', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Quote requests received per week. Drawn without animation. */
export default function RequestsChart({ data }: { data: { week: string; requests: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="requests"
          fill="var(--color-requests)"
          radius={2}
          maxBarSize={40}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
