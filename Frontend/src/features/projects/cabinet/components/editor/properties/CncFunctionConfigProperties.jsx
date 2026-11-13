import { useNavigate } from "react-router";
import {
    createCncProgramPreviewSvg,
    getCncProgramConfig,
    updateCncProgramConfig
} from "@Engine/cabinet/cnc/manualPrograms.js";

const PROFILE_LABELS = {
    "shelf.row": "Lochreihe",
    "drawer.legrabox": "Legrabox-Bohrbild",
    "connector.drill": "Bohrverbinder",
    "connector.screw": "Schraubverbinder",
    "back.groove": "Nutprogramm",
    "back.rabbet": "Fräs-/Falzprogramm",
    "front.drawerMount": "Schubkastenfront",
    "front.hingeCup": "Topfband",
    "front.hingeAuxiliary": "Topfband-Nebenbohrung",
    "cabinet.hingePlate": "Topfband-Montageplatte"
};

const editableFields = [
    ["diameter", "Durchmesser"],
    ["depth", "Tiefe"],
    ["spacing", "Raster"],
    ["width", "Nutbreite"]
];

const matchesScope = (entry, sectionId) => sectionId == null
    ? entry.scope === "global" || !entry.sectionId
    : String(entry.sectionId) === String(sectionId);

export default function CncFunctionConfigProperties({
    activeCabinet,
    updateActiveCabinet,
    projectId,
    sectionId = null
}) {
    const navigate = useNavigate();
    const config = getCncProgramConfig(activeCabinet);
    const profiles = (config?.recognizedProfiles ?? []).filter(entry => matchesScope(entry, sectionId));
    const customPrograms = (config?.customPrograms ?? []).filter(entry => matchesScope(entry, sectionId));

    const updateRegistry = updater => updateActiveCabinet(current => {
        const updated = updateCncProgramConfig(current, updater);
        return { functionConfig: updated.functionConfig };
    });

    const updateProfileField = (profileId, field, value) => updateRegistry(current => ({
        ...current,
        recognizedProfiles: (current.recognizedProfiles ?? []).map(profile => profile.id === profileId
            ? {
                ...profile,
                operations: (profile.operations ?? []).map(operation => Object.hasOwn(operation, field)
                    ? { ...operation, [field]: value }
                    : operation)
            }
            : profile)
    }));

    const removeProfile = profileId => updateRegistry(current => {
        const removed = (current.recognizedProfiles ?? []).find(profile => profile.id === profileId);
        const recognizedProfiles = (current.recognizedProfiles ?? []).filter(profile => profile.id !== profileId);
        const hasPartEntries = removed && (
            recognizedProfiles.some(profile => profile.partKey === removed.partKey) ||
            (current.customPrograms ?? []).some(program => program.partKey === removed.partKey)
        );
        return {
            ...current,
            recognizedProfiles,
            partOrders: hasPartEntries
                ? current.partOrders
                : (current.partOrders ?? []).filter(entry => entry.partKey !== removed?.partKey)
        };
    });

    const removeCustomPart = partKey => updateRegistry(current => {
        const customPrograms = (current.customPrograms ?? []).filter(program => program.partKey !== partKey);
        const hasRecognizedProfiles = (current.recognizedProfiles ?? []).some(profile => profile.partKey === partKey);
        return {
            ...current,
            customPrograms,
            partOrders: hasRecognizedProfiles
                ? current.partOrders
                : (current.partOrders ?? []).filter(entry => entry.partKey !== partKey)
        };
    });

    if (!profiles.length && !customPrograms.length) {
        return (
            <div className="mt-6 rounded-lg border border-dashed border-gray-700 p-4 text-sm text-gray-500">
                {sectionId == null
                    ? "Keine globalen CNC-Funktionskonfigurationen vorhanden."
                    : "Für diese Sektion sind keine zusätzlichen CNC-Konfigurationen gespeichert."}
            </div>
        );
    }

    return (
        <div className="mt-6 flex flex-col gap-5">
            {!!profiles.length && <section className="order-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Erkannte CNC-Profile</h3>
                <div className="mt-2 space-y-3">
                    {profiles.map(profile => {
                        const availableFields = editableFields.filter(([field]) => profile.operations?.some(operation => Object.hasOwn(operation, field)));
                        return <article key={profile.id} className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div><div className="text-sm font-medium text-emerald-200">{PROFILE_LABELS[profile.profileType] ?? profile.profileType}</div><div className="text-[11px] text-gray-500">{profile.partName} · {profile.suppressed ? "im CNC-Editor deaktiviert" : `${profile.operations?.length ?? 0} Bearbeitungen`}</div></div>
                                <button type="button" onClick={() => removeProfile(profile.id)} className="rounded px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-950/60">Standard verwenden</button>
                            </div>
                            {!!availableFields.length && <div className="mt-3 grid grid-cols-2 gap-2">{availableFields.map(([field, label]) => <label key={field}><span className="mb-1 block text-[10px] text-gray-500">{label}</span><input type="number" value={profile.operations.find(operation => Object.hasOwn(operation, field))?.[field] ?? ""} onChange={event => updateProfileField(profile.id, field, Number(event.target.value))} className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white" /></label>)}</div>}
                        </article>;
                    })}
                </div>
            </section>}

            {!!customPrograms.length && <section className="order-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Custom CNC-Programme</h3>
                <div className="mt-2 space-y-3">{customPrograms.map(program => <article key={program.id} className="overflow-hidden rounded-lg border border-blue-900 bg-blue-950/20">
                    <div className="aspect-[3/2] w-full bg-gray-950 p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: createCncProgramPreviewSvg({ L: program.dimensions?.x, B: program.dimensions?.y }, program.previewOperations ?? program.operations, program.toolDatabase) || program.previewSvg }} />
                    <div className="border-t border-gray-700 p-3">
                        <div className="text-sm font-medium text-blue-200">{program.partName}</div>
                        <div className="text-[11px] text-gray-500">{program.operations?.length ?? 0} Custom-Bearbeitungen · {program.dimensions?.x} × {program.dimensions?.y} mm</div>
                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => navigate(`/Projects/Cnc/${projectId}/Edit/${encodeURIComponent(program.partId)}?partKey=${encodeURIComponent(program.partKey)}&cabinetId=${encodeURIComponent(activeCabinet.id)}`)} className="flex-1 rounded bg-blue-700 px-3 py-2 text-xs text-white hover:bg-blue-600">Im CNC-Editor bearbeiten</button>
                            <button type="button" onClick={() => removeCustomPart(program.partKey)} className="rounded border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950/60">Komplett löschen</button>
                        </div>
                    </div>
                </article>)}</div>
            </section>}
        </div>
    );
}
