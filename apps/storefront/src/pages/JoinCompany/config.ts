export const JOIN_COMPANY_FORM_IDS = {
  it: '63d51a37-fdf5-49d4-a277-ad396b7b42d7',
  en: 'bb40f86a-d31c-4dd2-8fa5-4042e674b5ef',
} as const;

export const getJoinCompanyFormId = (locale: string) =>
  locale === 'it' ? JOIN_COMPANY_FORM_IDS.it : JOIN_COMPANY_FORM_IDS.en;
