import { Link } from "react-router";
import { useParams } from 'react-router';
import ProtectedElement from '../../app/routing/ProtectedElement.jsx';

function ProjectBar({selected=0}) {

    const { projectId } = useParams();

return (
<nav aria-label="Projektnavigation" className="project-bar bg-gray-800 xl:h-20 h-16 w-full overflow-x-auto overflow-y-hidden">
    <div className="project-bar__items relative flex w-max min-w-full xl:space-x-3 space-x-2 xl:p-3 p-2"
         >

        <Link to={`/Projects/${projectId}`} aria-label="Projektübersicht" title="Projektübersicht" className={selected===0
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 ">
                <path
                    d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                <path
                    d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
        </Link>

        <Link to={`/Projects/Aufmas/${projectId}`} aria-label="Aufmaß" title="Aufmaß" className={selected===1
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
            <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
            </svg>


        </Link>

        <Link to={`/Projects/Cabinet/${projectId}`} aria-label="Schrankkonfigurator" title="Schrankkonfigurator" className={selected===2
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path d="M6 3a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h2.25a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6ZM15.75 3a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3H18a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2.25ZM6 12.75a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h2.25a3 3 0 0 0 3-3v-2.25a3 3 0 0 0-3-3H6ZM17.625 13.5a.75.75 0 0 0-1.5 0v2.625H13.5a.75.75 0 0 0 0 1.5h2.625v2.625a.75.75 0 0 0 1.5 0v-2.625h2.625a.75.75 0 0 0 0-1.5h-2.625V13.5Z" />
</svg>


        </Link>

        <Link to={`/Projects/List/${projectId}`} aria-label="Stückliste" title="Stückliste" className={selected===3
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clipRule="evenodd" />
  <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375ZM6 12a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V12Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 15a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V15Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 18a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V18Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
</svg>

        </Link>

        <Link to={`/Projects/Nesting/${projectId}`} aria-label="Nesting" title="Nesting" className={selected===4
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path fillRule="evenodd" d="M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 0 1 1.5 10.875v-3.75Zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v8.25c0 1.035-.84 1.875-1.875 1.875h-5.25a1.875 1.875 0 0 1-1.875-1.875v-8.25ZM3 16.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875v2.25c0 1.035-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0 1 3 18.375v-2.25Z" clipRule="evenodd" />
</svg>

        </Link>

        <Link to={`/Projects/Cut/${projectId}`} aria-label="Zuschnitt" title="Zuschnitt" className={selected===5
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path d="M5.566 4.657A4.505 4.505 0 0 1 6.75 4.5h10.5c.41 0 .806.055 1.183.157A3 3 0 0 0 15.75 3h-7.5a3 3 0 0 0-2.684 1.657ZM2.25 12a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3v-6ZM5.25 7.5c-.41 0-.806.055-1.184.157A3 3 0 0 1 6.75 6h10.5a3 3 0 0 1 2.683 1.657A4.505 4.505 0 0 0 18.75 7.5H5.25Z" />
</svg>


        </Link>

        <Link to={`/Projects/Cnc/${projectId}`} aria-label="CNC" title="CNC" className={selected===6
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path fillRule="evenodd" d="M2.25 6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V6Zm3.97.97a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 0 1 0-1.06Zm4.28 4.28a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" />
</svg>


        </Link>

        <Link to={`/Projects/Attachments/${projectId}`} aria-label="Anlagen und Fertigungspläne" title="Anlagen und Fertigungspläne" className={selected===10
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
            </svg>

        </Link>

        <Link to={`/Projects/Time/${projectId}`} aria-label="Zeiterfassung" title="Zeiterfassung" className={selected===7
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
  <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clipRule="evenodd" />
</svg>

        </Link>

        <ProtectedElement requiredRole="user" requiredFeature="shop">
        <Link to={`/Projects/Purchasing/${projectId}`} aria-label="Projekt-Einkaufswagen" title="Projekt-Einkaufswagen" className={selected===9
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
        <path d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
        </svg>

        </Link>
        </ProtectedElement>

        <ProtectedElement requiredRole="user" requiredFeature="calculation">

            <Link to={`/Projects/Calculation/${projectId}`} aria-label="Kalkulation" title="Kalkulation" className={selected===11
                ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
                : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
                }>

                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd" d="M3.75 3.375c0-1.036.84-1.875 1.875-1.875H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375Zm7.464 9.442c.459-.573 1.019-.817 1.536-.817.517 0 1.077.244 1.536.817a.75.75 0 1 0 1.171-.937c-.713-.892-1.689-1.38-2.707-1.38-1.018 0-1.994.488-2.707 1.38a4.61 4.61 0 0 0-.705 1.245H8.25a.75.75 0 0 0 0 1.5h.763c-.017.25-.017.5 0 .75H8.25a.75.75 0 0 0 0 1.5h1.088c.17.449.406.87.705 1.245.713.892 1.689 1.38 2.707 1.38 1.018 0 1.994-.488 2.707-1.38a.75.75 0 0 0-1.171-.937c-.459.573-1.019.817-1.536.817-.517 0-1.077-.244-1.536-.817-.078-.098-.15-.2-.215-.308h1.751a.75.75 0 0 0 0-1.5h-2.232a3.965 3.965 0 0 1 0-.75h2.232a.75.75 0 0 0 0-1.5H11c.065-.107.136-.21.214-.308Z" clipRule="evenodd" />
                <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
                </svg>


            </Link>
        </ProtectedElement>

        <Link to={`/Projects/Settings/${projectId}`} aria-label="Projekteinstellungen" title="Projekteinstellungen" className={selected===8
            ? "bg-gray-900 text-white flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            : "text-gray-400 hover:bg-gray-700 flex-shrink-0 inline-flex items-center justify-center xl:h-14 xl:w-14 h-12 w-12 rounded-lg"
            }>

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                <path fillRule="evenodd"
                    d="M11.828 2.25c-.916 0-1.699.663-1.85 1.567l-.091.549a.798.798 0 0 1-.517.608 7.45 7.45 0 0 0-.478.198.798.798 0 0 1-.796-.064l-.453-.324a1.875 1.875 0 0 0-2.416.2l-.243.243a1.875 1.875 0 0 0-.2 2.416l.324.453a.798.798 0 0 1 .064.796 7.448 7.448 0 0 0-.198.478.798.798 0 0 1-.608.517l-.55.092a1.875 1.875 0 0 0-1.566 1.849v.344c0 .916.663 1.699 1.567 1.85l.549.091c.281.047.508.25.608.517.06.162.127.321.198.478a.798.798 0 0 1-.064.796l-.324.453a1.875 1.875 0 0 0 .2 2.416l.243.243c.648.648 1.67.733 2.416.2l.453-.324a.798.798 0 0 1 .796-.064c.157.071.316.137.478.198.267.1.47.327.517.608l.092.55c.15.903.932 1.566 1.849 1.566h.344c.916 0 1.699-.663 1.85-1.567l.091-.549a.798.798 0 0 1 .517-.608 7.52 7.52 0 0 0 .478-.198.798.798 0 0 1 .796.064l.453.324a1.875 1.875 0 0 0 2.416-.2l.243-.243c.648-.648.733-1.67.2-2.416l-.324-.453a.798.798 0 0 1-.064-.796c.071-.157.137-.316.198-.478.1-.267.327-.47.608-.517l.55-.091a1.875 1.875 0 0 0 1.566-1.85v-.344c0-.916-.663-1.699-1.567-1.85l-.549-.091a.798.798 0 0 1-.608-.517 7.507 7.507 0 0 0-.198-.478.798.798 0 0 1 .064-.796l.324-.453a1.875 1.875 0 0 0-.2-2.416l-.243-.243a1.875 1.875 0 0 0-2.416-.2l-.453.324a.798.798 0 0 1-.796.064 7.462 7.462 0 0 0-.478-.198.798.798 0 0 1-.517-.608l-.091-.55a1.875 1.875 0 0 0-1.85-1.566h-.344ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
                    clipRule="evenodd" />
            </svg>

        </Link>

        

    </div>
</nav>
)};
export default ProjectBar;
