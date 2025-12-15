interface MiniActivityChartProps {
  data: number[];
  color?: string;
}

export default function MiniActivityChart({ data, color = '#666666' }: MiniActivityChartProps) {
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-[1px] h-3">
      {data.map((value, i) => {
        const height = max > 0 ? (value / max) * 100 : 0;
        return (
          <div
            key={i}
            className="w-[2px] bg-current transition-all"
            style={{
              height: `${Math.max(height, 2)}%`,
              opacity: 0.3 + (height / 100) * 0.7,
              color
            }}
          />
        );
      })}
    </div>
  );
}
