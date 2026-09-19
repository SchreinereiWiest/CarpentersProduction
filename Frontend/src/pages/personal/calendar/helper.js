
export function toMinutes(time) {
        
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;

    }



export function getBlockForEntry(entry, blocks) {

    const date = new Date(entry.startedAt);

    const entryMinutes =
        date.getHours() * 60 +
        date.getMinutes();

    return blocks.find(block => {

        // console.log(entryMinutes, toMinutes(block.start));

        const start = toMinutes(block.start);
        const end = toMinutes(block.end);

        return entryMinutes >= start && entryMinutes <= end;

    });

}



export function addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(":").map(Number);

    const totalMinutes = hours * 60 + mins + minutes;

    const resultHours = Math.floor(totalMinutes / 60) % 24;
    const resultMinutes = totalMinutes % 60;

    return `${String(resultHours).padStart(2, "0")}:${String(resultMinutes).padStart(2, "0")}:00`;
}

    export function createId() {
        return Date.now() + Math.random();
    }


        export function getCalendarWeek(weekOffset, today) {
    
            const weekStart = new Date(today);
    
        const day = weekStart.getDay(); // 0 = Sonntag, 1 = Montag ...
    
        const diff = day === 0 ? -6 : 1 - day;
    
        weekStart.setDate(weekStart.getDate() + diff);
    
        // Wochenwechsel berücksichtigen
        weekStart.setDate(weekStart.getDate() + weekOffset * 7);
    
        const d = new Date(weekStart);
    
        d.setHours(0, 0, 0, 0);
    
        // Donnerstag bestimmt das ISO-Jahr
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    
        const week1 = new Date(d.getFullYear(), 0, 4);
    
        return (
            1 +
            Math.round(
                (
                    (d - week1) / 86400000 -
                    3 +
                    ((week1.getDay() + 6) % 7)
                ) / 7
            )
        );
    }