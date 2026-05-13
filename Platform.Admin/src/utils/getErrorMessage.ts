import { getIntl } from '@umijs/max';

export function getErrorMessage(response: { errorCode?: string; message?: string }, fallbackId: string): string {
  const intl = getIntl();
  if (response.errorCode) {
    return intl.formatMessage({ id: response.errorCode });
  }
  return response.message || intl.formatMessage({ id: fallbackId });
}
