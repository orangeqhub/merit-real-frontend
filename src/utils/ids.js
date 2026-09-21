const ROLE_PREFIX = {
  buyer: 'BUY',
  customer: 'CUST',
  agent: 'AGT',
  seller: 'SEL',
  mediator: 'MED',
  employee: 'EMP',
  admin: 'ADM',
};

export function generateMemberId(role, sequence) {
  const year = new Date().getFullYear();
  const prefix = ROLE_PREFIX[role] || 'USR';
  const padded = String(sequence).padStart(role === 'employee' ? 4 : 6, '0');
  return `${prefix}-${year}-${padded}`;
}

export function generatePropertyId(sequence) {
  const year = new Date().getFullYear();
  return `PROP-${year}-${String(sequence).padStart(4, '0')}`;
}

export function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}
