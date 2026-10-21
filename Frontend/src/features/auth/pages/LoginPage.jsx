import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

import { useAuth } from "../../../app/providers/AuthContext.js";

const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition focus:border-gray-600 focus:ring-2 focus:ring-gray-200";

function Field({ label, ...props }) {
    return (
        <label className="block text-sm font-medium text-gray-700">
            {label}
            <input className={inputClass} {...props} />
        </label>
    );
}

function Login() {
    const navigate = useNavigate();
    const { checkAuth } = useAuth();
    const [setupMode, setSetupMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [company, setCompany] = useState("");
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [licenseKey, setLicenseKey] = useState("");
    const [error, setError] = useState("");

    const changeMode = nextMode => {
        setSetupMode(nextMode);
        setError("");
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            if (setupMode) {
                await axios.post("/api/auth/bootstrap", {
                    company,
                    firstName,
                    lastName,
                    email,
                    login,
                    password,
                    licenseKey
                }, { withCredentials: true });
            }

            await axios.post("/api/auth/login", {
                company,
                login,
                password
            }, { withCredentials: true });

            await checkAuth();
            navigate("/");
        } catch (requestError) {
            console.error(requestError);
            const response = requestError.response?.data;
            if (response?.error === "TENANT_SETUP_REQUIRED") {
                setSetupMode(true);
                setError("Für diese Firma existiert noch kein Benutzer. Bitte richte den ersten Administrator ein.");
            } else {
                setError(response?.message || response?.error || "Firma, Benutzer oder Passwort ist ungültig");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen overflow-y-auto bg-gray-900 px-4 py-8 text-white sm:py-12">
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
                <section className="w-full rounded-2xl bg-white px-6 py-8 shadow-xl ring-1 ring-black/10 sm:px-10">
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Carpenters Production</p>
                        <h1 className="mt-2 text-3xl font-semibold text-gray-900">
                            {setupMode ? "Ersteinrichtung" : "Anmelden"}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            {setupMode
                                ? "Lege den ersten Administrator mit dem Lizenzschlüssel für diese einmalige Einrichtung an."
                                : "Melde dich mit Firma und Benutzerkonto an."}
                        </p>
                    </div>

                    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                        <Field
                            label="Firma oder Tenant-Slug"
                            name="company"
                            value={company}
                            onChange={event => setCompany(event.target.value)}
                            autoComplete="organization"
                            required
                        />

                        {setupMode && (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Vorname" name="firstName" value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" />
                                    <Field label="Nachname" name="lastName" value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" />
                                </div>
                                <Field label="E-Mail-Adresse" type="email" name="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
                            </>
                        )}

                        <Field
                            label="Login"
                            name="login"
                            value={login}
                            onChange={event => setLogin(event.target.value)}
                            autoComplete="username"
                            required
                        />
                        <Field
                            label={setupMode ? "Neues Passwort (mindestens 12 Zeichen)" : "Passwort"}
                            type="password"
                            name="password"
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            autoComplete={setupMode ? "new-password" : "current-password"}
                            minLength={setupMode ? 12 : undefined}
                            required
                        />

                        {setupMode && (
                            <Field
                                label="Lizenzschlüssel"
                                type="password"
                                name="licenseKey"
                                value={licenseKey}
                                onChange={event => setLicenseKey(event.target.value)}
                                autoComplete="off"
                                required
                            />
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-gray-950 px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"
                        >
                            {submitting ? "Bitte warten …" : setupMode ? "Administrator einrichten" : "Anmelden"}
                        </button>

                        <button
                            type="button"
                            onClick={() => changeMode(!setupMode)}
                            className="w-full text-sm font-medium text-gray-600 hover:text-gray-950"
                        >
                            {setupMode ? "Zurück zur Anmeldung" : "Noch keine Benutzer? Ersteinrichtung starten"}
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}

export default Login;
