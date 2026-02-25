export const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const maybeError = error as {
    response?: {
      status?: number;
      data?: { message?: unknown; error?: string };
    };
    code?: string;
    message?: string;
  };
  if (maybeError.code === 'ERR_NETWORK') return fallback;
  const message = maybeError.response?.data?.message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  if (typeof message === 'string') return message;
  if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
    if (maybeError.message.trim().toLowerCase() === 'network error') return fallback;
    return maybeError.message;
  }
  return fallback;
};

export const isConflictError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { response?: { status?: number } };
  return maybeError.response?.status === 409;
};

export const isRateLimitError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { response?: { status?: number } };
  return maybeError.response?.status === 429;
};

export const isNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; response?: unknown };
  return maybeError.code === 'ERR_NETWORK' || !maybeError.response;
};
