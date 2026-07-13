import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";

//Untermenü in Kontakte, um ein neues Projekt für den Kunden zu erstellen.

function ShowProject() {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);

  const [files, setfiles] = useState([]);
  const { projectId } = useParams();

  useEffect(() => {
const fetchProject = async () => {
const { data } = await axios.get(`/api/projects/get/${projectId}`);
setProject(data.project);
    
    if(data.project.files.length > 0) {
    }
};

fetchProject();
}, [projectId]);

    console.log(project);



  return (<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={2} />

        <main className="pt-12 pl-12 h-full w-full overflow-y-auto">
            <div className="justify-left">

                    <div className="w-1/5">

                        <div className="mb-5">

                            <h2 className="text-2xl font-bold">{project?.title}</h2>
                        </div>

                    </div>
                    <div className="mb-5 w-2/5">
                        <textBox>{project?.description}</textBox>
                                                </div>

                        <div className="absolute right-20 mt-18 w-2/5">

                        </div> 
                
            </div>
    </main>
  </div>
</>
);
}

export default ShowProject;