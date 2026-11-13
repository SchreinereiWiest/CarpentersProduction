export default function CncCompensationLayer({ paths = [], selectedFace = "A" }) {
    return (
        <g pointerEvents="none">
            {paths.filter(path => path.face === selectedFace || path.face === "both").map(path => {
                if (path.type === "line") {
                    return <line key={path.id} x1={path.start.x} y1={path.start.y} x2={path.target.x} y2={path.target.y} stroke="#38bdf8" strokeWidth="2" opacity="0.95" />;
                }
                const startAngle = Math.atan2(path.start.y - path.center.y, path.start.x - path.center.x);
                const targetAngle = Math.atan2(path.target.y - path.center.y, path.target.x - path.center.x);
                const clockwise = path.direction !== "counterclockwise";
                let sweep = targetAngle - startAngle;
                if (clockwise) while (sweep <= 0) sweep += Math.PI * 2;
                else while (sweep >= 0) sweep -= Math.PI * 2;
                const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
                return <path key={path.id} d={`M ${path.start.x} ${path.start.y} A ${path.radius} ${path.radius} 0 ${largeArc} ${clockwise ? 1 : 0} ${path.target.x} ${path.target.y}`} fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.95" />;
            })}
        </g>
    );
}
