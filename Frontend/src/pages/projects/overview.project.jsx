import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import CreateProject from './edit/create.project.jsx';

function ProjectOverview() {

    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchProjects = async () => {
        const result = await axios.get(`/api/projects/getActive`);
        setProjects(result.data.projects);
        };

        fetchProjects();
    }, []);

    console.log(projects);
    return (
<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={2} className="flex-1" />

        <main className="xl:pt-10 pt-5 h-full flex-1 overflow-y-auto">

            <button
             onClick={() => navigate(`/Projects/create`)}
            className="
            ml-8
                flex
                items-center
                gap-3
                rounded-lg
                border
                border-gray-700
                bg-gray-800
                px-4
                py-2
                whitespace-nowrap
                text-gray-400
                transition-all
                duration-200
                hover:bg-gray-700
                hover:text-white
            "
        >
            Create Project
        </button>

            <div className="rounded-lg mt-4 flex justify-left ml-8 mr-8 overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Title</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Customer</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">StartDate</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">priority</th>
                                    <th className="w-1/4 xl:py-4 py-2 px-6 text-left text-gray-300 font-bold uppercase">Status</th>

                                </tr>
                            </thead>

                            <tbody>

                                {projects?.map((project) => (
                                <tr key={project.id} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
                                    onClick={()=> {navigate(`/Projects/${project.id}`)}}
                                    >
                                    <td className="xl:py-4 py-3 px-6">
                                        {project.title}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6">
                                        {project.customer.lastName}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.priority}
                                    </td>

                                    <td className="xl:py-4 py-3 px-6 truncate">
                                        {project.status}
                                    </td>

                                </tr>
                                ))}
                            </tbody>
                        </table>    
                    </div>
        </main>

    </div>
    </>
    );
}

export default ProjectOverview