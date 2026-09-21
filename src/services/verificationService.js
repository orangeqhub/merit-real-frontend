const notReady = (name) => async () => {
  throw new Error(`${name} API not implemented yet`);
};

export const verificationService = {
  list: async () => [],
  getAssignedVerifications: async () => [],
  getById: async () => null,
  startReview: notReady('Verification'),
  markComplete: notReady('Verification'),
  addCorrectionRequest: notReady('Verification'),
  recommendApproval: notReady('Verification'),
  recommendRejection: notReady('Verification'),
  recommend: notReady('Verification'),
  requestCorrection: notReady('Verification'),
};
