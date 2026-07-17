import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../../components/projectBar.jsx';
import ImageGallery from '../../../components/images/imageGalery.jsx';

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
  return (<>
    <div className='bg-gray-900 text-white justify-left h-screen overflow-hidden flex'>

        <SideBar selected={2} />
        

        <main className="flex-1 overflow-y-auto">

            <ProjectBar selected={0}/>

            <div className="justify-left pl-8 pt-4,">
                <div className="relative flex items-left">
                    <h2 className="text-2xl font-bold mt-2">{customer?.lastName}</h2>
                    
                    
                    <div className="absolute left-1/5 mt-2">
                        <h2 className="text-2xl font-bold">Bilder:</h2>
                    </div>
                    
                </div>
                <h2 className="text-2xl font-bold mt-2">{project?.title}</h2>
                <div className="relative flex items-left">
                    
                    <div className="relative items-left w-1/5 pt-4">
                        {project?.description}
                    </div> 

                    <div className="rounded-lg absolute left-1/5 mt-4 flex justify-left right-18 overflow-hidden">
                        <ImageGallery files={project?.files}/>     
                    </div>

                </div>
            </div>
        </main>
  </div>
</>
);
}

export default ShowProject;