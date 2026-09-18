export default function DeleteConfirm({
    setShowDeleteModal,
    handleDeleteProject,
    deleting
}) {

    return (
        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            backdrop-blur-sm
        ">

            {/* Modal */}

            <div className="
                w-[500px]
                rounded-2xl
                border
                border-white/10
                bg-gray-900/95
                p-6
                text-white
                shadow-2xl
            ">

                <h2 className="
                    mb-4
                    text-xl
                    font-bold
                ">
                    Projekt löschen
                </h2>

                <p className="
                    mb-6
                    text-gray-400
                ">
                    Möchtest du dieses Projekt wirklich löschen?
                    Alle zugehörigen Dateien und Daten werden
                    dauerhaft gelöscht.
                </p>

                <div className="
                    flex
                    justify-end
                    gap-3
                ">

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deleting}
                        className="
                            rounded-lg
                            bg-gray-700
                            px-5
                            py-2.5
                            text-gray-200
                            transition
                            hover:bg-gray-600
                            disabled:opacity-50
                        "
                    >
                        Abbrechen
                    </button>

                    <button
                        type="button"
                        onClick={handleDeleteProject}
                        disabled={deleting}
                        className="
                            rounded-lg
                            bg-red-600
                            px-5
                            py-2.5
                            font-medium
                            text-white
                            transition
                            hover:bg-red-700
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {deleting
                            ? "Wird gelöscht..."
                            : "Projekt endgültig löschen"
                        }
                    </button>

                </div>

            </div>

        </div>
    );
}