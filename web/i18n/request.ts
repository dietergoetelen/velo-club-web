import { getRequestConfig } from 'next-intl/server';

export const DEFAULT_LOCALE = 'nl-BE';

export default getRequestConfig(async () => {
  const locale   = DEFAULT_LOCALE;
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
    timeZone: 'Europe/Brussels',
    now:      new Date(),
  };
});
