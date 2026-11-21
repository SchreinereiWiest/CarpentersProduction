import { useEffect, useState } from "react";
import axios from "axios";

import { loadCompanySettings } from "../../../shared/settings/company-settings.js";
import { createDefaultDocumentLayout, normalizeDocumentLayout } from "../../commercial/document-layout/documentLayout.js";
import { COMMERCIAL_DOCUMENT_TYPES, commercialDocumentLabel } from "../../commercial/documentTypes.js";
import DocumentLayoutEditor from "./DocumentLayoutEditor.jsx";

const emptyEditor = () => ({ id: null, name: "Neue Belegvorlage", documentType: "quote", setAsDefault: true, layout: createDefaultDocumentLayout() });

export default function DocumentTemplateSettingsSection() {
  const [templates, setTemplates] = useState([]);
  const [editor, setEditor] = useState(emptyEditor);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    const response = await axios.get("/api/commercial/templates");
    setTemplates(response.data.templates || []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([axios.get("/api/commercial/templates"), loadCompanySettings()]).then(([response, company]) => {
      if (!active) return;
      setTemplates(response.data.templates || []);
      setLogoDataUrl(company.branding?.logoDataUrl || "");
    }).catch(() => active && setMessage({ type: "error", text: "Belegvorlagen oder Unternehmenslogo konnten nicht geladen werden." }));
    return () => { active = false; };
  }, []);

  const newTemplate = (documentType = "quote") => {
    setEditor({ ...emptyEditor(), documentType, name: `Neue Vorlage ${commercialDocumentLabel(documentType)}`, layout: createDefaultDocumentLayout() });
    setEditorOpen(true);
  };
  const editTemplate = template => {
    setEditor({ id: template.id, name: template.name, documentType: template.documentType, setAsDefault: template.isDefault, layout: normalizeDocumentLayout(template.analysis?.layout) });
    setEditorOpen(true);
  };

  const saveTemplate = async () => {
    if (!editor.name.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const payload = { name: editor.name.trim(), documentType: editor.documentType, setAsDefault: editor.setAsDefault, analysis: { version: 4, layout: editor.layout } };
      const response = editor.id ? await axios.put(`/api/commercial/templates/${editor.id}`, payload) : await axios.post("/api/commercial/templates", payload);
      await load();
      setEditor({ id: response.data.template.id, name: response.data.template.name, documentType: response.data.template.documentType, setAsDefault: response.data.template.isDefault, layout: normalizeDocumentLayout(response.data.template.analysis?.layout) });
      setMessage({ type: "success", text: `Vorlage „${response.data.template.name}“ gespeichert${response.data.template.isDefault ? " und als Standard festgelegt" : ""}.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Vorlage konnte nicht gespeichert werden." });
    } finally {
      setBusy(false);
    }
  };

  const changeDefault = async (type, templateId) => {
    setBusy(true);
    setMessage(null);
    try {
      if (templateId) await axios.put(`/api/commercial/templates/${templateId}/default`);
      else await axios.delete(`/api/commercial/templates/default/${type}`);
      await load();
      setMessage({ type: "success", text: templateId ? `Standard für ${commercialDocumentLabel(type)} gespeichert.` : `Für ${commercialDocumentLabel(type)} wird der freie Belegeditor verwendet.` });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Standardvorlage konnte nicht geändert werden." });
    } finally {
      setBusy(false);
    }
  };

  const removeTemplate = async template => {
    if (!globalThis.confirm?.(`Vorlage „${template.name}“ wirklich löschen?`)) return;
    setBusy(true);
    try {
      await axios.delete(`/api/commercial/templates/${template.id}`);
      await load();
      if (editor.id === template.id) { setEditor(emptyEditor()); setEditorOpen(false); }
      setMessage({ type: "success", text: "Vorlage gelöscht." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Vorlage konnte nicht gelöscht werden." });
    } finally {
      setBusy(false);
    }
  };

  const usableTemplates = templates.filter(template => template.analysis?.version === 4 && template.analysis?.layout?.objects?.length);

  return <div className="space-y-5">
    {message && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-800 bg-emerald-950/30 text-emerald-200" : "border-rose-800 bg-rose-950/30 text-rose-200"}`}>{message.text}</div>}
    <section className="rounded-xl border border-emerald-900/60 bg-gray-800 p-5">
      <div><div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Belegvorlagen</div><h2 className="mt-1 font-semibold">Standardvorlage je Belegart</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">Neue Belege verwenden automatisch die hier gewählte Vorlage. Ohne Standard bleibt der freie Belegeditor aktiv.</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{COMMERCIAL_DOCUMENT_TYPES.map(type => {
        const matching = usableTemplates.filter(template => template.documentType === type.value);
        const selected = matching.find(template => template.isDefault)?.id || "";
        return <div key={type.value} className="rounded-lg border border-gray-700 bg-gray-900 p-3"><label><span className="mb-1.5 block text-sm font-medium text-gray-300">{type.label}</span><select disabled={busy} value={selected} onChange={event => changeDefault(type.value, event.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2.5 text-sm"><option value="">Keine Standardvorlage</option>{matching.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><button type="button" onClick={() => newTemplate(type.value)} className="mt-2 text-xs text-sky-300 hover:text-sky-200">Neue {type.label}-Vorlage anlegen</button></div>;
      })}</div>
    </section>

    <section className="rounded-xl border border-gray-700 bg-gray-800 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Gespeicherte Vorlagen</h2><p className="mt-1 text-sm text-gray-500">Der Layouteditor öffnet sich ausschließlich im Vollbild.</p></div><button type="button" onClick={() => newTemplate()} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold hover:bg-sky-500">Vorlage erstellen</button></div>{usableTemplates.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-gray-700 p-5 text-center text-sm text-gray-500">Noch keine Vorlage angelegt.</div> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{usableTemplates.map(template => <div key={template.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900 p-3"><div className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-200">{template.name}</span><span className="mt-1 block text-xs text-gray-500">{commercialDocumentLabel(template.documentType)}{template.isDefault ? " · Standard" : ""}</span></div><div className="flex gap-1"><button type="button" onClick={() => editTemplate(template)} className="rounded border border-sky-800 px-2.5 py-1.5 text-xs text-sky-300 hover:bg-sky-950/50">Vorlage editieren</button><button type="button" aria-label={`${template.name} löschen`} onClick={() => removeTemplate(template)} className="rounded px-2 py-1 text-xs text-rose-300 hover:bg-rose-950/50">Löschen</button></div></div>)}</div>}</section>

    {editorOpen && <DocumentLayoutEditor
      value={editor.layout}
      onChange={layout => setEditor(current => ({ ...current, layout }))}
      logoDataUrl={logoDataUrl}
      templateName={editor.name}
      onTemplateNameChange={name => setEditor(current => ({ ...current, name }))}
      documentType={editor.documentType}
      onDocumentTypeChange={documentType => setEditor(current => ({ ...current, documentType }))}
      documentTypes={COMMERCIAL_DOCUMENT_TYPES}
      setAsDefault={editor.setAsDefault}
      onSetAsDefaultChange={setAsDefault => setEditor(current => ({ ...current, setAsDefault }))}
      onSave={saveTemplate}
      saving={busy}
      onClose={() => setEditorOpen(false)}
    />}
  </div>;
}
