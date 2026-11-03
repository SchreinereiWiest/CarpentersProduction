import {
    FRONT_ATTACHMENT_TYPES,
    findFrontLegrabox,
    getDrawerProgramKeys,
    getFrontBoxPositionFromBottom,
    updateFrontAttachment
} from "@Engine/cabinet/sektions/front/frontAttachments.js";
import { findTreeNode } from "@Engine/shared/tree.js";
import { DEFAULT_CNC } from "@Engine/cabinet/cnc/cncDefaults.js";

export default function FrontAttachmentProperties({
    selectedElement,
    activeCabinet,
    updateActiveCabinet,
    setSelectedElement,
    cncConfig,
    viewMode
}) {
    if (
        !activeCabinet ||
        selectedElement?.type !== "front" ||
        !["front", "combined"].includes(viewMode)
    ) {
        return null;
    }

    const front = findTreeNode(activeCabinet.fronts ?? [], selectedElement.id) ?? selectedElement;
    const attachment = front.attachment ?? {};
    const type = attachment.type ?? FRONT_ATTACHMENT_TYPES.NONE;
    const legraboxMatch = findFrontLegrabox(activeCabinet, front);
    const fallback = cncConfig?.fronts?.drawer?.fallbackBoxPositionFromBottom ?? 59;
    const boxPosition = getFrontBoxPositionFromBottom({
        cabinet: activeCabinet,
        front,
        fallback
    });
    const drawerVariant = attachment.drawerVariant ??
        legraboxMatch?.func?.variant ??
        "M";
    const drawerConfig = {
        ...DEFAULT_CNC.fronts.drawer,
        ...(cncConfig?.cncDefault?.fronts?.drawer ?? cncConfig?.fronts?.drawer ?? {})
    };
    const drawerProgramKeys = getDrawerProgramKeys(drawerConfig);
    const selectedDrawerProgram = drawerProgramKeys.includes(String(drawerVariant).toUpperCase())
        ? String(drawerVariant).toUpperCase()
        : drawerProgramKeys[0] ?? "M";

    const updateAttachment = changes => {
        const fronts = updateFrontAttachment({
            cabinet: activeCabinet,
            frontId: front.id,
            changes,
            cncConfig
        });
        const updatedFront = findTreeNode(fronts, front.id);

        updateActiveCabinet({ fronts });
        if (updatedFront) {
            setSelectedElement({ ...updatedFront, type: "front" });
        }
    };

    const selectType = nextType => {
        const link = legraboxMatch
            ? {
                sectionId: legraboxMatch.section.id,
                functionId: legraboxMatch.func.id
            }
            : {};

        updateAttachment({
            type: nextType,
            ...(nextType === FRONT_ATTACHMENT_TYPES.DRAWER || nextType === FRONT_ATTACHMENT_TYPES.INSET_DRAWER
                ? link
                : {})
        });
    };

    return (
        <section className="mt-6 space-y-4">
            <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                    Frontbefestigung
                </div>
                <p className="mt-1 text-xs text-gray-500">
                    Das Bohrbild stammt aus CNC → Fronten; hier wird die Verwendung an dieser Front festgelegt.
                </p>
            </div>

            <label className="block">
                <span className="text-xs text-gray-400">Fronttyp</span>
                <select
                    aria-label="Fronttyp"
                    value={type}
                    onChange={event => selectType(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                >
                    <option value={FRONT_ATTACHMENT_TYPES.NONE}>Keine Befestigung</option>
                    <option value={FRONT_ATTACHMENT_TYPES.DRAWER}>Schublade</option>
                    <option value={FRONT_ATTACHMENT_TYPES.DOOR}>Tür</option>
                    <option value={FRONT_ATTACHMENT_TYPES.INSET_DRAWER}>Innenliegende Front</option>
                </select>
            </label>

            {(type === FRONT_ATTACHMENT_TYPES.DRAWER || type === FRONT_ATTACHMENT_TYPES.INSET_DRAWER) && (
                <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
                    <label className="block">
                        <span className="text-xs text-gray-400">Legrabox-Frontprogramm</span>
                        <select
                            aria-label="Legrabox-Frontprogramm"
                            value={selectedDrawerProgram}
                            onChange={event => updateAttachment({ drawerVariant: event.target.value })}
                            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                        >
                            {drawerProgramKeys.map(key => (
                                <option key={key} value={key}>{key}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="text-xs text-gray-400">
                            Legrabox-Position ab Frontunterkante
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                aria-label="Legrabox-Position ab Frontunterkante"
                                type="number"
                                min="0"
                                step="0.5"
                                value={boxPosition}
                                onChange={event => updateAttachment({
                                    boxPositionFromBottom: Math.max(0, Number(event.target.value) || 0)
                                })}
                                className="min-w-0 flex-1 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                            />
                            <span className="text-xs text-gray-500">mm</span>
                        </div>
                    </label>

                    <button
                        type="button"
                        disabled={!legraboxMatch}
                        onClick={() => updateAttachment({
                            boxPositionFromBottom: undefined,
                            sectionId: legraboxMatch?.section.id,
                            functionId: legraboxMatch?.func.id
                        })}
                        className="w-full rounded border border-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Automatisch aus Innenraum
                    </button>

                    <p className={`text-xs ${legraboxMatch ? "text-emerald-400" : "text-amber-400"}`}>
                        {legraboxMatch
                            ? `Mit Legrabox ${legraboxMatch.func.variant ?? "M"} verknüpft.`
                            : "Keine passende Legrabox in der überdeckten Sektion gefunden."}
                    </p>

                    {type === FRONT_ATTACHMENT_TYPES.INSET_DRAWER && (
                        <p className="text-xs text-gray-500">
                            Breite, Höhe und untere Lage folgen den Vorgaben des Standardkorpus in den Projekt-Settings.
                        </p>
                    )}
                </div>
            )}

            {type === FRONT_ATTACHMENT_TYPES.DOOR && (
                <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
                    <label className="block">
                        <span className="text-xs text-gray-400">Türanschlag</span>
                        <select
                            aria-label="Türanschlag"
                            value={attachment.hingeSide === "right" ? "right" : "left"}
                            onChange={event => updateAttachment({ hingeSide: event.target.value })}
                            className="mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                        >
                            <option value="left">Links</option>
                            <option value="right">Rechts</option>
                        </select>
                    </label>
                    <p className="text-xs text-gray-500">
                        Topfbohrungen werden in der Front erzeugt. Aktivierte Korpusbohrungen landen nur auf der gewählten Anschlagseite.
                    </p>
                </div>
            )}
        </section>
    );
}
