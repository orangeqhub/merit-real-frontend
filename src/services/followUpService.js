import { enquiryService } from './enquiryService';

export function isOverdue(followUp) {
  if (!followUp?.dueDate || followUp.status === 'completed' || followUp.status === 'cancelled') return false;
  const due = new Date(`${followUp.dueDate}${followUp.dueTime ? `T${followUp.dueTime}` : 'T23:59:59'}`);
  return due.getTime() < Date.now();
}

function enquiryToFollowUp(enquiry) {
  if (!enquiry?.nextFollowUpAt) return null;
  const when = new Date(enquiry.nextFollowUpAt);
  if (Number.isNaN(when.getTime())) return null;
  return {
    id: `enquiry-${enquiry.id}`,
    enquiryId: enquiry.id,
    type: 'enquiry_followup',
    title: enquiry.buyerName || enquiry.customer?.name || 'Lead follow-up',
    buyerName: enquiry.buyerName || enquiry.customer?.name || null,
    buyerPhone: enquiry.buyerPhone || enquiry.customer?.mobile || null,
    propertyTitle: enquiry.propertyTitle || enquiry.propertyName || null,
    dueDate: when.toISOString().slice(0, 10),
    dueTime: when.toISOString().slice(11, 16),
    nextFollowUpAt: enquiry.nextFollowUpAt,
    status: enquiry.status === 'converted' || enquiry.status === 'closed' ? 'completed' : 'pending',
    priority: enquiry.priority || 'medium',
    notes: enquiry.message || '',
  };
}

const notReady = (name) => async () => {
  throw new Error(`${name} API not implemented yet`);
};

export const followUpService = {
  getFollowUps: async () => [],
  getAllFollowUps: async () => [],
  getAssignedFollowUps: async (user) => {
    const list = await enquiryService.getAssignedEnquiries(user);
    return (list || [])
      .map(enquiryToFollowUp)
      .filter(Boolean)
      .sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt)));
  },
  getFollowUpById: async () => null,
  createFollowUp: notReady('Follow-up'),
  updateFollowUp: notReady('Follow-up'),
  start: notReady('Follow-up'),
  complete: notReady('Follow-up'),
  cancel: notReady('Follow-up'),
  reschedule: notReady('Follow-up'),
  addNote: notReady('Follow-up'),
  completeFollowUp: notReady('Follow-up'),
};
