import React from "react";


export default function SelectedElementProperties({
    selectedElement
}) {

    return (

        <div className="space-y-6">

            {/* =================================================
                Auswahl
            ================================================= */}

            <section>

                <div className="
                    text-xs
                    uppercase
                    tracking-wide
                    text-gray-500
                ">
                    Auswahl
                </div>


                <div className="
                    mt-2
                    text-base
                ">
                    {selectedElement.name ??
                        selectedElement.id}
                </div>


                <div className="
                    text-sm
                    text-gray-500
                ">
                    {selectedElement.type}
                </div>

            </section>


            {/* =================================================
                Abmessungen
            ================================================= */}

            <section>

                <div className="
                    text-xs
                    uppercase
                    tracking-wide
                    text-gray-500
                ">
                    Abmessungen
                </div>


                <div className="
                    mt-3
                    grid
                    grid-cols-2
                    gap-3
                ">

                    <div>
                        <span className="
                            text-xs
                            text-gray-400
                            mr-2
                        ">
                            X
                        </span>

                        {selectedElement.x ?? ""}
                    </div>


                    <div>
                        <span className="
                            text-xs
                            text-gray-400
                            mr-2
                        ">
                            Y
                        </span>

                        {selectedElement.y ?? ""}
                    </div>


                    <div>
                        <span className="
                            text-xs
                            text-gray-400
                            mr-2
                        ">
                            Breite
                        </span>

                        {selectedElement.width ?? ""}
                    </div>


                    <div>
                        <span className="
                            text-xs
                            text-gray-400
                            mr-2
                        ">
                            Höhe
                        </span>

                        {selectedElement.height ?? ""}
                    </div>

                </div>

            </section>

        </div>
    );
}