import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import FileInput from "./fileImport";

function ProjectCard() {

  const [projectList, setProjectList] = useState([]);

  const getProjectCount = () => {
    axios.get("http://localhost:5000/project/Count")
      .then(response => {
        setProjectList(response.data);
      })
      .catch(error => {
        console.error("Error fetching project count:", error);
      });
  };

  // 🔥 ersetzt componentDidMount
  useEffect(() => {
    getProjectCount();
  }, []);

  if (projectList.length === 0) {
    return <div>Lade Projekte...</div>;
  }

  return (
    <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 p-4 md:p-2 xl:p-5">

      {projectList.map(project => (
        <div
          key={project.id}
          className="relative bg-white border rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700 transform transition duration-500 hover:scale-105"
        >
          <div className="absolute top-3 right-3 rounded-full bg-violet-600 text-gray-200 w-6 h-6 text-center" />

          <div className="p-2 flex justify-center">
            <a
              href={`/project?id=${project.id}`}
    
            >
              <img
                className="rounded-md"
                src={`http://localhost:5000/project/File?id=${project.id}&name=Thumb.jpg`}
                loading="lazy"
                alt=""
              />
            </a>
          </div>

          <div className="px-4 pb-3">
            <h5 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {project.id}
            </h5>

            <p className="antialiased text-gray-600 dark:text-gray-400 text-sm break-all">
              Projekt
            </p>
          </div>
        </div>
      ))}

      {/* 🔥 wichtig: Callback bleibt gleich */}
      <FileInput onUploadSuccess={getProjectCount} />

    </div>
  );
}

export default ProjectCard;