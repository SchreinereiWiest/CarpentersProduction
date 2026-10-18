import {
  DEFAULT_LIGHT_DIRECTION,
  DEFAULT_LIGHT_STRENGTH
} from "./lightingConfig.js";

export default function LightSettingsPanel({
  direction,
  strength,
  onDirectionChange,
  onStrengthChange
}) {
  return (
    <div
      className="absolute right-4 top-4 w-56 rounded-xl border border-[#3a4b5b] bg-[#131c24]/95 p-3 text-xs text-[#9aabb9] shadow-xl backdrop-blur-sm"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium text-[#e6edf3]">Lichteinstellungen</p>
        <button
          type="button"
          className="rounded px-1.5 py-1 text-[11px] text-[#77a8d8] transition hover:bg-[#263746] hover:text-[#a9cff1]"
          onClick={() => {
            onDirectionChange(DEFAULT_LIGHT_DIRECTION);
            onStrengthChange(DEFAULT_LIGHT_STRENGTH);
          }}
        >
          Zurücksetzen
        </button>
      </div>
      <label className="block">
        <span className="mb-1.5 flex justify-between">
          <span>Richtung</span>
          <span className="tabular-nums text-[#dbe5ee]">{direction}°</span>
        </span>
        <input
          type="range"
          min="-180"
          max="180"
          step="1"
          value={direction}
          aria-label="Lichtrichtung"
          className="h-1.5 w-full cursor-pointer accent-[#77a8d8]"
          onChange={(event) => onDirectionChange(Number(event.target.value))}
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 flex justify-between">
          <span>Stärke</span>
          <span className="tabular-nums text-[#dbe5ee]">
            {strength.toFixed(1)}
          </span>
        </span>
        <input
          type="range"
          min="0.2"
          max="5"
          step="0.1"
          value={strength}
          aria-label="Lichtstärke"
          className="h-1.5 w-full cursor-pointer accent-[#77a8d8]"
          onChange={(event) => onStrengthChange(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
