import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import ProjectImportDialog from "../../projects/import/ProjectImportDialog.jsx";
import PaperlessDocumentViewer from "../../../shared/components/PaperlessDocumentViewer.jsx";
import CommercialDocumentModal from "../../commercial/CommercialDocumentModal.jsx";
import { deleteCommission, loadCustomerCommercial } from "../../commercial/commercialApi.js";
import { CommercialDocumentsSection, CommissionSection, CustomerProjectsList } from "../components/CustomerCommercialSections.jsx";

const Detail = ({ label, children }) => (
  <div>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-slate-200">{children || "—"}</dd>
  </div>
);

export default function CustomerDetailsPage() {
  const { userid } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [viewingPaperless, setViewingPaperless] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [commissionSelectionMode, setCommissionSelectionMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [documentModalTarget, setDocumentModalTarget] = useState(null);
  const [error, setError] = useState("");

  const loadRelatedData = async () => {
    const [projectsResponse, commercial] = await Promise.all([
      axios.get(`/api/projects/getAll/${userid}`),
      loadCustomerCommercial(userid)
    ]);
    setProjects(projectsResponse.data.projects ?? []);
    setCommissions(commercial.commissions);
    setDocuments(commercial.documents);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      axios.get(`/api/customers/get/${userid}`),
      axios.get(`/api/projects/getAll/${userid}`),
      loadCustomerCommercial(userid)
    ]).then(([customerResponse, projectsResponse, commercial]) => {
      if (!active) return;
      setCustomer(customerResponse.data.customer);
      setProjects(projectsResponse.data.projects ?? []);
      setCommissions(commercial.commissions);
      setDocuments(commercial.documents);
    }).catch(loadError => {
      console.error("Kontakt konnte nicht geladen werden:", loadError);
      if (active) setError("Die Kundendaten konnten nicht geladen werden.");
    });
    return () => { active = false; };
  }, [userid]);

  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kundendetails";
  const startCommissionSelection = () => {
    setSelectedProjectIds([]);
    setCommissionSelectionMode(true);
    requestAnimationFrame(() => document.querySelector('[data-tour="contact-detail-projects"]')?.scrollIntoView?.({ behavior: "smooth", block: "center" }));
  };
  const stopCommissionSelection = () => {
    setCommissionSelectionMode(false);
    setSelectedProjectIds([]);
  };
  const toggleProjectSelection = projectId => setSelectedProjectIds(current => current.includes(projectId) ? current.filter(id => id !== projectId) : [...current, projectId]);
  const removeCommission = async commission => {
    if (!window.confirm(`Kommission „${commission.title}“ auflösen? Die Projekte bleiben bestehen.`)) return;
    await deleteCommission(commission.id);
    await loadRelatedData();
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-gray-900 text-white">
      <SideBar selected={5} />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link to="/Kontakte" className="text-sm text-sky-400 hover:text-sky-300">← Alle Kunden</Link>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{customerName}</h1>
              <p className="mt-1 text-sm text-slate-400">{customer?.companyName || "Privatkunde"}</p>
            </div>
            <div data-tour="contact-detail-actions" className="flex flex-wrap gap-2">
              <Link data-tour-contact-crm-route={`/Kontakte/info/${userid}/crm`} to={`/Kontakte/info/${userid}/crm`} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500">CRM-Ansicht</Link>
              <Link to={`/Kontakte/edit/${userid}`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Bearbeiten</Link>
              <button type="button" onClick={() => setShowImport(true)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Projekt importieren</button>
              <Link to={`/Kontakte/NewProject/${userid}`} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">+ Projekt</Link>
            </div>
          </header>

          {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</div>}

          <div className="mt-5 flex flex-col items-start gap-5 lg:flex-row">
            <aside data-tour="contact-detail-data" className="w-full shrink-0 space-y-4 lg:w-80 xl:w-96">
              <section className="rounded-xl border border-slate-800 bg-gray-800 p-4">
                <div className="flex items-center justify-between"><h2 className="font-semibold">Kontakt</h2><span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">{customer?.customerStatus || "active"}</span></div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Detail label="E-Mail">{customer?.email ? <a href={`mailto:${customer.email}`} className="text-sky-400">{customer.email}</a> : null}</Detail>
                  <Detail label="Kontaktweg">{customer?.preferredContact}</Detail>
                  <Detail label="Mobil">{customer?.phoneMobile ? <a href={`tel:${customer.phoneMobile}`} className="text-sky-400">{customer.phoneMobile}</a> : null}</Detail>
                  <Detail label="Festnetz">{customer?.phoneLandline ? <a href={`tel:${customer.phoneLandline}`} className="text-sky-400">{customer.phoneLandline}</a> : null}</Detail>
                  <Detail label="Quelle">{customer?.source}</Detail>
                  <Detail label="Bewertung">{customer ? `${customer.customerRating ?? 0} / 5` : null}</Detail>
                  <Detail label="Newsletter">{customer ? (customer.newsletterOptIn ? "Ja" : "Nein") : null}</Detail>
                </dl>
              </section>

              <section className="rounded-xl border border-slate-800 bg-gray-800 p-4">
                <h2 className="font-semibold">Adressen</h2>
                <div className="mt-3 space-y-4">
                  {(customer?.addresses ?? []).length === 0 && <p className="text-sm text-slate-500">Keine Adresse hinterlegt.</p>}
                  {(customer?.addresses ?? []).map(address => (
                    <address key={address.id} className="not-italic text-sm text-slate-300">
                      <p>{address.street} {address.houseNumber}</p>
                      <p>{address.postalCode} {address.city}</p>
                      <p>{address.country}</p>
                      {(address.floor || address.parkingInfo) && <p className="mt-1 text-xs text-slate-500">{address.floor && `Etage ${address.floor}`}{address.floor && address.parkingInfo ? " · " : ""}{address.parkingInfo}</p>}
                    </address>
                  ))}
                </div>
              </section>

              {(customer?.paperlessDocuments ?? []).length > 0 && <section className="rounded-xl border border-violet-900/60 bg-gray-800 p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-violet-200">Paperless-Dokumente</h2><span className="text-xs text-slate-500">{customer.paperlessDocuments.length}</span></div><div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">{customer.paperlessDocuments.map(document => <button key={document.id} type="button" onClick={() => setViewingPaperless(document)} className="flex w-full items-center gap-3 rounded-lg bg-gray-900 p-2 text-left hover:bg-slate-700"><img src={`/api/paperless/documents/${document.id}/thumbnail?v=2`} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded bg-slate-950 object-contain"/><span className="min-w-0"><span className="block truncate text-sm text-sky-300">{document.title}</span><span className="block truncate text-xs text-slate-500">{document.documentType || document.originalFileName || "Paperless-Dokument"}</span></span></button>)}</div></section>}
            </aside>

            <CustomerProjectsList projects={projects} commissions={commissions} selectionMode={commissionSelectionMode} selectedProjectIds={selectedProjectIds} onToggleProject={toggleProjectSelection} onOpenDocument={setDocumentModalTarget} onRemoveCommission={removeCommission} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <CommissionSection customerId={userid} projects={projects} commissions={commissions} selectionMode={commissionSelectionMode} selectedProjectIds={selectedProjectIds} onStart={startCommissionSelection} onCancel={stopCommissionSelection} onFinished={async () => { await loadRelatedData(); stopCommissionSelection(); }} />
            <CommercialDocumentsSection documents={documents} onAddDocument={() => setDocumentModalTarget({ type: "free", label: "Freier Kundenbeleg" })} />
          </div>
        </div>
      </main>

      <ProjectImportDialog
        open={showImport}
        fixedCustomer={customer}
        onClose={() => setShowImport(false)}
        onImported={async projectId => {
          await loadRelatedData();
          setShowImport(false);
          navigate(`/Projects/${projectId}`);
        }}
      />
      {viewingPaperless && <PaperlessDocumentViewer document={viewingPaperless} onClose={() => setViewingPaperless(null)} />}
      {documentModalTarget && <CommercialDocumentModal customerId={userid} target={documentModalTarget} projects={projects} commissions={commissions} documents={documents} onClose={() => setDocumentModalTarget(null)} />}
    </div>
  );
}
