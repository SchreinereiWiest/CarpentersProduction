

import React, {
    useEffect,
    useState
} from "react";

import axios from "axios";


export default function CompanySettingsPanel() {

    const [
        companyName,
        setCompanyName
    ] = useState("");

    const [
        editing,
        setEditing
    ] = useState(false);


    useEffect(() => {

        const loadCompany =
            async () => {

                // try {

                //     const response =
                //         await axios.get(
                //             "/api/company/get",
                //             {
                //                 withCredentials: true
                //             }
                //         );

                //     setCompanyName(
                //         response.data.company.name
                //     );

                // } catch (error) {

                //     console.error(
                //         "Firma konnte nicht geladen werden:",
                //         error
                //     );

                // }
            };


        loadCompany();

    }, []);


    const saveCompanyName =
        async () => {

            try {

                await axios.put(
                    "/api/company/update",
                    {
                        name:
                            companyName
                    },
                    {
                        withCredentials: true
                    }
                );

                setEditing(false);

            } catch (error) {

                console.error(
                    "Firmenname konnte nicht gespeichert werden:",
                    error
                );
            }
        };


    return (
        <div className="
            h-full
            overflow-y-auto
            p-6
        ">

            <div className="
                max-w-4xl
                space-y-6
            ">

                <div>

                    <h1 className="
                        text-xl
                        font-semibold
                    ">
                        Unternehmen
                    </h1>

                    <p className="
                        mt-1
                        text-sm
                        text-gray-500
                    ">
                        Allgemeine Firmeneinstellungen
                    </p>

                </div>


                <section className="
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-800
                    p-5
                ">

                    <div className="
                        text-xs
                        uppercase
                        tracking-wide
                        text-gray-500
                    ">
                        Firmenname
                    </div>


                    {!editing ? (

                        <div className="
                            mt-3
                            flex
                            items-center
                            gap-3
                        ">

                            <div className="
                                text-lg
                                text-gray-100
                            ">
                                {companyName}
                            </div>

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
                                    text-gray-300
                                    hover:bg-gray-700
                                "
                            >
                                Bearbeiten
                            </button>

                        </div>

                    ) : (

                        <div className="
                            mt-3
                            flex
                            gap-2
                        ">

                            <input
                                value={
                                    companyName
                                }
                                onChange={
                                    event =>
                                        setCompanyName(
                                            event.target.value
                                        )
                                }
                                className="
                                    flex-1
                                    rounded
                                    border
                                    border-gray-700
                                    bg-gray-900
                                    px-3
                                    py-2
                                    text-white
                                    outline-none
                                    focus:border-blue-500
                                "
                            />

                            <button
                                type="button"
                                onClick={
                                    saveCompanyName
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
                                Speichern
                            </button>

                        </div>

                    )}

                </section>

            </div>

        </div>
    );
}