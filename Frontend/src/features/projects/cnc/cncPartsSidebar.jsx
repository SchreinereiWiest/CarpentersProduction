export default function CncPartSidebar({
  groups,
  selectedGroupId,
  setSelectedGroupId,
  selectedPart,
  setSelectedPart
}) {

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-gray-700 bg-gray-900">

      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-gray-700 font-semibold">
        CNC Programme
      </div>

      <div className="p-2 space-y-1">

        {groups.map((group) => {

          const selected = group.id === selectedGroupId;

          return (
            <div
              key={group.id}
              className={`
                rounded border
                ${
                  selected
                    ? "border-blue-700 bg-gray-800"
                    : "border-gray-800 bg-gray-900"
                }
              `}
            >

              {/* Gruppe */}
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setSelectedPart(group.parts[0] ?? null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-800"
              >
                <div className="flex justify-between items-center gap-2">

                  <span className="text-sm text-gray-200 truncate">
                    {group.name}
                  </span>

                  <span className="text-xs text-gray-500 shrink-0">
                    {group.count ?? group.parts.length}×
                  </span>

                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {group.displayName}
                </div>

              </button>


              {/* Einzelne Bauteile */}
              {selected && (
                <div className="border-t border-gray-700 px-2 py-1">

                  {group.parts.map((part) => {

                    const partSelected =
                      selectedPart?.PID === part.PID;

                    const cabinetName =
                      part.cabinetName ||
                      part.korpusName ||
                      "";

                    const quantity =
                      Number(part.Anzahl) || 1;

                    return (
                      <button
                        key={part.PID}
                        type="button"
                        onClick={() => setSelectedPart(part)}
                        className={`
                          w-full
                          px-2
                          py-1.5
                          rounded
                          text-left
                          text-xs
                          ${
                            partSelected
                              ? "bg-blue-900 text-blue-200"
                              : "text-gray-400 hover:bg-gray-800"
                          }
                        `}
                      >

                        <div className="flex justify-between items-center gap-2">

                          <span className="truncate">
                            {part.Objektname || part.PID}
                          </span>

                          {quantity > 1 && (
                            <span className="text-gray-500 shrink-0">
                              {quantity}×
                            </span>
                          )}

                        </div>

                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {part.PID}
                          {cabinetName && (
                            <>
                              {" — "}
                              {cabinetName}
                            </>
                          )}
                        </div>

                      </button>
                    );
                  })}

                </div>
              )}

            </div>
          );
        })}

      </div>
    </aside>
  );
}