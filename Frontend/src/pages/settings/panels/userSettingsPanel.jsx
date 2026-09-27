

import React, {
    useEffect,
    useState
} from "react";

import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    changeUserPassword,
    deleteUser
} from "../engine/userApi";

export default function UserSettingsPanel() {

    const [users, setUsers] = useState([]);

    const [selectedUserId, setSelectedUserId] =
        useState(null);

    const [selectedUser, setSelectedUser] =
        useState(null);

    const [loadingUsers, setLoadingUsers] =
        useState(false);

    const [editing, setEditing] =
        useState(false);

    const [showAddUser, setShowAddUser] =
        useState(false);

    const [showPasswordDialog, setShowPasswordDialog] =
    useState(false);

    const [newPassword, setNewPassword] =
        useState("");

    const [savingPassword, setSavingPassword] =
        useState(false);

            const [passwordError, setPasswordError] = useState("");

    const [userForm, setUserForm] = useState({
        firstName: "",
        lastName: "",
        login: "",
        email: "",
        role: "user"
    });


    const [newUser, setNewUser] = useState({
        firstName: "",
        lastName: "",
        login: "",
        email: "",
        password: "",
        role: "user"
    });


    useEffect(() => {

        if (!selectedUser) {
            return;
        }

        setUserForm({
            firstName:
                selectedUser.firstName ?? "",

            lastName:
                selectedUser.lastName ?? "",

            login: selectedUser.login ?? "",

            email:
                selectedUser.email ?? "",

            role:
                selectedUser.role ?? "user"
        });

        console.log(selectedUser);

    }, [selectedUser]);

    useEffect(() => {

    const loadUsers = async () => {

        try {

            setLoadingUsers(true);

            const data =
                await getUsers();

            setUsers(data);

            console.log(data);

            if (data.length > 0) {

                setSelectedUserId(
                    data[0].id
                );
            }

        } catch (error) {

            console.error(
                "Benutzer konnten nicht geladen werden:",
                error
            );

        } finally {

            setLoadingUsers(false);
        }
    };


    loadUsers();

    }, []);

    useEffect(() => {

        if (!selectedUserId) {
            setSelectedUser(null);
            return;
        }


        const loadUser =
            async () => {

                try {

                    const user =
                        await getUser(
                            selectedUserId
                        );

                    setSelectedUser(
                        user
                    );

                } catch (error) {

                    console.error(
                        "Benutzer konnte nicht geladen werden:",
                        error
                    );
                }
            };


        loadUser();

    }, [selectedUserId]);


    const updateForm =
        (key, value) => {

            setUserForm(
                prev => ({
                    ...prev,
                    [key]: value
                })
            );
        };

    const saveUser = async () => {

    try {

        const updatedUser =
            await updateUser(
                selectedUserId,
                userForm
            );


        setUsers(
            prev =>
                prev.map(
                    user =>
                        user.id ===
                        updatedUser.id
                            ? {
                                ...user,
                                ...updatedUser
                            }
                            : user
                )
        );


        setSelectedUser(
            prev =>
                prev
                    ? {
                        ...prev,
                        ...updatedUser
                    }
                    : updatedUser
        );


        setEditing(false);

    } catch (error) {

        console.error(
            "Benutzer konnte nicht aktualisiert werden:",
            error
        );
    }
    };

    const handleDeleteUser = async () => {

    if (!selectedUser) {
        return;
    }


    const confirmed =
        window.confirm(
            `Benutzer "${selectedUser.firstName ?? ""} ${selectedUser.lastName ?? ""}" wirklich löschen?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await deleteUser(
            selectedUser.id
        );


        const remaining =
            users.filter(
                user =>
                    user.id !==
                    selectedUser.id
            );


        setUsers(
            remaining
        );


        setSelectedUserId(
            remaining[0]?.id ?? null
        );

        setSelectedUser(
            null
        );

        setEditing(false);

    } catch (error) {

        console.error(
            "Benutzer konnte nicht gelöscht werden:",
            error
        );
    }
    };

    const addUser = async () => {

    try {

        const user =
            await createUser(
                newUser
            );


        setUsers(
            prev => [
                ...prev,
                user
            ]
        );


        setSelectedUserId(
            user.id
        );


        setShowAddUser(false);


        setNewUser({
            firstName: "",
            lastName: "",
            login: "",
            email: "",
            password: "",
            role: "user"
        });

    } catch (error) {

        console.error(
            "Benutzer konnte nicht angelegt werden:",
            error
        );

        console.error(
            error.response?.data
        );
    }
    };

    const handlePasswordChange = async () => {

    if (
        !selectedUserId ||
        newPassword.length < 8
    ) {
        return;
    }


    try {

        setSavingPassword(true);


        await changeUserPassword(
            selectedUserId,
            newPassword
        );


        setNewPassword("");

        setShowPasswordDialog(false);

    } catch (error) {

        console.error(
            "Passwort konnte nicht geändert werden:",
            error
        );

    } finally {

        setSavingPassword(false);
    }
};


    return (
        <div className="
            h-full
            min-h-0
            flex
            flex-col
        ">

            {/* Header */}

            <div className="
                h-16
                shrink-0
                border-b
                border-gray-700
                px-6
                flex
                items-center
                justify-between
            ">

                <div>

                    <h1 className="
                        text-lg
                        font-semibold
                    ">
                        Benutzer
                    </h1>

                    <div className="
                        text-xs
                        text-gray-500
                    ">
                        Benutzerkonten und Berechtigungen
                    </div>

                </div>


                <button
                    type="button"
                    onClick={() =>
                        setShowAddUser(true)
                    }
                    className="
                        rounded
                        bg-blue-600
                        px-4
                        py-2
                        text-sm
                        hover:bg-blue-700
                    "
                >
                    + Benutzer
                </button>

            </div>


            {/* Inhalt */}

            <div className="
                flex-1
                min-h-0
                grid
                grid-cols-[280px_minmax(0,1fr)]
            ">


                {/* ====================================== */}
                {/* Benutzerliste */}
                {/* ====================================== */}

                <aside className="
                    min-h-0
                    overflow-y-auto
                    border-r
                    border-gray-700
                    p-2
                ">

                    {users.map(user => {

                        const selected =
                            user.id ===
                            selectedUserId;

                        return (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() =>
                                    setSelectedUserId(
                                        user.id
                                    )
                                }
                                className={`
                                    w-full
                                    rounded-lg
                                    px-3
                                    py-3
                                    text-left
                                    mb-1
                                    border

                                    ${
                                        selected
                                            ? "bg-gray-800 border-blue-700"
                                            : "border-transparent hover:bg-gray-800/70"
                                    }
                                `}
                            >

                                <div className="
                                    text-sm
                                    text-gray-200
                                ">
                                    {user.firstName}{" "}
                                    {user.lastName}
                                </div>

                                <div className="
                                    mt-1
                                    text-xs
                                    text-gray-500
                                ">
                                    {user.email}
                                </div>

                                <div className="
                                    mt-2
                                    text-xs
                                    text-gray-600
                                ">
                                    {user.role}
                                </div>

                            </button>
                        );
                    })}

                </aside>


                {/* ====================================== */}
                {/* Details */}
                {/* ====================================== */}

                <main className="
                    min-w-0
                    min-h-0
                    overflow-y-auto
                    p-6
                ">

                    {!selectedUser ? (

                        <div className="
                            h-full
                            flex
                            items-center
                            justify-center
                            text-gray-500
                        ">
                            Kein Benutzer ausgewählt.
                        </div>

                    ) : (

                        <div className="
                            max-w-4xl
                            space-y-6
                        ">

                            {/* Persönliche Daten */}

                            <section className="
                                rounded-xl
                                border
                                border-gray-700
                                bg-gray-800
                                p-5
                            ">

                                <div className="
                                    flex
                                    items-center
                                    justify-between
                                    mb-4
                                ">

                                    <h2 className="
                                        font-medium
                                    ">
                                        Benutzerkonto
                                    </h2>

                                    {!editing && (

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditing(true)
                                            }
                                            className="
                                                rounded
                                                border
                                                border-gray-700
                                                bg-gray-900
                                                px-3
                                                py-1.5
                                                text-sm
                                                hover:bg-gray-700
                                            "
                                        >
                                            Bearbeiten
                                        </button>

                                    )}

                                </div>


                                <div className="
                                    grid
                                    grid-cols-2
                                    gap-4
                                ">

                                    <Field
                                        label="Vorname"
                                        value={
                                            userForm.firstName
                                        }
                                        disabled={
                                            !editing
                                        }
                                        onChange={
                                            value =>
                                                updateForm(
                                                    "firstName",
                                                    value
                                                )
                                        }
                                    />

                                    <Field
                                        label="Nachname"
                                        value={
                                            userForm.lastName
                                        }
                                        disabled={
                                            !editing
                                        }
                                        onChange={
                                            value =>
                                                updateForm(
                                                    "lastName",
                                                    value
                                                )
                                        }
                                    />

                                    <Field
                                        label="E-Mail"
                                        value={
                                            userForm.email
                                        }
                                        disabled={
                                            !editing
                                        }
                                        onChange={
                                            value =>
                                                updateForm(
                                                    "email",
                                                    value
                                                )
                                        }
                                    />

                                    <Field
                                        label="Login"
                                        value={
                                            userForm.login
                                        }
                                        disabled={
                                            !editing
                                        }
                                        onChange={
                                            value =>
                                                updateForm(
                                                    "login",
                                                    value
                                                )
                                        }
                                    />


                                    <div>

                                        <div className="
                                            text-xs
                                            text-gray-500
                                            mb-1
                                        ">
                                            Rolle
                                        </div>

                                        <select
                                            value={
                                                userForm.role
                                            }
                                            disabled={
                                                !editing
                                            }
                                            onChange={
                                                event =>
                                                    updateForm(
                                                        "role",
                                                        event.target.value
                                                    )
                                            }
                                            className="
                                                w-full
                                                rounded
                                                border
                                                border-gray-700
                                                bg-gray-900
                                                px-3
                                                py-2
                                                text-sm
                                                text-white
                                            "
                                        >
                                            <option value="user">
                                                Benutzer
                                            </option>

                                            <option value="manager">
                                                Manager
                                            </option>

                                            <option value="admin">
                                                Administrator
                                            </option>
                                        </select>

                                    </div>

                                </div>


                                {editing && (

                                    <div className="
                                        mt-4
                                        flex
                                        justify-end
                                        gap-2
                                    ">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditing(false)
                                            }
                                            className="
                                                rounded
                                                border
                                                border-gray-700
                                                px-4
                                                py-2
                                                text-sm
                                            "
                                        >
                                            Abbrechen
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                saveUser
                                            }
                                            className="
                                                rounded
                                                bg-blue-600
                                                px-4
                                                py-2
                                                text-sm
                                            "
                                        >
                                            Speichern
                                        </button>

                                    </div>

                                )}

                            </section>


                            {/* Passwort */}

                            <section className="
                                rounded-xl
                                border
                                border-gray-700
                                bg-gray-800
                                p-5
                            ">

                                <div className="
                                    font-medium
                                    mb-4
                                ">
                                    Passwort
                                </div>

                                <button
                                    type="button"       
                                    onClick={() =>
                                        setShowPasswordDialog(true)
                                    }
                                    className="
                                        rounded
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-4
                                        py-2
                                        text-sm
                                        hover:bg-gray-700
                                    "
                                >
                                    Passwort ändern
                                </button>

                            </section>

                            {/* ====================================== */}
                            {/* Passwort ändern */}
                            {/* ====================================== */}

                            {showPasswordDialog && (

                                <div
                                    className="
                                        fixed
                                        inset-0
                                        z-50
                                        flex
                                        items-center
                                        justify-center
                                        bg-black/60
                                    "
                                    onClick={() =>
                                        setShowPasswordDialog(false)
                                    }
                                >

                                    <div
                                        className="
                                            w-full
                                            max-w-md
                                            rounded-xl
                                            border
                                            border-gray-700
                                            bg-gray-800
                                            p-6
                                            shadow-2xl
                                        "
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >

                                        {/* Header */}

                                        <div className="
                                            mb-5
                                        ">

                                            <div className="
                                                text-lg
                                                font-semibold
                                                text-white
                                            ">
                                                Passwort ändern
                                            </div>

                                            <div className="
                                                mt-1
                                                text-sm
                                                text-gray-500
                                            ">
                                                Neues Passwort für{" "}
                                                <span className="text-gray-300">
                                                    {selectedUser?.firstName}{" "}
                                                    {selectedUser?.lastName}
                                                </span>
                                            </div>

                                        </div>


                                        {/* Neues Passwort */}

                                        <div className="
                                            space-y-4
                                        ">

                                            <label className="block">

                                                <span className="
                                                    block
                                                    text-xs
                                                    text-gray-500
                                                    mb-1
                                                ">
                                                    Neues Passwort
                                                </span>

                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(event) =>
                                                        setNewPassword(
                                                            event.target.value
                                                        )
                                                    }
                                                    autoFocus
                                                    className="
                                                        w-full
                                                        rounded
                                                        border
                                                        border-gray-700
                                                        bg-gray-900
                                                        px-3
                                                        py-2
                                                        text-sm
                                                        text-white
                                                        outline-none
                                                        focus:border-blue-500
                                                    "
                                                />

                                            </label>
                                          


                                            {/* Hinweise */}

                                            <div className="
                                                rounded
                                                border
                                                border-gray-700
                                                bg-gray-900
                                                p-3
                                                text-xs
                                                text-gray-500
                                            ">
                                                Das Passwort muss mindestens 8 Zeichen
                                                lang sein.
                                            </div>


                                            {/* Fehler */}

                                            {passwordError && (

                                                <div className="
                                                    rounded
                                                    border
                                                    border-red-800
                                                    bg-red-950/30
                                                    px-3
                                                    py-2
                                                    text-sm
                                                    text-red-400
                                                ">
                                                    {passwordError}
                                                </div>

                                            )}

                                        </div>


                                        {/* Buttons */}

                                        <div className="
                                            mt-6
                                            flex
                                            justify-end
                                            gap-2
                                        ">

                                            <button
                                                type="button"
                                                onClick={() => {

                                                    setShowPasswordDialog(
                                                        false
                                                    );

                                                    setNewPassword("");
                                                    setPasswordError("");

                                                }}
                                                className="
                                                    rounded
                                                    border
                                                    border-gray-700
                                                    bg-gray-900
                                                    px-4
                                                    py-2
                                                    text-sm
                                                    text-gray-300
                                                    hover:bg-gray-700
                                                "
                                            >
                                                Abbrechen
                                            </button>


                                            <button
                                                type="button"
                                                onClick={
                                                    handlePasswordChange
                                                }
                                                disabled={
                                                    savingPassword ||
                                                    newPassword.length < 8
                                                    
                                                }
                                                className="
                                                    rounded
                                                    bg-blue-600
                                                    px-4
                                                    py-2
                                                    text-sm
                                                    text-white
                                                    hover:bg-blue-700
                                                    disabled:cursor-not-allowed
                                                    disabled:opacity-40
                                                "
                                            >
                                                {savingPassword
                                                    ? "Speichern..."
                                                    : "Passwort speichern"}
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )}


                            {/* Dateien */}

                            <section className="
                                rounded-xl
                                border
                                border-gray-700
                                bg-gray-800
                                p-5
                            ">

                                <div className="
                                    font-medium
                                    mb-3
                                ">
                                    Benutzerdateien
                                </div>

                                <div className="
                                    rounded
                                    border
                                    border-dashed
                                    border-gray-700
                                    p-6
                                    text-center
                                    text-sm
                                    text-gray-500"
                                >
                                    {selectedUser.files?.length ?? 0}
                                    Dateien
                                </div>

                            </section>


                            {/* Daten */}

                            <section className="
                                rounded-xl
                                border
                                border-gray-700
                                bg-gray-800
                                p-5
                            ">

                                <div className="
                                    font-medium
                                    mb-3
                                ">
                                    Benutzerdaten
                                </div>

                                <pre className="
                                    rounded
                                    bg-gray-900
                                    p-3
                                    text-xs
                                    text-gray-400
                                    overflow-auto
                                ">
                                    {
                                        JSON.stringify(
                                            selectedUser.data ?? {},
                                            null,
                                            2
                                        )
                                    }
                                </pre>

                            </section>


                            {/* Löschen */}

                            <section className="
                                border-t
                                border-gray-800
                                pt-4
                            ">

                                <button
                                    type="button"
                                    onClick={handleDeleteUser}
                                    className="
                                        rounded
                                        border
                                        border-red-800
                                        px-4
                                        py-2
                                        text-sm
                                        text-red-400
                                        hover:bg-red-950
                                    "
                                >
                                    Benutzer löschen
                                </button>

                            </section>

                        </div>

                    )}

                </main>

            </div>


            {/* ====================================== */}
            {/* Benutzer hinzufügen */}
            {/* ====================================== */}

            {showAddUser && (

                <div className="
                    fixed
                    inset-0
                    z-50
                    flex
                    items-center
                    justify-center
                    bg-black/60
                ">

                    <div className="
                        w-full
                        max-w-lg
                        rounded-xl
                        border
                        border-gray-700
                        bg-gray-800
                        p-6
                        shadow-2xl
                    ">

                        <div className="
                            text-lg
                            font-semibold
                            mb-5
                        ">
                            Benutzer hinzufügen
                        </div>


                        <div className="
                            grid
                            grid-cols-2
                            gap-4
                        ">

                            <Field
                                label="Vorname"
                                value={
                                    newUser.firstName
                                }
                                onChange={
                                    value =>
                                        setNewUser(
                                            prev => ({
                                                ...prev,
                                                firstName:
                                                    value
                                            })
                                        )
                                }
                            />

                            <Field
                                label="Nachname"
                                value={
                                    newUser.lastName
                                }
                                onChange={
                                    value =>
                                        setNewUser(
                                            prev => ({
                                                ...prev,
                                                lastName:
                                                    value
                                            })
                                        )
                                }
                            />

                            

                            <div className="
                                col-span-2
                            ">
                                <Field
                                label="Login"
                                value={
                                    newUser.login
                                }
                                onChange={
                                    value =>
                                        setNewUser(
                                            prev => ({
                                                ...prev,
                                                login:
                                                    value
                                            })
                                        )
                                }
                            />
                            
                                <Field
                                    label="E-Mail"
                                    value={
                                        newUser.email
                                    }
                                    onChange={
                                        value =>
                                            setNewUser(
                                                prev => ({
                                                    ...prev,
                                                    email:
                                                        value
                                                })
                                            )
                                    }
                                />
                            </div>


                            <div className="
                                col-span-2
                            ">

                                <Field
                                    label="Passwort"
                                    type="password"
                                    value={
                                        newUser.password
                                    }
                                    onChange={
                                        value =>
                                            setNewUser(
                                                prev => ({
                                                    ...prev,
                                                    password:
                                                        value
                                                })
                                            )
                                    }
                                />

                            </div>


                            <div className="
                                col-span-2
                            ">

                                <div className="
                                    text-xs
                                    text-gray-500
                                    mb-1
                                ">
                                    Rolle
                                </div>

                                <select
                                    value={
                                        newUser.role
                                    }
                                    onChange={
                                        event =>
                                            setNewUser(
                                                prev => ({
                                                    ...prev,
                                                    role:
                                                        event.target.value
                                                })
                                            )
                                    }
                                    className="
                                        w-full
                                        rounded
                                        border
                                        border-gray-700
                                        bg-gray-900
                                        px-3
                                        py-2
                                        text-sm
                                    "
                                >
                                    <option value="user">
                                        Benutzer
                                    </option>
                                    <option value="manager">
                                        Manager
                                    </option>
                                    <option value="admin">
                                        Administrator
                                    </option>
                                </select>

                            </div>

                        </div>


                        <div className="
                            mt-6
                            flex
                            justify-end
                            gap-2
                        ">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowAddUser(false)
                                }
                                className="
                                    rounded
                                    border
                                    border-gray-700
                                    px-4
                                    py-2
                                    text-sm
                                "
                            >
                                Abbrechen
                            </button>

                            <button
                                type="button"
                                onClick={addUser}
                                className="
                                    rounded
                                    bg-blue-600
                                    px-4
                                    py-2
                                    text-sm
                                "
                            >
                                Benutzer anlegen
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}


function Field({
    label,
    value,
    onChange,
    disabled = false,
    type = "text"
}) {

    return (
        <label className="block">

            <span className="
                block
                text-xs
                text-gray-500
                mb-1
            ">
                {label}
            </span>

            <input
                type={type}
                value={value ?? ""}
                disabled={disabled}
                onChange={
                    event =>
                        onChange?.(
                            event.target.value
                        )
                }
                className="
                    w-full
                    rounded
                    border
                    border-gray-700
                    bg-gray-900
                    px-3
                    py-2
                    text-sm
                    text-white
                    outline-none
                    disabled:opacity-50
                    focus:border-blue-500
                "
            />

        </label>
    );
}