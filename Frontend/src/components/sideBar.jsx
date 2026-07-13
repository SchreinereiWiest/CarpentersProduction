import { useState } from 'react'
import queryString from "query-string";
import { useApp } from '../main.jsx';
import { Link } from "react-router";

function SideBar({selected=0}) {

const {SideBarCollapsed, setSideBarCollapsed} = useApp();

return (
<nav aria-label="Sidebar" className="hidden lg:block lg:flex-shrink-0 lg:overflow-y-auto lg:bg-gray-800 h-full">
    <div className={SideBarCollapsed ? "relative flex w-20 flex-col space-y-3 p-3"
        : "relative flex w-60 flex-col space-y-3 p-3" }>

        <Link to="/" className={SideBarCollapsed ? selected===0
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===0
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ">
                <path
                    d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                <path
                    d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Home</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===1
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===1
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z"
                    clipRule="evenodd" />
                <path fillRule="evenodd"
                    d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z"
                    clipRule="evenodd" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Auswertung</span>
        </Link>

        <Link to="/Projects" className={SideBarCollapsed ? selected===2
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===2
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M1.5 9.832v1.793c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875V9.832a3 3 0 0 0-.722-1.952l-3.285-3.832A3 3 0 0 0 16.215 3h-8.43a3 3 0 0 0-2.278 1.048L2.222 7.88A3 3 0 0 0 1.5 9.832ZM7.785 4.5a1.5 1.5 0 0 0-1.139.524L3.881 8.25h3.165a3 3 0 0 1 2.496 1.336l.164.246a1.5 1.5 0 0 0 1.248.668h2.092a1.5 1.5 0 0 0 1.248-.668l.164-.246a3 3 0 0 1 2.496-1.336h3.165l-2.765-3.226a1.5 1.5 0 0 0-1.139-.524h-8.43Z"
                    clipRule="evenodd" />
                <path
                    d="M2.813 15c-.725 0-1.313.588-1.313 1.313V18a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-1.688c0-.724-.588-1.312-1.313-1.312h-4.233a3 3 0 0 0-2.496 1.336l-.164.246a1.5 1.5 0 0 1-1.248.668h-2.092a1.5 1.5 0 0 1-1.248-.668l-.164-.246A3 3 0 0 0 7.046 15H2.812Z" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Projekte</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===3
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===3
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z"
                    clipRule="evenodd" />
                <path
                    d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Dokumente</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===4
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===4
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path
                    d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                <path fillRule="evenodd"
                    d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z"
                    clipRule="evenodd" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Planung</span>
        </Link>

        <Link to="/Kontakte" className={SideBarCollapsed ? selected===5
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===5
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M4.5 3.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V6.75a3 3 0 0 0-3-3h-15Zm4.125 3a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Zm-3.873 8.703a4.126 4.126 0 0 1 7.746 0 .75.75 0 0 1-.351.92 7.47 7.47 0 0 1-3.522.877 7.47 7.47 0 0 1-3.522-.877.75.75 0 0 1-.351-.92ZM15 8.25a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5H15ZM14.25 12a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 0-1.5H15Z"
                    clipRule="evenodd" />
            </svg>

            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Kontakte</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===6
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===6
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M1.5 5.625c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v12.75c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 18.375V5.625ZM21 9.375A.375.375 0 0 0 20.625 9h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5Zm0 3.75a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5a.375.375 0 0 0 .375-.375v-1.5ZM10.875 18.75a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375h7.5ZM3.375 15h7.5a.375.375 0 0 0 .375-.375v-1.5a.375.375 0 0 0-.375-.375h-7.5a.375.375 0 0 0-.375.375v1.5c0 .207.168.375.375.375Zm0-3.75h7.5a.375.375 0 0 0 .375-.375v-1.5A.375.375 0 0 0 10.875 9h-7.5A.375.375 0 0 0 3 9.375v1.5c0 .207.168.375.375.375Z"
                    clipRule="evenodd" />
            </svg>

            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Lager</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===7
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===7
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path
                    d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>
            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Mitarbeiter</span>
        </Link>

        <Link to="/" className={SideBarCollapsed ? selected===8
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : selected===8
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 0 1-.517.608 7.45 7.45 0 0 0-.478.198.798.798 0 0 1-.796-.064l-.453-.324a1.875 1.875 0 0 0-2.416.2l-.243.243a1.875 1.875 0 0 0-.2 2.416l.324.453a.798.798 0 0 1 .064.796 7.448 7.448 0 0 0-.198.478.798.798 0 0 1-.608.517l-.55.092a1.875 1.875 0 0 0-1.566 1.849v.344c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 0 1-.064.796l-.324.453a1.875 1.875 0 0 0 .2 2.416l.243.243c.648.648 1.67.733 2.416.2l.453-.324a.798.798 0 0 1 .796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.344c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 0 1 .517-.608 7.52 7.52 0 0 0 .478-.198.798.798 0 0 1 .796.064l.453.324a1.875 1.875 0 0 0 2.416-.2l.243-.243c.648-.648.733-1.67.2-2.416l-.324-.453a.798.798 0 0 1-.064-.796c.071-.157.137-.316.198-.478.1-.267.327-.47.608-.517l.55-.091a1.875 1.875 0 0 0 1.566-1.85v-.344c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 0 1-.608-.517 7.507 7.507 0 0 0-.198-.478.798.798 0 0 1 .064-.796l.324-.453a1.875 1.875 0 0 0-.2-2.416l-.243-.243a1.875 1.875 0 0 0-2.416-.2l-.453.324a.798.798 0 0 1-.796.064 7.462 7.462 0 0 0-.478-.198.798.798 0 0 1-.517-.608l-.091-.55a1.875 1.875 0 0 0-1.85-1.566h-.344ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
                    clipRule="evenodd" />
            </svg>

            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Firmenseinstellungen</span>
        </Link>

        <a onClick={()=> setSideBarCollapsed(!SideBarCollapsed)} className={SideBarCollapsed ?
            "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center h-14 w-full rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-left pl-4 h-14 w-full rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={SideBarCollapsed
                ? "size-6" : "hidden" }>
                <path fillRule="evenodd"
                    d="M13.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                    clipRule="evenodd" />
                <path fillRule="evenodd"
                    d="M19.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06L17.69 12l-6.97-6.97a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
                    clipRule="evenodd" />
            </svg>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={SideBarCollapsed
                ? "hidden" : "size-6" }>
                <path fillRule="evenodd"
                    d="M10.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L12.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z"
                    clipRule="evenodd" />
                <path fillRule="evenodd"
                    d="M4.72 11.47a.75.75 0 0 0 0 1.06l7.5 7.5a.75.75 0 1 0 1.06-1.06L6.31 12l6.97-6.97a.75.75 0 0 0-1.06-1.06l-7.5 7.5Z"
                    clipRule="evenodd" />
            </svg>

            <span className={SideBarCollapsed ? "hidden" : "pl-2 block" }>Einkalppen</span>
        </a>

    </div>
</nav>
)};
export default SideBar;