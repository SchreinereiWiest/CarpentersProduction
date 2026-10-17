/** Einheitliche Transaktionsoptionen für konsistente Reads und konkurrierende Änderungen. */
export const READ_OPTIONS = { isolationLevel: 'RepeatableRead' };
export const WRITE_OPTIONS = { isolationLevel: 'Serializable' };

/** Nur die für die Stundenanalyse benötigten Personaldaten verlassen die Datenbank. */
export const TIME_ENTRY_SELECT = {
  id: true, userId: true, workType: true, customWorkType: true, duration: true,
  startedAt: true, endedAt: true,
  user: { select: { firstName: true, lastName: true, login: true } },
};
