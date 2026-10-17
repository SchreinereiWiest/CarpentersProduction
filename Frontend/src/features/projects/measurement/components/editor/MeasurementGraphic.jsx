import { rectangleFromPoints } from "../../domain/geometry.js";

const kindLabel = (kind) =>
  ({
    measurement: "Messung",
    angle: "Winkel",
    point: "Installation",
    cabinet: "Korpusverknüpfung"
  })[kind] ?? "Objekt";

export default function MeasurementGraphic({
  object,
  selected,
  onSelect,
  interactive = true,
  showObjectLabels = true
}) {
  const color = selected
    ? "#6eb4f1"
    : object.status === "measured"
      ? "#60c2a4"
      : "#e2ad61";
  const [start, end, third] = object.points ?? [];
  if (!start) return null;
  const selectObject = (event) => {
    if (!interactive) return;
    if (event.pointerType === "touch" || event.button === 0) return;
    event.stopPropagation();
    onSelect(object.id);
  };
  const objectPointerData = { "data-aufmas-object-id": object.id };

  if (object.kind === "point") {
    return (
      <g
        {...objectPointerData}
        onPointerDown={selectObject}
        pointerEvents={interactive ? "visiblePainted" : "none"}
        className={interactive ? "cursor-pointer" : undefined}
      >
        <circle
          cx={start.x}
          cy={start.y}
          r={selected ? 15 : 12}
          fill="#152331"
          stroke={color}
          strokeWidth="3"
        />
        <path
          d={`M ${start.x - 7} ${start.y} H ${start.x + 7} M ${start.x} ${start.y - 7} V ${start.y + 7}`}
          stroke={color}
          strokeWidth="2"
        />
        <circle cx={start.x} cy={start.y} r="3" fill={color} />
        {showObjectLabels && (
          <>
            <rect
              x={start.x + 17}
              y={start.y - 15}
              width={Math.max(92, (object.label?.length ?? 6) * 7.2)}
              height="29"
              rx="6"
              fill="#16222d"
              stroke={color}
              strokeWidth="1"
            />
            <text x={start.x + 27} y={start.y + 5} fill="#dce8f1" fontSize="14">
              {object.label || kindLabel(object.kind)}
            </text>
          </>
        )}
      </g>
    );
  }

  if (object.kind === "cabinet") {
    const rectangle = rectangleFromPoints(start, end);
    if (!rectangle) return null;
    const label = object.label || kindLabel(object.kind);
    const labelWidth = Math.max(116, label.length * 7.2 + 24);
    return (
      <g
        {...objectPointerData}
        onPointerDown={selectObject}
        pointerEvents={interactive ? "visiblePainted" : "none"}
        className={interactive ? "cursor-pointer" : undefined}
      >
        <rect
          x={rectangle.x}
          y={rectangle.y}
          width={rectangle.width}
          height={rectangle.height}
          rx="3"
          fill={color}
          fillOpacity={selected ? ".14" : ".07"}
          stroke={color}
          strokeWidth={selected ? 3 : 2}
          strokeDasharray="9 6"
          vectorEffect="non-scaling-stroke"
        />
        {showObjectLabels && (
          <g
            transform={`translate(${rectangle.x + 8} ${Math.max(8, rectangle.y + 8)})`}
          >
            <rect
              width={labelWidth}
              height="28"
              rx="5"
              fill="#16222d"
              stroke={color}
            />
            <text x="12" y="19" fill="#dce8f1" fontSize="13">
              {label}
            </text>
          </g>
        )}
      </g>
    );
  }

  if (!end) return null;
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  if (object.kind === "angle" && third) {
    return (
      <g
        {...objectPointerData}
        onPointerDown={selectObject}
        pointerEvents={interactive ? "visiblePainted" : "none"}
        className={interactive ? "cursor-pointer" : undefined}
      >
        <path
          d={`M ${end.x} ${end.y} L ${start.x} ${start.y} L ${third.x} ${third.y}`}
          fill="none"
          stroke={color}
          strokeWidth={selected ? 4 : 3}
        />
        <circle cx={start.x} cy={start.y} r="6" fill={color} />
        <rect
          x={start.x + 18}
          y={start.y - 31}
          width="78"
          height="30"
          rx="6"
          fill="#16222d"
          stroke={color}
        />
        <text
          x={start.x + 31}
          y={start.y - 11}
          fill="#eaf2f7"
          fontSize="15"
          fontWeight="600"
        >
          {object.value ? `${object.value}°` : "Winkel"}
        </text>
      </g>
    );
  }

  const label = object.value
    ? `${object.value} ${object.unit || "mm"}`
    : object.label || "Maß offen";
  const labelWidth = Math.max(84, label.length * 8.2 + 24);
  return (
    <g
      {...objectPointerData}
      onPointerDown={selectObject}
      pointerEvents={interactive ? "visiblePainted" : "none"}
      className={interactive ? "cursor-pointer" : undefined}
    >
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#0e171f"
        strokeWidth="11"
        opacity=".82"
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={selected ? 4 : 3}
      />
      <circle
        cx={start.x}
        cy={start.y}
        r="6"
        fill="#15202a"
        stroke={color}
        strokeWidth="3"
      />
      <circle
        cx={end.x}
        cy={end.y}
        r="6"
        fill="#15202a"
        stroke={color}
        strokeWidth="3"
      />
      <g transform={`translate(${middle.x - labelWidth / 2} ${middle.y - 17})`}>
        <rect
          width={labelWidth}
          height="34"
          rx="7"
          fill="#17232e"
          stroke={color}
        />
        <text
          x={labelWidth / 2}
          y="22"
          textAnchor="middle"
          fill="#f1f5f8"
          fontSize="14"
          fontWeight="600"
        >
          {label}
        </text>
      </g>
    </g>
  );
}
