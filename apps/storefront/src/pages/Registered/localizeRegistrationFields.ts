import type { LangFormatFunction } from '@/lib/lang';

import type { RegisterFields } from './types';

const groupTranslationKeys: Record<string, string> = {
  '1': 'register.group.contactInformation',
  '2': 'register.group.additionalInformation',
  '3': 'register.group.businessDetails',
  '4': 'register.group.address',
  '5': 'register.group.password',
};

const fieldTranslationKeys: Record<string, string> = {
  field_first_name: 'register.field.firstName',
  field_last_name: 'register.field.lastName',
  field_email: 'register.field.emailAddress',
  field_company_name: 'register.field.companyName',
  field_phone_number: 'register.field.phoneNumber',
  field_email_marketing_newsletter: 'register.registeredSingleCheckBox.label',
  field_company_email: 'register.field.companyEmail',
  field_company_phone_number: 'register.field.companyPhoneNumber',
  field_attachments: 'register.field.attachments',
  field_country: 'register.field.country',
  field_address_1: 'register.field.address1',
  field_address_2: 'register.field.address2',
  field_city: 'register.field.city',
  field_state: 'register.field.state',
  field_zip_code: 'register.field.zipCode',
  field_14: 'register.field.firstName',
  field_15: 'register.field.lastName',
  field_16: 'register.field.companyName',
  field_17: 'register.field.phoneNumber',
  field_18: 'register.field.addressLine1',
  field_19: 'register.field.addressLine2',
  field_20: 'register.field.suburbCity',
  field_21: 'register.field.country',
  field_22: 'register.field.stateProvince',
  field_23: 'register.field.zipPostcode',
  field_create_password: 'register.field.createPassword',
  field_confirm_password: 'register.field.confirmPassword',
};

export const localizeRegistrationFields = (
  fields: RegisterFields[],
  b3Lang: LangFormatFunction,
): RegisterFields[] =>
  fields.map((field) => {
    const fieldTranslationKey = fieldTranslationKeys[field.fieldId];
    const groupTranslationKey = groupTranslationKeys[String(field.groupId)];

    if (!fieldTranslationKey && !groupTranslationKey) {
      return field;
    }

    const localizedLabel = fieldTranslationKey ? b3Lang(fieldTranslationKey) : field.label;
    const localizedOptions =
      field.fieldId === 'field_email_marketing_newsletter'
        ? field.options?.map((option: { label: string; value: string }) => ({
            ...option,
            label: localizedLabel,
          }))
        : field.options;

    return {
      ...field,
      label: localizedLabel,
      groupName: groupTranslationKey ? b3Lang(groupTranslationKey) : field.groupName,
      options: localizedOptions,
    };
  });
