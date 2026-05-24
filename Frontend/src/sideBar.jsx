import { useState } from 'react'
import queryString from "query-string";

function SideBar({selected=0}) {
return (

<nav aria-label="Sidebar" className="hidden lg:block lg:flex-shrink-0 lg:overflow-y-auto lg:bg-gray-800 fixed h-full">
    <div className="relative flex w-20 flex-col space-y-3 p-3">

        <a href={`/?id=${queryString.parse(window.location.search).id}`}
            className={selected === 0 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Open</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/inbox" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 00 twenty-one seventy-five one-eighty v-4.16２c０-.２２４-.０３４-.４４７-.１-.６６１L１９．２４ ５．３３８a２．２５ ２．２５ ０ ００-２．１５-１．５８８H６．９１１a２．２５ ２．２５ ０ ００-２．１５ １．５８８L２．３５ １３．１７７a２．２５ ２．２５ ０ ００-.１.６６１z">
                </path>
            </svg>
        </a>

        <a href={"/project?id=" + queryString.parse(window.location.search).id}
            className={selected === 1 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Archive</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/archive-box"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z">
                </path>
            </svg>
        </a>

        <a href={"/editor?id=" + queryString.parse(window.location.search).id}
            className={selected === 2 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Customers</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/user-circle"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z">
                </path>
            </svg>
        </a>

        <a href="#"
            className={selected === 3 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Flagged</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/flag" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5">
                </path>
            </svg>
        </a>

        <a href="#"
            className={selected === 4 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Spam</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/no-symbol" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636">
                </path>
            </svg>
        </a>

        <a href="#"
            className={selected === 5 ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg" : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-14 rounded-lg"}>
            <span className="sr-only">Drafts</span>
            <svg className="h-6 w-6" x-description="Heroicon name: outline/pencil-square"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10">
                </path>
            </svg>
        </a>

    </div>
</nav>
)};
export default SideBar;