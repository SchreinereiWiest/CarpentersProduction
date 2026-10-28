import axios from "axios";

export async function loadCustomerCrm(customerId, { signal } = {}) {
  const { data } = await axios.get(`/api/customers/crm/${customerId}`, { signal });
  return data;
}

export async function createCustomerCommunication(customerId, payload) {
  const { data } = await axios.post(`/api/customers/crm/${customerId}/communications`, payload);
  return data.communication;
}

export async function updateCustomerCommunication(customerId, communicationId, payload) {
  const { data } = await axios.put(
    `/api/customers/crm/${customerId}/communications/${communicationId}`,
    payload
  );
  return data.communication;
}

export async function deleteCustomerCommunication(customerId, communicationId) {
  await axios.delete(`/api/customers/crm/${customerId}/communications/${communicationId}`);
}

export async function createCustomerAppointment(customerId, payload) {
  const { data } = await axios.post(`/api/customers/crm/${customerId}/appointments`, payload);
  return data.appointment;
}

export async function updateCustomerAppointment(customerId, appointmentId, payload) {
  const { data } = await axios.put(
    `/api/customers/crm/${customerId}/appointments/${appointmentId}`,
    payload
  );
  return data.appointment;
}

export async function deleteCustomerAppointment(customerId, appointmentId) {
  await axios.delete(`/api/customers/crm/${customerId}/appointments/${appointmentId}`);
}
