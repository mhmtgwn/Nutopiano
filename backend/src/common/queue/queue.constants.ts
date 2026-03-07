export const STANDARD_QUEUE_JOB_OPTIONS = {
  attempts: 3,
  removeOnComplete: 1000,
  removeOnFail: 2000,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
};
