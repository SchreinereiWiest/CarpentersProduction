import axios from "axios";

export const loadCustomerCommercial = async customerId => {
  const [commissions, documents] = await Promise.all([
    axios.get(`/api/commercial/customers/${customerId}/commissions`),
    axios.get(`/api/commercial/customers/${customerId}/documents`)
  ]);
  return {
    commissions: commissions.data.commissions || [],
    documents: documents.data.documents || []
  };
};

export const createCommission = (customerId, input) => axios.post(`/api/commercial/customers/${customerId}/commissions`, input);
export const deleteCommission = id => axios.delete(`/api/commercial/commissions/${id}`);
export const loadCommission = id => axios.get(`/api/commercial/commissions/${id}/workspace`).then(response => response.data.commission);
export const saveCommissionCalculation = (id, calculation) => axios.put(`/api/commercial/commissions/${id}/calculation`, calculation);

export const createCommercialDocument = input => axios.post("/api/commercial/documents", input).then(response => response.data.document);
export const loadCommercialDocument = id => axios.get(`/api/commercial/documents/${id}`).then(response => response.data.document);
export const saveCommercialDocument = (id, input) => axios.put(`/api/commercial/documents/${id}`, input).then(response => response.data.document);
export const loadDocumentTemplates = () => axios.get("/api/commercial/templates").then(response => response.data.templates || []);
