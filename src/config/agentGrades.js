/** Fixed agent grades assigned by admin during approval. */
export const AGENT_GRADES = [
  { code: 'ABP', label: 'Area Business Partner (ABP)' },
  { code: 'ABC', label: 'Area Business Coordinator (ABC)' },
  { code: 'BA', label: 'Business Advisor (BA)' },
];

/** % of the credited commission each grade takes when a deal's agent is a Business Advisor. */
export const AGENT_COMMISSION_SPLIT = {
  ABP: 20,
  ABC: 20,
  BA: 60,
};
