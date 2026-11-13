import axios from "axios";

export async function loadCalendarEvents({ from, to, signal } = {}) {
  const { data } = await axios.get("/api/calendar/events", {
    params: { from: from?.toISOString(), to: to?.toISOString() },
    signal
  });
  return data.events ?? [];
}

export async function loadCalendarProjects({ signal } = {}) {
  const { data } = await axios.get("/api/calendar/projects", { signal });
  return data.projects ?? [];
}

export async function saveCalendarEvent(event) {
  const response = event.id
    ? await axios.put(`/api/calendar/events/${event.id}`, event)
    : await axios.post("/api/calendar/events", event);
  return response.data.event;
}

export async function removeCalendarEvent(id) {
  await axios.delete(`/api/calendar/events/${id}`);
}
