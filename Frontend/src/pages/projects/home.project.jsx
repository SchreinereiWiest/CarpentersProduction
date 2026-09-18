import { useState } from 'react'
import SideBar from '../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../components/projectBar.jsx';
import ImageGallery from '../../components/images/imageGalery.jsx';

//Untermenü in Kontakte, um ein neues Projekt für den Kunden zu erstellen.

function ShowProject() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);

  const [files, setfiles] = useState([]);
  const { projectId } = useParams();

  useEffect(() => {
    const fetchProject = async () => {
    const { data } = await axios.get(`/api/projects/get/${projectId}`);
    setProject(data.project);

    const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
    setCustomer(customerdata.data.customer);
    
};

fetchProject();
}, [projectId]);

    // console.log(project);

console.log(customer);
  return (
    <>
        <div className="bg-gray-900 text-white h-dvh w-full flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={0}/>
        </div>
                <div className="pl-8 pt-4 pr-4 overflow-y-auto">

                    {/* Kunde + Bilder */}
                    <div className="flex flex-col md:flex-row md:items-center">

                        <h2 className="text-2xl font-bold mt-2 truncate md:w-1/5">
                            {customer?.lastName}
                        </h2>

                        <h2 className="text-2xl font-bold mt-2 md:ml-0">
                            Bilder:
                        </h2>

                    </div>

                    {/* Projektname */}
                    <h2 className="text-2xl font-bold mt-2 truncate">
                        {project?.title}
                    </h2>

                    {/* Beschreibung + Bilder */}
                    <div className="flex flex-col md:flex-row">

                        {/* Beschreibung */}
                        <div className="w-full md:w-1/5 pt-4 pr-4">
                            {project?.description}
                        </div>

                        {/* Bilder */}
                        <div className="rounded-lg mt-4 md:mt-4 md:flex-1 overflow-hidden">
                            <ImageGallery files={project?.files} />
                        </div>

                    </div>

                </div>

            </main>
        </div>
    </>
);
}

export default ShowProject;