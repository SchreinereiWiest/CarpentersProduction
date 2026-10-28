import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import SideBar from "../../../shared/components/sideBar.jsx";
import { formatGermanDate } from "../../../shared/utils/date.js";
import { AppointmentForm, CommunicationForm } from "../crm/CustomerCrmForms.jsx";
import {
  createCustomerAppointment,
  createCustomerCommunication,
  deleteCustomerAppointment,
  deleteCustomerCommunication,
  loadCustomerCrm,
  updateCustomerAppointment
} from "../crm/customerCrmApi.js";
import {
  actorDisplayName,
  appointmentStatusLabels,
  calendarTypeLabels,
  communicationLabels,
  customerDisplayName,
  formatCurrency,
  formatDateTime
} from "../crm/customerCrmUtils.js";

const statusClasses = {
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-amber-500/15 text-amber-300",
  archive: "bg-slate-600 text-slate-300",
  planned: "bg-sky-500/15 text-sky-300",
  completed: "bg-emerald-500/15 text-emerald-300",
  cancelled: "bg-rose-500/15 text-rose-300"
};

const EMPTY_LIST = [];

const StatusBadge = ({ value, label }) => (
  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClasses[value] ?? "bg-slate-700 text-slate-300"}`}>
    {label ?? value ?? "—"}
  </span>
);

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">{children}</div>
);

export default function CustomerCrmPage() {
  const { userid } = useParams();
  const [crm, setCrm] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [referenceTime] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const next = await loadCustomerCrm(userid);
    setCrm(next);
    return next;
  }, [userid]);

  useEffect(() => {
    const controller = new AbortController();
    loadCustomerCrm(userid, { signal: controller.signal })
      .then(setCrm)
      .catch(loadError => {
        if (loadError.code !== "ERR_CANCELED") setError("Die CRM-Daten konnten nicht geladen werden.");
      });
    return () => controller.abort();
  }, [userid]);

  const customer = crm?.customer;
  const projects = customer?.projects ?? EMPTY_LIST;
  const communications = customer?.communications ?? EMPTY_LIST;
  const appointments = customer?.appointments ?? EMPTY_LIST;
  const calendarEvents = crm?.calendarEvents ?? EMPTY_LIST;

  const summary = useMemo(() => {
    const scheduled = [
      ...appointments.filter(item => item.status === "planned").map(item => ({ startAt: item.startAt })),
      ...calendarEvents.map(item => ({ startAt: item.startAt }))
    ].filter(item => new Date(item.startAt).getTime() >= referenceTime)
      .sort((first, second) => new Date(first.startAt) - new Date(second.startAt));
    return {
      activeProjects: projects.filter(project => project.status === "active").length,
      projectValue: projects.reduce((sum, project) => sum + Number(project.finalValue ?? project.estimatedValue ?? 0), 0),
      nextAppointment: scheduled[0]?.startAt ?? null,
      lastContact: communications[0]?.createdAt ?? null
    };
  }, [appointments, calendarEvents, communications, projects, referenceTime]);

  const runMutation = async operation => {
    setBusy(true);
    setError("");
    try {
      await operation();
      await refresh();
      setForm(null);
    } catch (mutationError) {
      setError(mutationError?.response?.data?.message || mutationError?.response?.data?.error || mutationError.message);
      throw mutationError;
    } finally {
      setBusy(false);
    }
  };

  const removeCommunication = async communication => {
    if (!window.confirm("Diesen Kontakteintrag wirklich löschen?")) return;
    try {
      await runMutation(() => deleteCustomerCommunication(userid, communication.id));
    } catch {
      // Die globale Fehlermeldung wurde bereits gesetzt.
    }
  };

  const removeAppointment = async appointment => {
    if (!window.confirm("Diesen Kundentermin wirklich löschen?")) return;
    try {
      await runMutation(() => deleteCustomerAppointment(userid, appointment.id));
    } catch {
      // Die globale Fehlermeldung wurde bereits gesetzt.
    }
  };

  const setAppointmentStatus = async (appointment, status) => {
    try {
      await runMutation(() => updateCustomerAppointment(userid, appointment.id, { status }));
    } catch {
      // Die globale Fehlermeldung wurde bereits gesetzt.
    }
  };

  if (!crm && !error) {
    return <div className="flex h-dvh bg-slate-950 text-white"><SideBar selected={5} /><main className="grid flex-1 place-items-center text-slate-400">CRM wird geladen…</main></div>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950 text-white">
      <SideBar selected={5} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to={`/Kontakte/info/${userid}`} className="text-sm text-sky-400 hover:text-sky-300">← Zur Kundenübersicht</Link>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold sm:text-3xl">CRM · {customerDisplayName(customer)}</h1>
                {customer && <StatusBadge value={customer.customerStatus} label={customer.customerStatus === "inactive" ? "Inaktiv" : "Aktiv"} />}
              </div>
              <p className="mt-1 text-sm text-slate-400">Kontakte, Termine, Projekte und Kundenhistorie an einem Ort</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/Kontakte/edit/${userid}`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Stammdaten bearbeiten</Link>
              <button type="button" onClick={() => setForm(form === "communication" ? null : "communication")} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500">+ Kontakt</button>
              <button type="button" onClick={() => setForm(form === "appointment" ? null : "appointment")} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">+ Termin</button>
            </div>
          </header>

          {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-300">{error}</div>}

          {form && customer && (
            <div className="mt-5">
              {form === "communication" ? (
                <CommunicationForm
                  projects={projects}
                  busy={busy}
                  onCancel={() => setForm(null)}
                  onSubmit={payload => runMutation(() => createCustomerCommunication(userid, payload))}
                />
              ) : (
                <AppointmentForm
                  projects={projects}
                  addresses={customer.addresses ?? []}
                  busy={busy}
                  onCancel={() => setForm(null)}
                  onSubmit={payload => runMutation(() => createCustomerAppointment(userid, payload))}
                />
              )}
            </div>
          )}

          {customer && (
            <>
              <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Aktive Projekte", summary.activeProjects],
                  ["Projektvolumen", formatCurrency(summary.projectValue)],
                  ["Nächster Termin", formatDateTime(summary.nextAppointment)],
                  ["Letzter Kontakt", formatDateTime(summary.lastContact)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-100">{value}</p>
                  </div>
                ))}
              </section>

              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <div className="space-y-5">
                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div><h2 className="font-semibold">Kontaktverlauf</h2><p className="text-xs text-slate-500">Telefonie, E-Mail, Schriftverkehr und Notizen</p></div>
                      <span className="text-xs text-slate-500">{communications.length} Einträge</span>
                    </div>
                    <div className="space-y-3">
                      {communications.length === 0 && <EmptyState>Noch keine Kundenkontakte erfasst.</EmptyState>}
                      {communications.map(communication => (
                        <article key={communication.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-300">{communicationLabels[communication.type] ?? communication.type}</span>
                                <h3 className="font-medium">{communication.subject || "Ohne Betreff"}</h3>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{formatDateTime(communication.createdAt)} · {actorDisplayName(communication.createdBy)}{communication.project ? ` · ${communication.project.title}` : ""}</p>
                            </div>
                            <button type="button" disabled={busy} onClick={() => removeCommunication(communication)} className="text-xs text-rose-400 hover:text-rose-300">Löschen</button>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{communication.content}</p>
                          {communication.followUpDate && <p className="mt-3 text-xs font-medium text-amber-300">Wiedervorlage: {formatDateTime(communication.followUpDate)}</p>}
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div><h2 className="font-semibold">Termine & Kalender</h2><p className="text-xs text-slate-500">Kundentermine und automatisch verknüpfte Projektplanung</p></div>
                      <Link to="/Calendar" className="text-xs text-sky-400 hover:text-sky-300">Kalender öffnen</Link>
                    </div>
                    <div className="space-y-3">
                      {appointments.length === 0 && calendarEvents.length === 0 && <EmptyState>Noch keine Termine vorhanden.</EmptyState>}
                      {appointments.map(appointment => (
                        <article key={`appointment-${appointment.id}`} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2"><StatusBadge value={appointment.status} label={appointmentStatusLabels[appointment.status]} /><h3 className="font-medium">{appointment.title}</h3></div>
                              <p className="mt-1 text-xs text-slate-400">{formatDateTime(appointment.startAt)} – {formatDateTime(appointment.endAt)}</p>
                              {appointment.project && <p className="mt-1 text-xs text-slate-500">Projekt: {appointment.project.title}</p>}
                            </div>
                            <div className="flex gap-2 text-xs">
                              {appointment.status === "planned" && <button type="button" onClick={() => setAppointmentStatus(appointment, "completed")} className="text-emerald-400">Erledigt</button>}
                              {appointment.status === "planned" && <button type="button" onClick={() => setAppointmentStatus(appointment, "cancelled")} className="text-amber-400">Absagen</button>}
                              <button type="button" onClick={() => removeAppointment(appointment)} className="text-rose-400">Löschen</button>
                            </div>
                          </div>
                          {appointment.description && <p className="mt-2 text-sm text-slate-300">{appointment.description}</p>}
                        </article>
                      ))}
                      {calendarEvents.map(event => (
                        <article key={`calendar-${event.id}`} className="rounded-lg border border-sky-900/70 bg-sky-950/20 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2"><span className="rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-300">Kalender · {calendarTypeLabels[event.type] ?? event.type}</span><h3 className="font-medium">{event.title}</h3></div>
                              <p className="mt-1 text-xs text-slate-400">{formatDateTime(event.startAt)} – {formatDateTime(event.endAt)} · {event.project.title}</p>
                            </div>
                            <Link to={`/Calendar?date=${encodeURIComponent(event.startAt)}&view=day`} className="text-xs text-sky-400">Anzeigen</Link>
                          </div>
                          {event.description && <p className="mt-2 text-sm text-slate-300">{event.description}</p>}
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Projekte</h2><span className="text-xs text-slate-500">{projects.length} gesamt</span></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {projects.length === 0 && <div className="md:col-span-2"><EmptyState>Keine Projekte zugeordnet.</EmptyState></div>}
                      {projects.map(project => (
                        <Link key={project.id} to={`/Projects/${project.id}`} className="rounded-lg border border-slate-700 bg-slate-800/60 p-4 transition hover:border-slate-600 hover:bg-slate-800">
                          <div className="flex items-start justify-between gap-3"><h3 className="font-medium">{project.title}</h3><StatusBadge value={project.status} label={project.status} /></div>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{project.description || "Keine Projektbeschreibung"}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <span>Start: {formatGermanDate(project.startDate)}</span>
                            <span>Montage: {formatGermanDate(project.installationDate)}</span>
                            <span>Wert: {formatCurrency(project.finalValue ?? project.estimatedValue)}</span>
                            <span>{project._count?.files ?? 0} Dateien</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="space-y-5">
                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <h2 className="font-semibold">Kontaktdaten</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div><dt className="text-xs text-slate-500">Firma</dt><dd>{customer.companyName || "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">E-Mail</dt><dd>{customer.email ? <a href={`mailto:${customer.email}`} className="text-sky-400">{customer.email}</a> : "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Mobil</dt><dd>{customer.phoneMobile ? <a href={`tel:${customer.phoneMobile}`} className="text-sky-400">{customer.phoneMobile}</a> : "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Festnetz</dt><dd>{customer.phoneLandline ? <a href={`tel:${customer.phoneLandline}`} className="text-sky-400">{customer.phoneLandline}</a> : "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Bevorzugter Kontakt</dt><dd>{customer.preferredContact || "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Quelle</dt><dd>{customer.source || "—"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Bewertung</dt><dd>{customer.customerRating ?? 0} / 5</dd></div>
                      <div><dt className="text-xs text-slate-500">Newsletter</dt><dd>{customer.newsletterOptIn ? "Angemeldet" : "Nicht angemeldet"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Kunde seit</dt><dd>{formatGermanDate(customer.createdAt)}</dd></div>
                    </dl>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <h2 className="font-semibold">Adressen</h2>
                    <div className="mt-4 space-y-4">
                      {(customer.addresses ?? []).length === 0 && <p className="text-sm text-slate-500">Keine Adresse hinterlegt.</p>}
                      {(customer.addresses ?? []).map(address => (
                        <address key={address.id} className="not-italic text-sm text-slate-300">
                          <p>{address.street} {address.houseNumber}</p><p>{address.postalCode} {address.city}</p><p>{address.country}</p>
                          {(address.floor || address.parkingInfo) && <p className="mt-2 text-xs text-slate-500">{address.floor && `Etage: ${address.floor}`}{address.floor && address.parkingInfo ? " · " : ""}{address.parkingInfo}</p>}
                        </address>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <h2 className="font-semibold">Interne Kundennotiz</h2>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">{customer.notes || "Keine Notiz hinterlegt."}</p>
                  </section>

                  <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
                    <h2 className="font-semibold">Kundendateien</h2>
                    <div className="mt-3 space-y-2">
                      {(customer.files ?? []).length === 0 && <p className="text-sm text-slate-500">Keine direkten Kundendateien.</p>}
                      {(customer.files ?? []).map(file => <div key={file.id} className="rounded-lg bg-slate-800 px-3 py-2 text-sm"><p className="truncate">{file.originalName || file.fileName}</p><p className="text-xs text-slate-500">{file.category || file.mimeType || "Datei"} · {formatGermanDate(file.uploadedAt)}</p></div>)}
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
