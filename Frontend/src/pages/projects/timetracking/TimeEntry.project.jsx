export default function DurationInput({
    value = 0,
    onChange,
    disabled = false
}) {

    const hours = Math.floor(value / 60);
    const minutes = Math.floor(value % 60);


    function updateTime(type, newValue) {

        let h = hours;
        let m = minutes;


        if(type === "hours") {
            h = Math.max(0, Number(newValue) || 0);
        }


        if(type === "minutes") {
            m = Math.max(0, Number(newValue) || 0);
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
