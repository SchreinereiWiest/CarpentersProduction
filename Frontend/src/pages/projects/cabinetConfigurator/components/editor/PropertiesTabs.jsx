import React from "react";


export default function PropertiesTabs({
    activeTab,
    setActiveTab
}) {

    return (
        <div className="
            flex
            border-b
            border-gray-700
        ">

            <button
                type="button"
                onClick={() =>
                    setActiveTab("properties")
                }
                className={`
                    flex-1
                    px-3
                    py-2
                    text-sm
                    font-medium
                    border-b-2

                    ${
                        activeTab === "properties"
                            ? `
                                border-blue-500
                                text-blue-400
                              `
                            : `
                                border-transparent
                                text-gray-500
                                hover:text-gray-300
                              `
                    }
                `}
            >
                Eigenschaften
            </button>


            <button
                type="button"
                onClick={() =>
                    setActiveTab("function")
                }
                className={`
                    flex-1
                    px-3
                    py-2
                    text-sm
                    font-medium
                    border-b-2

                    ${
                        activeTab === "function"
                            ? `
                                border-blue-500
                                text-blue-400
                              `
                            : `
                                border-transparent
                                text-gray-500
                                hover:text-gray-300
                              `
                    }
                `}
            >
                Funktion
            </button>

        </div>
    );
}