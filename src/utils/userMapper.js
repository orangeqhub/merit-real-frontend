import { resolveAssetUrl } from '../api/client';

/**
 * Maps merit-api user payloads to the shape merit-ui screens expect.
 * API: role CUSTOMER|AGENT|ADMIN, status ACTIVE|PENDING|...
 * UI:  role customer|agent|admin, status approved|pending|rejected|...
 */

const STATUS_MAP = {
  ACTIVE: 'approved',
  PENDING: 'pending',
  INACTIVE: 'inactive',
  SUSPENDED: 'inactive',
  REJECTED: 'rejected',
};

function media(path) {
  return path ? resolveAssetUrl(path) : null;
}

export function mapApiUserToUi(apiUser) {
  if (!apiUser) return null;

  const role = String(apiUser.role || '').toLowerCase();
  const statusRaw = String(apiUser.status || '').toUpperCase();
  const status = STATUS_MAP[statusRaw] || String(apiUser.status || '').toLowerCase();

  return {
    id: apiUser.id,
    memberId: apiUser.memberId || null,
    name: apiUser.name,
    email: apiUser.email,
    mobile: apiUser.mobile,
    role,
    roleLabel: apiUser.roleLabel || role,
    status,
    district: apiUser.district || null,
    city: apiUser.city || null,
    address: apiUser.address || null,
    preferredPropertyType: apiUser.preferredPropertyType || null,
    occupation: apiUser.occupation || null,
    profilePhoto: media(apiUser.profilePhoto),
    identityProof: media(apiUser.identityProof || apiUser.aadhaarProofPath),
    addressProof: media(apiUser.addressProof || apiUser.panProofPath),
    aadhaarNumber: apiUser.aadhaarNumber || null,
    panNumber: apiUser.panNumber || null,
    aadhaarProofPath: media(apiUser.aadhaarProofPath || apiUser.identityProof),
    panProofPath: media(apiUser.panProofPath || apiUser.addressProof),
    rejectionReason: apiUser.rejectionReason || null,
    approvedAt: apiUser.approvedAt || null,
    agentCategoryId: apiUser.agentCategoryId || null,
    agentCategory: apiUser.agentCategory || null,
    agentGrade: apiUser.agentGrade || null,
    agentGradeLabel: apiUser.agentGradeLabel || null,
    score: apiUser.score != null ? Number(apiUser.score) : null,
    referralAgentId: apiUser.referralAgentId || null,
    referralAgent: apiUser.referralAgent || null,
    lastLoginAt: apiUser.lastLoginAt || null,
    createdAt: apiUser.createdAt || null,
    permissions: apiUser.permissions || [],
  };
}

export function mapApplicationStatus(apiStatus) {
  if (!apiStatus) return null;
  const statusRaw = String(apiStatus.status || '').toUpperCase();
  return {
    ...apiStatus,
    role: String(apiStatus.role || '').toLowerCase(),
    status: STATUS_MAP[statusRaw] || String(apiStatus.status || '').toLowerCase(),
  };
}
