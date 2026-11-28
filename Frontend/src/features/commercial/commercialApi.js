import axios from "axios";

export const loadCustomerCommercial = async customerId => {
  const [commissions, documents] = await Promise.allSettled([
    axios.get(`/api/commercial/customers/${customerId}/commissions`),
    axios.get(`/api/commercial/customers/${customerId}/documents`)
  ]);
  return {
    commissions: commissions.status === "fulfilled" ? commissions.value.data.commissions || [] : [],
    documents: documents.status === "fulfilled" ? documents.value.data.documents || [] : [],
    loadErrors: [commissions, documents].filter(result => result.status === "rejected").map(result => result.reason)
  };
};

export const createCommission = (customerId, input) => axios.post(`/api/commercial/customers/${customerId}/commissions`, input);
export const deleteCommission = id => axios.delete(`/api/commercial/commissions/${id}`);
export const loadCommission = id => axios.get(`/api/commercial/commissions/${id}/workspace`).then(response => response.data.commission);
export const saveCommissionCalculation = (id, calculation) => axios.put(`/api/commercial/commissions/${id}/calculation`, calculation);

export const createCommercialDocument = input => axios.post("/api/commercial/documents", input).then(response => response.data.document);
export const loadCommercialDocument = id => axios.get(`/api/commercial/documents/${id}`).then(response => response.data.document);
export const saveCommercialDocument = (id, input) => axios.put(`/api/commercial/documents/${id}`, input).then(response => response.data.document);
export const loadCommercialDocumentAssignees = () => axios.get("/api/commercial/document-assignees").then(response => response.data.assignees || []);
export const assignCommercialDocument = (id, userId) => axios.put(`/api/commercial/documents/${id}/assignee`, { userId: userId || null }).then(response => response.data.document);
