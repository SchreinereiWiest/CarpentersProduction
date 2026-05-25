import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import { Link } from "react-router";

function Contacts() {

return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} className="flex-1" />

        <main className="pt-10 h-full flex-1 overflow-y-auto">
            <div className="relative flex items-center">
                <form
                    className="mx-auto max-w-xl py-2 px-6 rounded-full bg-gray-50 border flex focus-within:border-gray-300">
                    <input type="text" placeholder="Search anything"
                        class="bg-transparent w-full focus:outline-none pr-4 font-semibold border-0 focus:ring-0 px-0 py-0 text-gray-900"
                        name="search" />
                    <button
                        className="hover:bg-gray-700 transition duration-300 flex flex-row items-center justify-center min-w-[130px] px-4 rounded-full font-medium tracking-wide border disabled:cursor-not-allowed disabled:opacity-50 transition ease-in-out duration-150 text-base bg-gray-900 text-white font-medium tracking-wide border-transparent py-1.5 h-[38px] -mr-3">
                        Search
                    </button>
                </form>

                <div className="absolute right-24">
                    <Link to="/Kontakte/new"
                        className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="size-6">
                            <path fillRule="evenodd"
                                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-gray-300 font-medium">Neuer Kontakt</span>
                    </Link>

                </div>

            </div>

            <div className="rounded-lg overflow-hidden mx-4 md:mx-10 pt-10">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="bg-gray-800">
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Name</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Email</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Phone</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Adress</th>
                            <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Status</th>
                        </tr>
                    </thead>

                    <tbody className="bg-gray-700 hover:bg-gray-600 transition duration-300">
                        <tr>
                            <td className="py-4 px-6">John Doe</td>
                            <td className="py-4 px-6 truncate">johndoe@gmail.com</td>
                            <td className="py-4 px-6">555-555-5555</td>
                            <td className="py-4 px-6">Altenstadt</td>
                            <td className="py-4 px-6">
                                <span className="bg-green-500 text-white py-1 px-2 rounded-full text-xs">Active</span>
                            </td>
                        </tr>

                    </tbody>
                </table>
            </div>

        </main>
    </div>
</>
);
}
export default Contacts;