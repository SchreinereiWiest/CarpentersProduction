import { useEffect, useState } from "react";


export default function DurationInput({
    value = 0,
    onChange,
    disabled = false
}) {

    const [hours, setHours] = useState("00");
    const [minutes, setMinutes] = useState("00");
    const [seconds, setSeconds] = useState("00");


    useEffect(() => {

        const h = Math.floor(value / 3600);
        const m = Math.floor((value % 3600) / 60);
        const s = value % 60;

        setHours(String(h).padStart(2, "0"));
        setMinutes(String(m).padStart(2, "0"));
        setSeconds(String(s).padStart(2, "0"));

    }, [value]);


    function updateTime(type, newValue) {

        let h = Number(hours);
        let m = Number(minutes);
        let s = Number(seconds);


        if(type === "hours") {
            h = Number(newValue);
            setHours(newValue);
        }


        if(type === "minutes") {
            m = Number(newValue);
            setMinutes(newValue);
        }


        if(type === "seconds") {
            s = Number(newValue);
            setSeconds(newValue);
        }


        // Grenzen
        if(m > 59) m = 59;
        if(s > 59) s = 59;


        onChange(
            h * 3600 +
            m * 60 +
            s
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