import EmployeeCalendar from "./employeeCalendar.personal";
import MissingTimes from "./missingTimes.personal";
import SideBar from "../../components/sideBar";
import { useEmployeeCalendar } from "./employeeHook";
import EditTimeModal from "./editTimeModal.personal";
import { useState, useEffect } from 'react'
import axios from "axios";
import { useAuth } from "../../routes/AuthContext";

export default function Personal() {

    const Calendar = useEmployeeCalendar();
    const { user, loading } = useAuth();

    useEffect(() => {
        if(!user || loading) return;

        const data = Calendar.createWeek();
        Calendar.setWeekData(data);

        

        const fetchProjects = async () => {
        const result = await axios.get(`/api/projects/getActive`);
        Calendar.setProjects(result.data.projects);

        await Calendar.loadDayEntries(data, user);
        };

        fetchProjects();

        const fetchEntries = async () => {
            try {
                const { data } = await axios.get(`/api/time/open`);
                Calendar.setMissingEntries(data);

                

            } catch (error) {
                console.error("Error fetching missing entries:", error);
            }
        }

        fetchEntries();

    }, [user, loading]);

        // console.log("Week Data:", Calendar.weekData);

    return (

        <div className="
            bg-gray-900
            text-white
            flex
            h-screen
            overflow-hidden
        ">


            <SideBar selected={7}/>


            <main className="
                flex-1
                p-6
                overflow-hidden
            ">

                <h1 className="
                    text-2xl
                    font-semibold
                    mb-5
                ">
                    Meine Arbeitszeit
                </h1>


                <div className="
                    grid
                    grid-cols-[1fr_350px]
                    gap-6
                    h-[calc(100%-100px)]
                ">


                    <EmployeeCalendar

                        data={Calendar}

/>

<MissingTimes

    entries={Calendar.missingEntries}

    selected={Calendar.selectedOpenEntry}

    setSelected={Calendar.selectOpenEntry}

/>

<EditTimeModal

    open={Calendar.editModalOpen}

    slot={Calendar.editingSlot}

    blocks={Calendar.blocks}

    projects={Calendar.projects}

    onClose={Calendar.closeEditor}

    onSave={Calendar.saveEditedSlot}

    onDelete={Calendar.deleteSlot}

    mode={Calendar.editMode}

/>


                </div>


            </main>


        </div>

    );

}