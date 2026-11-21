export class TimeEntryTimingError extends Error {
    constructor(message) {
        super(message);
        this.name = "TimeEntryTimingError";
    }
}

const isProvided = value => value !== undefined && value !== null && value !== "";

const dateValue = (value, label) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new TimeEntryTimingError(`${label} ist ungültig.`);
    return date;
};

const durationValue = value => {
    const duration = Number(value);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 24 * 60) {
        throw new TimeEntryTimingError("Die Dauer muss eine positive ganze Minutenzahl sein.");
    }
    return duration;
};

export function normalizeTimeEntryTiming(input = {}, { allowDurationOnly = false } = {}) {
    const hasStart = isProvided(input.startTime);
    const hasEnd = isProvided(input.endTime);
    const hasDuration = isProvided(input.duration);

    if (allowDurationOnly && !hasStart && !hasEnd && hasDuration) {
        return { startedAt: null, endedAt: null, duration: durationValue(input.duration) };
    }

    if ([hasStart, hasEnd, hasDuration].filter(Boolean).length < 2) {
        throw new TimeEntryTimingError("Mindestens zwei Angaben aus Beginn, Ende und Dauer sind erforderlich.");
    }

    let startedAt = hasStart ? dateValue(input.startTime, "Beginn") : null;
    let endedAt = hasEnd ? dateValue(input.endTime, "Ende") : null;
    let duration = hasDuration ? durationValue(input.duration) : null;

    if (startedAt && endedAt) {
        const elapsed = (endedAt.getTime() - startedAt.getTime()) / 60_000;
        if (!Number.isInteger(elapsed) || elapsed <= 0 || elapsed > 24 * 60) {
            throw new TimeEntryTimingError("Das Ende muss nach dem Beginn liegen und auf einer vollen Minute enden.");
        }
        if (duration !== null && duration !== elapsed) {
            throw new TimeEntryTimingError("Beginn, Ende und Dauer widersprechen sich.");
        }
        duration = elapsed;
    } else if (startedAt && duration !== null) {
        endedAt = new Date(startedAt.getTime() + duration * 60_000);
    } else if (endedAt && duration !== null) {
        startedAt = new Date(endedAt.getTime() - duration * 60_000);
    }

    return { startedAt, endedAt, duration };
}
