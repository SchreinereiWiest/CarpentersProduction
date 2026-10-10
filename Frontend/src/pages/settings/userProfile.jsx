import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";

import SideBar from "../../components/sideBar.jsx";
import { useAuth } from "../../routes/AuthContext.jsx";

const emptyProfile = {
    firstName: "",
    lastName: "",
    email: ""
};

const emptyPasswords = {
    currentPassword: "",
    password: "",
    passwordConfirmation: ""
};

function getErrorMessage(error, fallback) {
    return error.response?.data?.error
        || error.response?.data?.message
        || fallback;
}

export default function UserProfile() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [profile, setProfile] = useState(emptyProfile);
    const [login, setLogin] = useState("");
    const [passwords, setPasswords] = useState(emptyPasswords);
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileMessage, setProfileMessage] = useState(null);
    const [passwordMessage, setPasswordMessage] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await axios.get("/api/user/me", {
                    withCredentials: true
                });
                const user = response.data.user;

                setProfile({
                    firstName: user.firstName ?? "",
                    lastName: user.lastName ?? "",
                    email: user.email ?? ""
                });
                setLogin(user.login ?? "");
            } catch (error) {
                setProfileMessage({
                    type: "error",
                    text: getErrorMessage(error, "Benutzerdaten konnten nicht geladen werden.")
                });
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const updateProfileField = (field, value) => {
        setProfile(previous => ({ ...previous, [field]: value }));
    };

    const updatePasswordField = (field, value) => {
        setPasswords(previous => ({ ...previous, [field]: value }));
    };

    const saveProfile = async event => {
        event.preventDefault();
        setSavingProfile(true);
        setProfileMessage(null);

        try {
            const response = await axios.put("/api/user/me", profile, {
                withCredentials: true
            });
            const updatedUser = response.data.user;

            setProfile({
                firstName: updatedUser.firstName ?? "",
                lastName: updatedUser.lastName ?? "",
                email: updatedUser.email ?? ""
            });
            setUser(previous => previous ? { ...previous, ...updatedUser } : updatedUser);
            setProfileMessage({ type: "success", text: "Benutzerdaten gespeichert." });
        } catch (error) {
            setProfileMessage({
                type: "error",
                text: getErrorMessage(error, "Benutzerdaten konnten nicht gespeichert werden.")
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async event => {
        event.preventDefault();
        setPasswordMessage(null);

        if (passwords.password !== passwords.passwordConfirmation) {
            setPasswordMessage({ type: "error", text: "Die neuen Passwörter stimmen nicht überein." });
            return;
        }

        setSavingPassword(true);

        try {
            await axios.put("/api/user/me/password", {
                currentPassword: passwords.currentPassword,
                password: passwords.password
            }, {
                withCredentials: true
            });

            setPasswords(emptyPasswords);
            setUser(null);
            navigate("/login", { replace: true });
        } catch (error) {
            setPasswordMessage({
                type: "error",
                text: getErrorMessage(error, "Passwort konnte nicht geändert werden.")
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const logout = async () => {
        setLoggingOut(true);

        try {
            await axios.post("/api/auth/logout", null, {
                withCredentials: true
            });
        } catch (error) {
            console.error("Abmeldung fehlgeschlagen:", error);
        } finally {
            setUser(null);
            navigate("/login", { replace: true });
        }
    };

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
            <SideBar selected={9} />

            <main className="min-w-0 flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl space-y-6">
                    <div>
                        <h1 className="text-xl font-semibold">Benutzer</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Persönliche Daten und Passwort des eigenen Kontos verwalten.
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-sm text-gray-500">Benutzerdaten werden geladen...</div>
                    ) : (
                        <>
                            <form onSubmit={saveProfile} className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                                <div className="text-xs uppercase tracking-wide text-gray-500">Persönliche Daten</div>
                                <p className="mt-2 text-sm text-gray-400">
                                    Angemeldet als <span className="text-gray-300">{login}</span>
                                </p>

                                {profileMessage && <StatusMessage message={profileMessage} />}

                                <div className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
                                    <TextField
                                        label="Vorname"
                                        value={profile.firstName}
                                        autoComplete="given-name"
                                        onChange={value => updateProfileField("firstName", value)}
                                    />
                                    <TextField
                                        label="Nachname"
                                        value={profile.lastName}
                                        autoComplete="family-name"
                                        onChange={value => updateProfileField("lastName", value)}
                                    />
                                    <div className="sm:col-span-2">
                                        <TextField
                                            label="E-Mail-Adresse"
                                            type="email"
                                            value={profile.email}
                                            autoComplete="email"
                                            required
                                            onChange={value => updateProfileField("email", value)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {savingProfile ? "Wird gespeichert..." : "Benutzerdaten speichern"}
                                    </button>
                                </div>
                            </form>

                            <form onSubmit={savePassword} className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                                <div className="text-xs uppercase tracking-wide text-gray-500">Passwort</div>
                                <p className="mt-2 text-sm text-gray-400">
                                    Nach der Änderung wirst du aus Sicherheitsgründen neu angemeldet.
                                </p>

                                {passwordMessage && <StatusMessage message={passwordMessage} />}

                                <div className="mt-4 grid max-w-2xl gap-4">
                                    <TextField
                                        label="Aktuelles Passwort"
                                        type="password"
                                        value={passwords.currentPassword}
                                        autoComplete="current-password"
                                        required
                                        onChange={value => updatePasswordField("currentPassword", value)}
                                    />
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <TextField
                                            label="Neues Passwort"
                                            type="password"
                                            value={passwords.password}
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            onChange={value => updatePasswordField("password", value)}
                                        />
                                        <TextField
                                            label="Neues Passwort wiederholen"
                                            type="password"
                                            value={passwords.passwordConfirmation}
                                            autoComplete="new-password"
                                            minLength={8}
                                            required
                                            onChange={value => updatePasswordField("passwordConfirmation", value)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {savingPassword ? "Wird geändert..." : "Passwort ändern"}
                                    </button>
                                </div>
                            </form>

                            <section className="rounded-xl border border-red-900/70 bg-gray-800 p-5">
                                <div className="text-xs uppercase tracking-wide text-red-400">Sitzung</div>
                                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-gray-400">
                                        Die aktuelle Sitzung auf diesem Gerät beenden.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={loggingOut}
                                        onClick={logout}
                                        className="rounded-lg bg-red-700 px-5 py-2.5 font-medium hover:bg-red-600 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {loggingOut ? "Wird abgemeldet..." : "Abmelden"}
                                    </button>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

function TextField({ label, type = "text", value, onChange, ...inputProps }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs text-gray-500">{label}</span>
            <input
                {...inputProps}
                type={type}
                value={value}
                onChange={event => onChange(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
        </label>
    );
}

function StatusMessage({ message }) {
    return (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
                ? "border-green-800 bg-green-950/40 text-green-300"
                : "border-red-800 bg-red-950/40 text-red-300"
        }`}>
            {message.text}
        </div>
    );
}
