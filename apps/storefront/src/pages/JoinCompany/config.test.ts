import { getJoinCompanyFormId, JOIN_COMPANY_FORM_IDS } from './config';

describe('getJoinCompanyFormId', () => {
  it('uses the Italian form for the Italian locale', () => {
    expect(getJoinCompanyFormId('it')).toBe(JOIN_COMPANY_FORM_IDS.it);
  });

  it('uses the English form for the English locale', () => {
    expect(getJoinCompanyFormId('en')).toBe(JOIN_COMPANY_FORM_IDS.en);
  });

  it('falls back to the English form for other locales', () => {
    expect(getJoinCompanyFormId('fr')).toBe(JOIN_COMPANY_FORM_IDS.en);
  });
});
