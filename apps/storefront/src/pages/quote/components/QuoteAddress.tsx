import { forwardRef, useEffect, useId, useImperativeHandle, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { Box, Typography } from '@mui/material';
import cloneDeep from 'lodash-es/cloneDeep';

import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { AddressItemType } from '@/types/address';
import { BillingAddress, ContactInfo, ShippingAddress } from '@/types/quotes';

import ChooseAddress from './ChooseAddress';

type AddressItemProps = {
  node: AddressItemType;
};

interface AccountFormFieldsProps extends Record<string, any> {
  name: string;
  label?: string;
  required?: boolean;
  fieldType?: string;
  default?: string | Array<any> | number;
  xs: number;
  variant: string;
  size: string;
  options?: any[];
}

interface AddressProps {
  title: string;
  pr?: string | number;
  pl?: string | number;
  addressList?: AddressItemProps[];
  info: ContactInfo | ShippingAddress | BillingAddress;
  role: string | number;
  accountFormFields: AccountFormFieldsProps[];
  shippingSameAsBilling: boolean;
  type: string;
  setBillingChange: (value: boolean) => void;
}

function QuoteAddress(
  {
    title,
    addressList = [],
    pr = 0,
    pl = 0,
    info,
    role,
    accountFormFields = [],
    shippingSameAsBilling = false,
    type,
    setBillingChange,
  }: AddressProps,
  ref: any,
) {
  const { control, getValues, setValue, reset } = useForm({
    defaultValues: Object.fromEntries(
      accountFormFields.map((field) => [field.name, field.default ?? '']),
    ),
    mode: 'onSubmit',
  });

  const [isMobile] = useMobile();
  const b3Lang = useB3Lang();

  type InfoKeys = keyof typeof info;

  const [isOpen, setOpen] = useState<boolean>(false);
  const { locale } = useIntl();
  const addressValues = useWatch({ control });
  const countryCode = String(addressValues.country || '');
  const country = /^[a-z]{2}$/i.test(countryCode)
    ? new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode.toUpperCase())
    : countryCode;
  const street = [addressValues.address, addressValues.apartment].filter(Boolean).join(', ');
  const city = [addressValues.zipCode, addressValues.city].filter(Boolean).join(' ');
  const locality = [city, addressValues.state ? `(${addressValues.state})` : '']
    .filter(Boolean)
    .join(' ');
  const addressSummary = [[street, locality].filter(Boolean).join(', '), country]
    .filter(Boolean)
    .join(' - ');

  const getContactInfoValue = () => getValues();
  const setShippingInfoValue = (address: any) => {
    const addressKey = Object.keys(address);

    addressKey.forEach((item: string) => {
      if (item === 'company') return;
      setValue(item, address[item]);
    });
  };

  useImperativeHandle(ref, () => ({
    getContactInfoValue,
    setShippingInfoValue,
  }));

  const handleAddressChoose = () => {
    setOpen(true);
  };

  const handleCloseAddressChoose = () => {
    setOpen(false);
  };

  const handleChangeAddress = (address: AddressItemType) => {
    reset(); // reset the form before setting new values
    const addressItem: any = {
      label: address?.label || '',
      firstName: address?.firstName || '',
      lastName: address?.lastName || '',
      companyName: address?.company || '',
      country: address?.countryCode || '',
      address: address?.addressLine1 || '',
      apartment: address?.addressLine2 || '',
      city: address?.city || '',
      state: address?.state || '',
      zipCode: address?.zipCode || '',
      phoneNumber: address?.phoneNumber || '',
      addressId: Number(address?.id) || 0,
    };

    // masterCopy temporarily stores the original address to detect changes and will be removed before submitting the quote.
    addressItem.masterCopy = cloneDeep(addressItem);

    Object.keys(addressItem).forEach((item: string) => {
      setValue(item, addressItem[item]);
    });
    if (type === 'billing' && shippingSameAsBilling) {
      setBillingChange(true);
    }

    handleCloseAddressChoose();
  };

  useEffect(() => {
    if (JSON.stringify(info) !== '{}') {
      Object.keys(info).forEach((item: string) => {
        setValue(item, info[item as InfoKeys]);
      });
    }
    // Disabling this rule as dispatcher dep setValue is the same between renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info]);

  const fieldsetId = useId();

  return (
    <Box
      role="group"
      aria-labelledby={fieldsetId}
      width={isMobile ? '100%' : '50%'}
      mt={isMobile ? '2rem' : '0'}
      pr={pr}
      pl={pl}
      sx={{ minWidth: 0, boxSizing: 'border-box' }}
    >
      <Box
        sx={{
          display: 'flex',
          mb: '20px',
        }}
      >
        <Typography
          id={fieldsetId}
          sx={{
            fontWeight: 400,
            fontSize: '24px',
            minHeight: '32px',
            mr: '16px',
          }}
        >
          {title}
        </Typography>
        {Number(role) !== 100 && (
          <Typography
            onClick={handleAddressChoose}
            sx={{
              fontWeight: 500,
              fontSize: '14px',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'flex-end',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {b3Lang('quoteDraft.quoteAddress.chooseFromSavedAddresses')}
          </Typography>
        )}
      </Box>

      <Typography sx={{ overflowWrap: 'anywhere', maxWidth: 450 }}>
        {addressSummary || '—'}
      </Typography>

      <ChooseAddress
        isOpen={isOpen}
        handleChangeAddress={handleChangeAddress}
        closeModal={handleCloseAddressChoose}
        addressList={addressList}
        type={type}
      />
    </Box>
  );
}

export default forwardRef(QuoteAddress);
