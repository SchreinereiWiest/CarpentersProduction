import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";

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

        <main className="pt-10 h-full flex-1 overflow-y-auto">
            <div className="rounded-lg mt-4 flex justify-left ml-8 mr-8 overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-800">
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Title</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Customer</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">StartDate</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">priority</th>
                                    <th className="w-1/4 py-4 px-6 text-left text-gray-300 font-bold uppercase">Status</th>

                                </tr>
                            </thead>

                            <tbody>

                                {projects?.map((project) => (
                                <tr key={project.id} className="bg-gray-700 hover:bg-gray-600 transition duration-300 cursor-pointer"
                                    onClick={()=> {navigate(`/Projects/${project.id}`)}}
                                    >
                                    <td className="py-4 px-6">
                                        {project.title}
                                    </td>

                                    <td className="py-4 px-6">
                                        {project.customer.lastName}
                                    </td>

                                    <td className="py-4 px-6 truncate">
                                        {project.startDate}
                                    </td>

                                    <td className="py-4 px-6 truncate">
                                        {project.priority}
                                    </td>

                                    <td className="py-4 px-6 truncate">
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