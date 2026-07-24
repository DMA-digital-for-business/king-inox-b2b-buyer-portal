import { builder, faker } from 'tests/test-utils';

import type { LangFormatFunction } from '@/lib/lang';

import { localizeRegistrationFields } from './localizeRegistrationFields';
import type { RegisterFields } from './types';

const buildRegisterFieldWith = builder<RegisterFields>(() => ({
  name: faker.string.alpha(),
  label: faker.lorem.words(),
  fieldId: faker.string.alpha(),
  groupId: faker.number.int(),
  groupName: faker.lorem.words(),
}));

const translations: Record<string, string> = {
  'register.group.contactInformation': 'Informazioni di contatto',
  'register.field.firstName': 'Nome',
  'register.registeredSingleCheckBox.label':
    'Inviami promozioni speciali e aggiornamenti tramite email',
};

const translate: LangFormatFunction = (id) => translations[id] ?? id;

describe('localizeRegistrationFields', () => {
  it('localizes standard field labels and section headings', () => {
    const field = buildRegisterFieldWith({
      fieldId: 'field_first_name',
      groupId: 1,
    });

    const [localizedField] = localizeRegistrationFields([field], translate);

    expect(localizedField.label).toBe('Nome');
    expect(localizedField.groupName).toBe('Informazioni di contatto');
  });

  it('localizes the newsletter option without changing its submitted value', () => {
    const optionValue = faker.string.uuid();
    const field = buildRegisterFieldWith({
      fieldId: 'field_email_marketing_newsletter',
      options: [{ label: faker.lorem.words(), value: optionValue }],
    });

    const [localizedField] = localizeRegistrationFields([field], translate);

    expect(localizedField.options).toEqual([
      {
        label: translations['register.registeredSingleCheckBox.label'],
        value: optionValue,
      },
    ]);
  });

  it('leaves custom fields without a standard identifier unchanged', () => {
    const field = buildRegisterFieldWith({
      custom: true,
      groupId: faker.string.alpha(),
    });

    const [localizedField] = localizeRegistrationFields([field], translate);

    expect(localizedField).toBe(field);
  });
});
