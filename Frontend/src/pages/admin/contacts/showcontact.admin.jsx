import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";

function ShowContacts() {
//Id aus Url params laden
const { userid } = useParams();
const navigate = useNavigate();

const [customer, setCustomer] = useState(null);
const [projects, setProjects] = useState([]);

useEffect(() => {
const fetchCustomer = async () => {
const { data } = await axios.get(`/api/customers/get/${userid}`);
setCustomer(data.customer);
};

fetchCustomer();
}, [userid]);

useEffect(() => {
const fetchProjects = async () => {
const projects = await axios.get(`/api/projects/getAll/${userid}`);
setProjects(projects.data.projects);
};


fetchProjects();
}, [userid]);

return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} className="flex-1" />

        <main className="pt-10 h-full flex-1 overflow-y-auto">

            <div className="justify-left pl-8">
                <div className="relative flex items-left">
                    <h2 className="text-2xl font-bold mt-2">{customer?.firstName} {customer?.lastName}</h2>
                    <div className="relative left-8">
                        <Link to={`/Kontakte/edit/${userid}`}
                            className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        
                        <span className="ml-2 text-gray-300 font-medium">Edit</span>
                        </Link>
                    </div>
                    <div className="absolute left-1/3 mt-2">
                        <h2 className="text-2xl font-bold">Projekte:</h2>
                    </div>
                    <div className="absolute right-24">
                         <Link to={`/Kontakte/NewProject/${userid}`}
                            className="bg-gray-700 text-white rounded-full h-12 w-full mx-4 flex items-center justify-center hover:bg-gray-600 transition duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                            className="size-6">
                            <path fillRule="evenodd"
                                d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd" />
                        </svg>
                        <span className="ml-2 text-gray-300 font-medium">New Project</span>
                        </Link>
                    </div>
                </div>
                <div className="relative flex items-left">
                    <div className="relative items-left w-2/5">
                        <p className="">{customer?.companyName}</p>
                        <p className="">{customer?.email}</p>
                        <p className="">{customer?.phoneMobile}</p>
                        <p className="">{customer?.phoneLandline}</p>
                        <p className="">{customer?.preferredContact}</p>
                        <p className="">{customer?.newsletterOptIn}</p>
                        <p className="">{customer?.customerStatus}</p>
                        <p className="">{customer?.customerRating}</p>
                        <p className="">{customer?.source}</p>

                        {customer?.addresses.map((address, index) => (
                        <div key={address.id} className="mt-4">
                            <p className="">{address.street} {address.houseNumber}</p>
                            <p className="">{address.postalCode} {address.city}</p>
                            <p className="">{address.state}</p>
                            <p className="">{address.country}</p>
                            <p className="">{address.floor}</p>
                            <p className="">{address.parkingInfo}</p>
                        </div>
                    
                        ))}
                    </div> 

                    <div className="rounded-lg absolute left-1/3 mt-4 flex justify-left right-18 overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Title</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">StartDate</th>

                                </tr>
                            </thead>

                            <tbody>

                                {projects.map((project) => (
                                <tr key={project.id} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
                                    onClick={()=> {navigate(`/Projects/${project.id}`)}}
                                    >
                                    <td className="py-4 px-6">
                                        {project.title}
                                    </td>

                                    <td className="py-4 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </main>

    </div>
</>
);
}

export default ShowContacts;