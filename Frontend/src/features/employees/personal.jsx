import EmployeeCalendar from "./employeeCalendar.jsx";
import MissingTimes from "./missingTimes.jsx";
import SideBar from "../../shared/components/sideBar.jsx";
import { useEmployeeCalendar } from "./calendar/employeeHook.js";
import EditTimeModal from "./editTimeModal.jsx";
import { useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../app/providers/AuthContext.js";
import useCompanySettings from "../../shared/hooks/useCompanySettings.js";

export default function Personal() {

    const { settings, loading: companySettingsLoading } = useCompanySettings();
    const Calendar = useEmployeeCalendar(settings);
    const { user, loading } = useAuth();

    useEffect(() => {
        if(!user || loading || companySettingsLoading) return;

        Calendar.setUser(user); 

        

        const fetchProjects = async () => {
        const result = await axios.get(`/api/projects/getActive`);
        Calendar.setProjects(result.data.projects);
        const res = await Calendar.loadWeek(user, Calendar);
        Calendar.setWeekData(res.weekData);

        // await Calendar.loadDayEntries(data, user);
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

    // Calendar exposes the current hook state as one object. The effect must run
    // only when authentication or the loaded company configuration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, loading, companySettingsLoading, settings]);

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


            <main className="personal-main
                flex-1
                min-w-0
                p-3
                overflow-y-auto
                sm:p-6
            ">

                <h1 className="
                    text-2xl
                    font-semibold
                    mb-5
                ">
                    Meine Arbeitszeit
                </h1>


                <div className="personal-layout
                    grid
                    grid-cols-1
                    gap-4
                ">

                    <div className="personal-calendar">
                        <EmployeeCalendar

                            data={Calendar}

                        />
                    </div>

                    <div className="personal-open-times">
                        <MissingTimes

                            entries={Calendar.missingEntries}

                            selected={Calendar.selectedOpenEntry}

                            setSelected={Calendar.selectOpenEntry}

                            workTypes={Calendar.workTypes}

                            assigningEntryId={Calendar.assigningEntryId}

                            message={Calendar.assignmentMessage}

                        />
                    </div>

<EditTimeModal

    key={Calendar.editingSlot?.id ?? "closed"}

    open={Calendar.editModalOpen}

    slot={Calendar.editingSlot}

    blocks={Calendar.blocks}

    workTypes={Calendar.workTypes}

    projects={Calendar.projects}

    onClose={Calendar.closeEditor}

    onSave={Calendar.saveEditedSlot}

    onDelete={Calendar.deleteSlot}

    mode={Calendar.editMode}

    Cal={Calendar}

/>


                </div>


            </main>


        </div>

    );

}
