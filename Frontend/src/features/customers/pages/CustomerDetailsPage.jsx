import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import { formatGermanDate } from "../../../shared/utils/date.js";
import ProjectImportDialog from "../../projects/import/ProjectImportDialog.jsx";

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
  const [error, setError] = useState("");

  const loadProjects = async () => {
    const response = await axios.get(`/api/projects/getAll/${userid}`);
    setProjects(response.data.projects ?? []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      axios.get(`/api/customers/get/${userid}`),
      axios.get(`/api/projects/getAll/${userid}`)
    ]).then(([customerResponse, projectsResponse]) => {
      if (!active) return;
      setCustomer(customerResponse.data.customer);
      setProjects(projectsResponse.data.projects ?? []);
    }).catch(loadError => {
      console.error("Kontakt konnte nicht geladen werden:", loadError);
      if (active) setError("Die Kundendaten konnten nicht geladen werden.");
    });
    return () => { active = false; };
  }, [userid]);

  const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Kundendetails";

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
            <div className="flex flex-wrap gap-2">
              <Link to={`/Kontakte/info/${userid}/crm`} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500">CRM-Ansicht</Link>
              <Link to={`/Kontakte/edit/${userid}`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Bearbeiten</Link>
              <button type="button" onClick={() => setShowImport(true)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Projekt importieren</button>
              <Link to={`/Kontakte/NewProject/${userid}`} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500">+ Projekt</Link>
            </div>
          </header>

          {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</div>}

          <div className="mt-5 flex flex-col items-start gap-5 lg:flex-row">
            <aside className="w-full shrink-0 space-y-4 lg:w-80 xl:w-96">
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
            </aside>

            <section className="min-w-0 w-full flex-1 overflow-hidden rounded-xl border border-slate-800 bg-gray-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-5">
                <div><h2 className="font-semibold">Projekte</h2><p className="text-xs text-slate-500">{projects.length} dem Kunden zugeordnet</p></div>
              </div>
              {projects.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Noch keine Projekte vorhanden.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="responsive-card-table w-full table-fixed">
                    <thead><tr className="bg-gray-800"><th className="w-1/2 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Projekt</th><th className="w-1/4 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Start</th><th className="w-1/4 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">Status</th></tr></thead>
                    <tbody>
                      {projects.map(project => (
                        <tr key={project.id} onClick={() => navigate(`/Projects/${project.id}`)} className="cursor-pointer border-t border-slate-800 bg-gray-800 transition hover:bg-slate-700">
                          <td data-label="Projekt" className="px-5 py-4"><p className="font-medium">{project.title}</p><p className="mt-1 truncate text-xs text-slate-500">{project.description || "Keine Beschreibung"}</p></td>
                          <td data-label="Start" className="px-5 py-4 text-sm text-slate-300">{formatGermanDate(project.startDate)}</td>
                          <td data-label="Status" className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${project.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{project.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <ProjectImportDialog
        open={showImport}
        fixedCustomer={customer}
        onClose={() => setShowImport(false)}
        onImported={async projectId => {
          await loadProjects();
          setShowImport(false);
          navigate(`/Projects/${projectId}`);
        }}
      />
    </div>
  );
}
