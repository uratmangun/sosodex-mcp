"use client";

type Point = { x: number; y: number };

function buildPoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
): Point[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  return values.map((value, index) => ({
    x:
      padding +
      (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW),
    y: padding + innerH - ((value - min) / span) * innerH,
  }));
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

type ChartVariant = "light" | "dark";

const chartTheme = {
  light: {
    label: "#0f172a",
    surface: "#f8fafc",
    muted: "#71717a",
  },
  dark: {
    label: "#f8fafc",
    surface: "#1e293b",
    muted: "#94a3b8",
  },
} as const;

export function MiniLineChart({
  values,
  width = 640,
  height = 220,
  stroke = "#dc2626",
  label,
  variant = "light",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  label?: string;
  variant?: ChartVariant;
}) {
  const theme = chartTheme[variant];
  const padding = 12;
  const points = buildPoints(values, width, height, padding);
  const path = pointsToPath(points);

  if (values.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: theme.muted }}>
        No chart data.
      </p>
    );
  }

  return (
    <div>
      {label ? (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "13px",
            fontWeight: 600,
            color: theme.label,
          }}
        >
          {label}
        </p>
      ) : null}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label ?? "Price chart"}
        style={{ display: "block", borderRadius: 8, background: theme.surface }}
      >
        <path
          d={`${path} L${points.at(-1)?.x ?? padding},${height - padding} L${padding},${height - padding} Z`}
          fill={`${stroke}22`}
          stroke="none"
        />
        <path d={path} fill="none" stroke={stroke} strokeWidth={2} />
      </svg>
    </div>
  );
}

export function MiniBarChart({
  values,
  labels,
  width = 640,
  height = 220,
  fill = "#dc2626",
  label,
  variant = "light",
}: {
  values: number[];
  labels?: string[];
  width?: number;
  height?: number;
  fill?: string;
  label?: string;
  variant?: ChartVariant;
}) {
  const theme = chartTheme[variant];

  if (values.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: theme.muted }}>
        No inflow data.
      </p>
    );
  }

  const padding = 16;
  const max = Math.max(...values.map(Math.abs), 1);
  const barW = (width - padding * 2) / values.length - 4;

  return (
    <div>
      {label ? (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "13px",
            fontWeight: 600,
            color: theme.label,
          }}
        >
          {label}
        </p>
      ) : null}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label ?? "Bar chart"}
        style={{ display: "block", borderRadius: 8, background: theme.surface }}
      >
        {values.map((value, index) => {
          const h = (Math.abs(value) / max) * (height - padding * 2);
          const x = padding + index * (barW + 4);
          const y = height - padding - h;
          const color = value >= 0 ? fill : "#64748b";
          return (
            <g key={index}>
              <rect x={x} y={y} width={barW} height={h} fill={color} rx={2} />
              {labels?.[index] ? (
                <title>{`${labels[index]}: ${value}`}</title>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
