import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx'
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';

//Untermenü in Kontakte, um ein neues Projekt für den Kunden zu erstellen.

function NewProject() {
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [pcadFile, setPcadFile] = useState(null);

  const { userid } = useParams();

    const handleSubmit = async (e) => {
        
        e.preventDefault();

        const project = await axios.post("/api/projects/new", {
            customerId: userid,
            title: projectName,
            description: projectDescription
        },
            {
                withCredentials: true
            });
            
        console.log(project.data.id);

        if (pcadFile) {
            files.push(pcadFile);
        }

        for (const file of files) {

            const response = await axios.post("/api/files/upload-url",
            {
                entityId: project.data.id,
                customerId: userid,
                entity: "project",
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size
            });

            console.log("Upload URL:", response.data.uploadUrl);

            const s3response = await axios.put(
                response.data.uploadUrl,
                file,
                {
                    headers:{
                        "Content-Type": file.type
                    }
                }
            );
            
            console.log(response.data.fileEntry.id);

            await axios.post(`/api/files/complete/`, {
                    id: response.data.fileEntry.id
                }
        );
        }

        navigate(`/kontakte/info/${userid}`);
        console.log("Project created successfully");
    };

  return (<>
    <div className='h-screen bg-gray-900 text-white flex justify-left'>

        <SideBar selected={5} />

        <main className="pt-12 pl-12 h-full w-full overflow-y-auto">
            <div className="justify-left">

                <form className="flex flex-col" onSubmit={handleSubmit}>
                    <div className="w-1/5">

                        <div className="mb-5">

                            <input type="text" name="projectName" id="projectName" placeholder="Project Name"
                                value={projectName} onChange={(e)=> setProjectName(e.target.value)}
                            className="w-full rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base
                            font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md" />
                        </div>

                    </div>
                    <div className="mb-5 w-2/5">
                        <textarea name="projectDescription" id="projectDescription" placeholder="Project Description"
                            value={projectDescription} onChange={(e)=> setProjectDescription(e.target.value)}
                                className="w-full h-48 rounded-md border border-[#e0e0e0] bg-white py-3 px-6 text-base font-medium text-[#6B7280] outline-none focus:border-[#6A64F1] focus:shadow-md resize-none"
                            />
                        </div>

                        <div className="mb-5 w-2/5">
                    <a className="w-full" href="#">
                        <link rel="stylesheet"
                            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
                        </link>
                        <div className="w-full">
                            <div
                                className="relative h-48 rounded-md border-2 border-[#e0e0e0] bg-gray-100 flex justify-center items-center">

                                <div className="absolute">

                                    <div className="flex flex-col items-center">
                                        <i className="fa fa-folder-open fa-4x text-blue-700"></i>
                                        <span className="block text-gray-400 font-normal">Attach Images Here</span>
                                    </div>
                                </div>

                                <input className="w-full h-full opacity-0" type="file" multiple accept='.jpg, .png' onChange={(e)=>{
                                setFiles(Array.from(e.target.files));
                                }}
                                />

                            </div>
                        </div>
                    </a>
                </div>

                <div className="space-y-2">

                    {files.map(file=>(
                    <div key={file.name} className="bg-gray-700 rounded p-2 w-2/5">
                        {file.name}
                    </div>
                    ))}

                </div>

                        <div className="absolute right-20 mt-18 w-2/5">

                        <div className="mb-5">
                            {pcadFile ? (
                                <div className="space-y-2">

                    
                    <div key={pcadFile.name} className="bg-gray-700 rounded p-2 w-full h-48 text-center">
                        {pcadFile.name}
                    </div>
                    

                </div>) : (
                                
      <a className="w-full" href="#">
        <link rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        </link>
        <div className="w-full">
          <div
            className="relative h-48 rounded-md border-2 border-[#e0e0e0] bg-gray-100 flex justify-center items-center">

            <div className="absolute">

              <div className="flex flex-col items-center">
                <i className="fa fa-folder-open fa-4x text-blue-700"></i>
                <span className="block text-gray-400 font-normal">Attach GLB or PCAD File</span>
              </div>
            </div>

            <input className="w-full h-full opacity-0"
                type="file"
                single
                accept=".glb,.json"
                onChange={(e)=>{
                    setPcadFile(Array.from(e.target.files)[0]);
                }}
/>

          </div>
        </div>
      </a>)}

    </div>
          
                      
                            <button type="submit"
                    className="hover:shadow-form w-full rounded-md bg-gray-700 hover:bg-gray-600 duration-300 py-3 px-8 text-center text-base font-semibold text-white outline-none">
                    Speichern
                    </button>

                        </div>

                    </form>
                
            </div>
    </main>
  </div>
</>
);
}

export default NewProject;