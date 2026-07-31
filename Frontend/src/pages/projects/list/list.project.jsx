import { useState } from 'react'
import SideBar from '../../../components/sideBar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { useParams } from 'react-router';
import { useEffect } from "react";
import { Link } from "react-router";
import ProjectBar from '../../../components/projectBar.jsx';
import { loadCadFile } from '../cad/cadLoader.project.js';
import { processContent } from './listProcess.project.js';
import { importCadData } from '../edit/importCAD.js';

function ListMaterial() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);

    const [cadfiles, setcadfiles] = useState([]);
    const [content, setContent] = useState([]);
    const [processedContent, setProcessedContent] = useState();

    const [loadingGeneratedData, setLoadingGeneratedData] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
        const { data } = await axios.get(`/api/projects/get/${projectId}`);
        setProject(data.project);

        const customerdata = await axios.get(`/api/customers/get/${data.project.customerId}`);
        setCustomer(customerdata.data.customer);
  
    };

    fetchProject();
    }, [projectId]);


    async function UploadData() {
        // Datei existiert nicht

        const cadFiles = project?.files?.filter(file =>
            file.fileName?.startsWith("Planung.json") ||
            file.mimeType?.startsWith("model/gltf-binary")
        ) ?? [];

        setcadfiles(cadFiles);

        const load = async () => {

            const jsonFile = cadFiles.find(file =>
                file.fileName
                    .toLowerCase()
                    .endsWith(".json")
                );

                if (!jsonFile) return;

                const result = await loadCadFile(jsonFile);
                setContent(result);
                return result;
                
            };
        

                const contentData = await load();
                console.log(contentData);
                const generatedData = processContent(contentData);
                setProcessedContent(generatedData);
                
                if (!generatedData) return;

                // Datei beim Backend erstellen
                const postResponse =
                    await axios.post(

                        `/api/projects/generated/${projectId}/list`,
                        {
                        },

                        {
                            withCredentials: true
                        }

                    );

                const jsonContent = JSON.stringify(generatedData);

                console.log(postResponse.data);

                const s3response = await axios.put(
                    postResponse.data.uploadUrl,
                    jsonContent,
                    {
                        headers: {
                            "Content-Type": jsonContent.type
                        }
                    }
                );

    }


    useEffect(() => {

        if (!projectId) {
            return;
        }

        const loadGeneratedData = async () => {

            setLoadingGeneratedData(true);

            try {

                const response = await axios.get(

                    `/api/projects/generated/${projectId}/list`,

                    {
                        withCredentials: true
                    }

                );

                const {

                    exists,

                    downloadUrl,

                } = response.data;

                console.log(response.data);


                // Datei existiert bereits
                if (exists) {

                    try {
                        const fileResponse = await fetch(
                            downloadUrl
                        );

                        const data = await fileResponse.json();


                        setProcessedContent(data);

                        return;
                    } catch (error) {
                        console.warn("cant fetch data, try new upload");
                    }

                }

                //datei existiert nicht -> neu erstellen un hochladen
                await UploadData();


            } catch (error) {

                console.error(
                    "Generated data konnte nicht geladen werden",
                    error
                );

            } finally {

                setLoadingGeneratedData(false);

            }

        };


        loadGeneratedData();

    }, [projectId, project]);


    // console.log(content);

    // useEffect(() => {
    //     if (!content.length) return;

    //     setProcessedContent(processContent(content));

    // }, [content]);


console.log(processedContent);


const leftItems = processedContent?.filter(
        item => item.Children.length > 0
    );

    const rightItems = processedContent?.filter(
        item => item.Children.length === 0
    );


return (<div className="bg-gray-900 text-white h-screen flex overflow-hidden">

    <SideBar selected={2} />

    <main className="flex-1 flex flex-col overflow-hidden">

        {/* bleibt immer oben */}
        <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-700">
            <ProjectBar selected={3}/>
        </div>

        {/* nur dieser Bereich scrollt */}
        <div className="flex overflow-y-auto">

            {/* LINKER BEREICH */}
            <div className="w-2/3 p-8">

                {leftItems?.map((item) => (

                <div className="bg-gray-800 rounded-xl p-5 shadow-lg mb-4" key={item.PID}>

                    <div className="flex justify-between items-center">

                        <div>

                            <h2 className="text-2xl font-semibold">
                                {item.Objektname}
                            </h2>

                            <p className="text-gray-400">
                                {item.L} × {item.B} × {item.T}
                            </p>

                        </div>

                        <div className="text-xl font-semibold">
                            Stück {item.Anzahl}
                        </div>

                    </div>

                    <table className="mt-6 w-full">

                        <thead>

                            <tr className="border-b border-gray-700 text-gray-400">

                                <th className="text-left py-2">Bauteil</th>
                                <th className="text-left">Material</th>
                                <th className="text-center">L</th>
                                <th className="text-center">B</th>
                                <th className="text-center">T</th>
                                <th className="text-center">Menge</th>

                            </tr>

                        </thead>

                        <tbody>

                            {item.Children.map((child) => (

                            <tr key={child.PID} className="border-b border-gray-700 hover:bg-gray-700 transition">

                                <td className="py-2">
                                    {child.Objektname}
                                </td>

                                <td className="text-gray-300">
                                    {child.MID || "-"}
                                </td>

                                <td className="text-center">
                                    {child.L}
                                </td>

                                <td className="text-center">
                                    {child.B}
                                </td>

                                <td className="text-center">
                                    {child.T}
                                </td>

                                <td className="text-center">
                                    {child.Anzahl}
                                </td>

                            </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

                ))}

            </div>

            {/* RECHTER BEREICH */}

            <div className="w-1/3 border-l border-gray-700 p-8">

                <div className='flex justify-between'>

                    <h2 className="text-xl font-semibold ">
                    Einzelteile
                </h2>

                <div className='flex'>
                    <button
             onClick={() => navigate(`/projects/create/${projectId}`, {
        state: {
            mode: "edit",
            cadData: processedContent
        }
    })}
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
            Editieren
        </button>

        <button
             onClick={() => UploadData()}
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
            Update
        </button>
        </div>

                </div>
                

                <div className="space-y-3 mt-4">

                    {rightItems?.map((item) => (

                    <div key={item.PID} className="rounded-lg bg-gray-800 p-4">

                        <div className="flex justify-between">

                            <span className="font-medium">

                                {item.Objektname}

                            </span>


                            <span>

                                x {item.Anzahl}

                            </span>

                        </div>

                        <div className="text-sm text-gray-400 mt-1 flex justify-between">

                            <span>
                            {item.L} × {item.B} × {item.T}
                            </span>
                            <span>

                                {item.MID || "-"}

                            </span>

                        </div>

                    </div>

                    ))}

                </div>

            </div>

        </div>

    </main>

</div>
);
}

export default ListMaterial 