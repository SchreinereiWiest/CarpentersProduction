import { useEffect, useState } from "react";
import axios from "axios";

export default function CustomerSearch({

    selectedCustomer,
    setSelectedCustomer

}) {

    const [search, setSearch] = useState("");

    const [results, setResults] = useState([]);

    const [loading, setLoading] = useState(false);

    useEffect(() => {

        if (search.length < 2) {

            setResults([]);

            return;

        }

        const timeout = setTimeout(async () => {

            setLoading(true);

            try {

                const { data } = await axios.get(

                    `/api/customers/search?search=${encodeURIComponent(search)}`

                );

                setResults(data);

            }

            finally {

                setLoading(false);

            }

        }, 250);

        return () => clearTimeout(timeout);

    }, [search]);

    return (

        <div className="relative">

            {

                selectedCustomer ?

                <div className="
                    flex
                    items-center
                    justify-between
                    rounded-lg
                    bg-gray-700
                    px-4
                    py-3
                ">

                    <div>

                        <div className="font-medium">

                            {

                                selectedCustomer.company ||

                                `${selectedCustomer.firstName} ${selectedCustomer.lastName}`

                            }

                        </div>

                        <div className="text-sm text-gray-400">

                            {selectedCustomer.city}

                        </div>

                    </div>

                    <button

                        onClick={() => {

                            setSelectedCustomer(null);

                            setSearch("");

                        }}

                        className="text-red-400 hover:text-red-300"

                    >

                        ✕

                    </button>

                </div>

                :

                <>

                    <input

                        value={search}

                        onChange={(e) => setSearch(e.target.value)}

                        placeholder="Kunde suchen..."

                        className="
                            w-full
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-800
                            px-4
                            py-3
                            outline-none
                            focus:border-blue-500
                        "

                    />

                    {

                        loading &&

                        <div className="
                            absolute
                            right-4
                            top-3
                            text-sm
                            text-gray-400
                        ">

                            Suche...

                        </div>

                    }

                    {

                        results.length > 0 &&

                        <div className="
                            absolute
                            left-0
                            right-0
                            top-full
                            z-50
                            mt-2
                            max-h-80
                            overflow-y-auto
                            rounded-lg
                            border
                            border-gray-700
                            bg-gray-800
                            shadow-xl
                        ">

                            {

                                results.map(customer => (

                                    <button

                                        key={customer.id}

                                        onClick={() => {

                                            setSelectedCustomer(customer);

                                            setResults([]);

                                            setSearch("");

                                        }}

                                        className="
                                            w-full
                                            border-b
                                            border-gray-700
                                            px-4
                                            py-3
                                            text-left
                                            hover:bg-gray-700
                                        "

                                    >

                                        <div className="font-medium">

                                            {

                                                customer.company ||

                                                `${customer.firstName} ${customer.lastName}`

                                            }

                                        </div>

                                        <div className="
                                            text-sm
                                            text-gray-400
                                        ">

                                            {customer.city}

                                        </div>

                                    </button>

                                ))

                            }

                        </div>

                    }

                </>

            }

        </div>

    );

}