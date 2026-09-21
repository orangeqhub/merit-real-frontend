const notReady = (name) => async () => {
  throw new Error(`${name} API not implemented yet`);
};

export const propertyModerationService = {
  list: async () => [],
  getAssignedProperties: async () => [],
  getById: async () => null,
  startReview: notReady('Moderation'),
  markComplete: notReady('Moderation'),
  requestChanges: notReady('Moderation'),
  recommendApproval: notReady('Moderation'),
  recommendRejection: notReady('Moderation'),
  recommend: notReady('Moderation'),
  requestCorrection: notReady('Moderation'),
};
