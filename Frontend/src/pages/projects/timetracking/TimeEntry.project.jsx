import { useEffect, useState } from "react";


export default function DurationInput({
    value = 0,
    onChange,
    disabled = false
}) {

    const [hours, setHours] = useState("00");
    const [minutes, setMinutes] = useState("00");

    useEffect(() => {

        const h = Math.floor(value / 60);
        const m = Math.floor((value % 60));

        setHours(String(h).padStart(2, "0"));
        setMinutes(String(m).padStart(2, "0"));

    }, [value]);


    function updateTime(type, newValue) {

        let h = Number(hours);
        let m = Number(minutes);


        if(type === "hours") {
            h = Number(newValue);
            setHours(newValue);
        }


        if(type === "minutes") {
            m = Number(newValue);
            setMinutes(newValue);
        }


        // Grenzen
        if(m > 59) m = 59;

        onChange(
            h * 60 + m 
            
        );

    }


    return (

        <div className="
            flex
            items-center
            justify-center
            gap-2
            mb-3
        ">


            <input

                type="number"

                min="0"

                value={hours}

                disabled={disabled}

                onChange={(e) =>
                    updateTime(
                        "hours",
                        e.target.value
                    )
                }

                className="
                no-spinner
                    w-16
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-2
                    py-2
                    text-center
                "

            />


            <span>
                :
            </span>


            <input

                type="number"

                min="0"

                max="59"

                value={minutes}

                disabled={disabled}

                onChange={(e) =>
                    updateTime(
                        "minutes",
                        e.target.value
                    )
                }

                className="
                no-spinner
                    w-16
                    rounded-lg
                    border
                    border-gray-700
                    bg-gray-800
                    px-2
                    py-2
                    text-center
                "

            />


  


            


        </div>

    );

}