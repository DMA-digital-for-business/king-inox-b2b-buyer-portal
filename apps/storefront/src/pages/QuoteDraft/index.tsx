import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import Cookies from 'js-cookie';
import { cloneDeep, concat, isEqual, omit, uniq } from 'lodash-es';
import { v4 as generateUuid } from 'uuid';

import CustomButton from '@/components/button/CustomButton';
import { permissionLevels } from '@/constants';
import { dispatchEvent } from '@/hooks/useB2BCallback';
import { useSetCountry } from '@/hooks/useGetCountry';
import { useIsBackorderEnabled } from '@/hooks/useIsBackorderEnabled';
import { useMobile } from '@/hooks/useMobile';
import { useValidatePermissionWithComparisonType } from '@/hooks/useVerifyPermission';
import { useB3Lang } from '@/lib/lang';
import QuotePage from '@/pages/quote/components/QuotePage';
import createOrderFromQuote from '@/pages/quote/shared/createOrderFromQuote';
import sendQuoteToKing from '@/pages/quote/shared/sendQuoteToKing';
import { GlobalContext } from '@/shared/global';
import { createQuote, getB2BCustomerAddresses, getBCCustomerAddresses } from '@/shared/service/b2b';
import { deleteCart } from '@/shared/service/bc/graphql/cart';
import {
  activeCurrencyInfoSelector,
  isB2BUserSelector,
  resetDraftQuoteInfo,
  resetDraftQuoteList,
  setCartNumber,
  setDraftQuoteInfo,
  setDraftQuoteRecipients,
  setQuoteUserId,
  useAppDispatch,
  useAppSelector,
} from '@/store';
import { AddressItemType, BCAddressItemType } from '@/types/address';
import {
  BillingAddress,
  ContactInfoKeys,
  QuoteExtraFields,
  QuoteFormattedItemsProps,
  QuoteInfo as QuoteInfoType,
  QuoteShippingTerms,
  ShippingAddress,
} from '@/types/quotes';
import { verifyCreatePermission } from '@/utils/b3CheckPermissions/check';
import { b2bPermissionsMap } from '@/utils/b3CheckPermissions/config';
import b2bLogger from '@/utils/b3Logger';
import { getVariantInfoOOSAndPurchase } from '@/utils/b3Product/b3Product';
import { B3LStorage } from '@/utils/b3Storage';
import { snackbar } from '@/utils/b3Tip';
import { channelId, storeHash } from '@/utils/basicConfig';
import { deleteCartData } from '@/utils/cartUtils';
import { formatBcCurrencyToDisplayCurrency } from '@/utils/currencyUtils';
import validateObject from '@/utils/quoteUtils';

import { getProductOptionsFields } from '../../utils/b3Product/shared/config';
import { convertBCToB2BAddress } from '../AddressList/shared/config';
import { type PageProps } from '../PageProps';
import { calculateQuoteSummary } from '../quote/components/calculateQuoteSummary';
import ContactInfo, { ContactInfoRef } from '../quote/components/ContactInfo';
import QuoteAddress from '../quote/components/QuoteAddress';
import { formatQuotePrice, formatQuoteSummaryPrice } from '../quote/components/quotePriceFormat';
import QuoteSubmissionResponse from '../quote/components/QuoteSubmissionResponse';
import QuoteTable from '../quote/components/QuoteTable';
import { useQuotePackagingMetafields } from '../quote/components/useQuotePackagingMetafields';
import getAccountFormFields from '../quote/config';
import { hasShippingAddress } from '../quote/shared/hasShippingAddress';
import getQuoteDraftShowPriceTBD from '../quote/shared/utils';
import Container from '../quote/style';
import getB2BQuoteExtraFields from '../quote/utils/getQuoteExtraFields';

type BCAddress = {
  node: BCAddressItemType;
};

type B2BAddress = {
  node: AddressItemType;
};

interface Country {
  countryCode: string;
  countryName: string;
  id?: string;
}

// should be ShippingAddress or BillingAddress with masterCopy field added for internal use
type AddressWithMasterCopy = (ShippingAddress | BillingAddress) & {
  masterCopy?: Partial<AddressItemType>;
};

interface AddressRefProps extends HTMLInputElement {
  getContactInfoValue: () => any;
  setShippingInfoValue: (address: any) => void;
}

type QuoteSubmissionDataRefType = {
  id: string;
  createdAt: string;
  uuid?: string;
};

const shippingAddress = {
  address: '',
  addressId: 0,
  apartment: '',
  city: '',
  country: '',
  firstName: '',
  label: '',
  lastName: '',
  phoneNumber: '',
  state: '',
  zipCode: '',
  companyName: '',
};

const billingAddress = {
  address: '',
  addressId: 0,
  apartment: '',
  city: '',
  country: '',
  firstName: '',
  label: '',
  lastName: '',
  phoneNumber: '',
  state: '',
  zipCode: '',
  companyName: '',
};

function QuoteDraft({ setOpenPage }: PageProps) {
  const {
    state: { countriesList, openAPPParams },
  } = useContext(GlobalContext);
  const dispatch = useAppDispatch();

  const isB2BUser = useAppSelector(isB2BUserSelector);
  const companyB2BId = useAppSelector(({ company }) => company.companyInfo.id);
  const companyName = useAppSelector(({ company }) => company.companyInfo.companyName);
  const customer = useAppSelector(({ company }) => company.customer);
  const role = useAppSelector(({ company }) => company.customer.role);
  const enteredInclusiveTax = useAppSelector(
    ({ storeConfigs }) => storeConfigs.currencies.enteredInclusiveTax,
  );
  const draftQuoteList = useAppSelector(({ quoteInfo }) => quoteInfo.draftQuoteList);
  const packagingByVariantId = useQuotePackagingMetafields(draftQuoteList);
  const salesRepCompanyId = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.id);
  const salesRepCompanyName = useAppSelector(
    ({ b2bFeatures }) => b2bFeatures.masqueradeCompany.companyName,
  );
  const quoteInfoOrigin = useAppSelector(({ quoteInfo }) => quoteInfo.draftQuoteInfo);
  const currency = useAppSelector(activeCurrencyInfoSelector);
  const displayCurrency = useMemo(() => formatBcCurrencyToDisplayCurrency(currency), [currency]);
  const { selectCompanyHierarchyId } = useAppSelector(
    ({ company }) => company.companyHierarchyInfo,
  );
  const isAddNonPurchasableOutOfStockToQuoteEnabled = useAppSelector(
    ({ global }) => global.blockPendingQuoteNonPurchasableOOS.isEnableProduct,
  );

  const isBackorderEnabled = useIsBackorderEnabled();

  const quotesActionsPermission = useMemo(() => {
    if (isB2BUser) {
      return verifyCreatePermission(
        b2bPermissionsMap.quotesCreateActionsPermission,
        Number(selectCompanyHierarchyId),
      );
    }

    return true;
  }, [isB2BUser, selectCompanyHierarchyId]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Stencil parameters precede the hash; portal route parameters follow it.
  const cartShippingAddressId =
    searchParams.get('cartShippingAddressId') ??
    new URLSearchParams(window.location.search).get('cartShippingAddressId');

  const b3Lang = useB3Lang();

  const [isMobile] = useMobile();

  const [loading, setLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const submissionInProgress = useRef(false);

  const [isEdit, setEdit] = useState<boolean>(false);

  const [addressList, setAddressList] = useState<B2BAddress[]>([]);

  const [shippingSameAsBilling] = useState<boolean>(false);
  const [billingChange, setBillingChange] = useState<boolean>(false);
  const [quoteSubmissionResponseOpen, setQuoteSubmissionResponseOpen] = useState<boolean>(false);
  const [extraFields, setExtraFields] = useState<QuoteFormattedItemsProps[]>([]);

  const quoteSubmissionDataRef = useRef<QuoteSubmissionDataRefType>(undefined);

  const [isAddressCompanyHierarchy] = useValidatePermissionWithComparisonType({
    level: permissionLevels.COMPANY_SUBSIDIARIES,
    code: b2bPermissionsMap.getAddressesPermission,
    containOrEqual: 'equal',
  });

  useSetCountry();

  const contactInfoRef = useRef<ContactInfoRef | null>(null);
  const billingRef = useRef<AddressRefProps | null>(null);
  const shippingRef = useRef<AddressRefProps | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const setCustomInfo = (quoteInfo: any) => {
        const newInfo = {
          ...quoteInfo,
        };
        newInfo.contactInfo = {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.emailAddress,
          companyName: companyName || salesRepCompanyName || '',
          phoneNumber: customer.phoneNumber,
        };
        dispatch(setDraftQuoteInfo(newInfo));
      };

      const quoteInfo = cloneDeep(quoteInfoOrigin);

      try {
        if (isB2BUser) {
          const companyId = companyB2BId || salesRepCompanyId;

          let addressB2BList = [];
          const fetchAddresses = async (id: number) => {
            try {
              const response = await getB2BCustomerAddresses(id, true);

              return response.addresses.edges;
            } catch {
              return null;
            }
          };

          if (!selectCompanyHierarchyId) {
            addressB2BList = await fetchAddresses(Number(companyId));
          } else if (selectCompanyHierarchyId && isAddressCompanyHierarchy) {
            addressB2BList = await fetchAddresses(Number(selectCompanyHierarchyId));
          }

          if (addressB2BList) {
            const cartShippingAddress = addressB2BList.find(
              ({ node }: B2BAddress) => String(node.id) === cartShippingAddressId,
            )?.node;
            const shippingDefaultAddress =
              cartShippingAddress ||
              addressB2BList.find((item: B2BAddress) => item?.node?.isDefaultShipping === 1)?.node;
            const { node: billingDefaultAddress } =
              addressB2BList.find((item: B2BAddress) => item?.node?.isDefaultBilling === 1) || {};

            if (
              shippingDefaultAddress &&
              (cartShippingAddress ||
                !quoteInfo?.shippingAddress ||
                validateObject(quoteInfo, 'shippingAddress'))
            ) {
              const addressItem: AddressWithMasterCopy = {
                label: shippingDefaultAddress.label || '',
                firstName: shippingDefaultAddress.firstName || '',
                lastName: shippingDefaultAddress.lastName || '',
                companyName: shippingDefaultAddress.company || '',
                country: shippingDefaultAddress.countryCode || '',
                address: shippingDefaultAddress.addressLine1 || '',
                apartment: shippingDefaultAddress.addressLine2 || '',
                city: shippingDefaultAddress.city || '',
                state: shippingDefaultAddress.state || '',
                zipCode: shippingDefaultAddress.zipCode || '',
                phoneNumber: shippingDefaultAddress.phoneNumber || '',
                addressId: Number(shippingDefaultAddress.id) || 0,
              };
              addressItem.masterCopy = { ...addressItem };

              quoteInfo.shippingAddress = addressItem;
            }
            if (
              billingDefaultAddress &&
              (!quoteInfo?.billingAddress || validateObject(quoteInfo, 'billingAddress'))
            ) {
              const addressItem: AddressWithMasterCopy = {
                label: billingDefaultAddress.label || '',
                firstName: billingDefaultAddress.firstName || '',
                lastName: billingDefaultAddress.lastName || '',
                companyName: billingDefaultAddress.company || '',
                country: billingDefaultAddress.countryCode || '',
                address: billingDefaultAddress.addressLine1 || '',
                apartment: billingDefaultAddress.addressLine2 || '',
                city: billingDefaultAddress.city || '',
                state: billingDefaultAddress.state || '',
                zipCode: billingDefaultAddress.zipCode || '',
                phoneNumber: billingDefaultAddress.phoneNumber || '',
                addressId: Number(billingDefaultAddress.id) || 0,
              };
              addressItem.masterCopy = { ...addressItem };

              quoteInfo.billingAddress = addressItem;
            }

            setAddressList(addressB2BList);
          }
        } else if (role !== 100) {
          const {
            customerAddresses: { edges: addressBCList = [] },
          } = await getBCCustomerAddresses();

          const list = addressBCList.map((address: BCAddress) => ({
            node: convertBCToB2BAddress(address.node),
          }));
          setAddressList(list);
        }

        const extraFieldsInfo = await getB2BQuoteExtraFields();
        if (extraFieldsInfo.length) {
          setExtraFields(extraFieldsInfo);
          const preExtraFields = quoteInfo.extraFields;
          const defaultValues = extraFieldsInfo?.map((field) => {
            const defaultValue =
              preExtraFields?.find((item: QuoteExtraFields) => item.fieldName === field.name)
                ?.value || field?.default;

            return {
              id: Number(field.id),
              fieldName: field.name,
              value: defaultValue || '',
            };
          });
          quoteInfo.extraFields = defaultValues;
        }

        if (
          quoteInfo &&
          (!quoteInfo?.contactInfo || validateObject(quoteInfo, 'contactInfo')) &&
          Number(role) !== 100
        ) {
          setCustomInfo(quoteInfo);
        } else if (quoteInfo) {
          dispatch(setDraftQuoteInfo(quoteInfo));
        }
      } finally {
        const quoteUserId = customer.b2bId || customer.id || 0;
        dispatch(setQuoteUserId(Number(quoteUserId)));

        setLoading(false);
      }
    };

    init();
    // disabling as we only need to run this once and values at starting render are good enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectCompanyHierarchyId, isAddressCompanyHierarchy, cartShippingAddressId]);

  const quoteAndExtraFieldsInfo = useMemo(() => {
    const contactInfo: CustomFieldItems = quoteInfoOrigin.contactInfo || {};

    return {
      info: {
        quoteTitle: contactInfo?.quoteTitle || '',
        referenceNumber: quoteInfoOrigin?.referenceNumber || '',
      },
      extraFields: quoteInfoOrigin.extraFields || [],
      recipients: quoteInfoOrigin.recipients || [],
    };
  }, [quoteInfoOrigin]);

  const getAddress = () => {
    const addressSaveInfo = {
      shippingAddress,
      billingAddress: quoteInfoOrigin.billingAddress || billingAddress,
    };

    if (billingRef?.current) {
      addressSaveInfo.billingAddress = billingRef.current.getContactInfoValue();
    }
    if (shippingRef?.current) {
      addressSaveInfo.shippingAddress = shippingRef.current.getContactInfoValue();
    }

    return addressSaveInfo;
  };

  const handleSaveCCEmail = async (ccEmail: string[]) => {
    dispatch(setDraftQuoteRecipients(ccEmail));
  };

  const handleCollectingData = async (saveInfo: QuoteInfoType) => {
    if (contactInfoRef?.current) {
      const contactInfo = await contactInfoRef.current.getContactInfoValue();
      if (!contactInfo) return false;

      const currentRecipients = saveInfo?.recipients || [];
      if (typeof contactInfo.ccEmail === 'string' && contactInfo.ccEmail.trim().length) {
        saveInfo.recipients = uniq(concat(currentRecipients, [contactInfo.ccEmail]));
      }

      saveInfo.contactInfo = {
        name: contactInfo?.name,
        email: contactInfo?.email,
        companyName: contactInfo?.companyName || '',
        phoneNumber: contactInfo?.phoneNumber,
        quoteTitle: contactInfo?.quoteTitle,
      };
      saveInfo.referenceNumber = contactInfo?.referenceNumber || '';

      const extraFieldsInfo = extraFields.map((field) => ({
        id: Number(field.id),
        fieldName: field.name,
        value: field.name ? contactInfo[field.name] : '',
      }));
      saveInfo.extraFields = extraFieldsInfo;

      return true;
    }
    return false;
  };

  const handleSaveInfoClick = async () => {
    const saveInfo = cloneDeep(quoteInfoOrigin);
    if (contactInfoRef?.current) {
      const data = await handleCollectingData(saveInfo);
      if (!data) return;
    }

    const { shippingAddress, billingAddress } = getAddress();

    saveInfo.shippingAddress = shippingAddress;
    saveInfo.billingAddress = billingAddress;

    const isComplete = Object.keys(saveInfo.contactInfo).every((key: string) => {
      if (key === 'phoneNumber' || key === 'companyName' || key === 'quoteTitle') {
        return true;
      }
      return !!saveInfo.contactInfo[key as ContactInfoKeys];
    });

    if (isComplete) {
      dispatch(setDraftQuoteInfo(saveInfo));
      setEdit(false);
    }
  };

  const handleEditInfoClick = () => {
    setEdit(true);
  };

  const showInclusiveTaxPrice = useAppSelector(({ global }) => global.showInclusiveTaxPrice);
  const formattedQuoteTotal = getQuoteDraftShowPriceTBD(draftQuoteList)
    ? b3Lang('quoteDraft.quoteSummary.tbd')
    : formatQuoteSummaryPrice(
        formatQuotePrice(calculateQuoteSummary(draftQuoteList, showInclusiveTaxPrice).grandTotal),
      );

  const conversionTotal = Number(
    draftQuoteList
      .reduce(
        (total, { node }) =>
          total +
          (Number(node.basePrice || 0) + (enteredInclusiveTax ? 0 : Number(node.taxPrice || 0))) *
            Number(node.quantity || 0),
        0,
      )
      .toFixed(displayCurrency.decimalPlaces),
  );

  const accountFormFields = getAccountFormFields(isMobile, b3Lang);

  const getFileList = (files: CustomFieldItems[]) => {
    if (role === 100) {
      return [];
    }

    return files.map((file) => ({
      fileUrl: file.fileUrl,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
    }));
  };

  const handleReset = () => {
    dispatch(resetDraftQuoteInfo());
    dispatch(resetDraftQuoteList());
    B3LStorage.delete('cartToQuoteId');
  };

  const handleAfterSubmit = (
    quoteSubmissionData?: QuoteSubmissionDataRefType,
    downloadPdf = false,
  ) => {
    if (quoteSubmissionData && quoteSubmissionData.id) {
      const { id, createdAt, uuid } = quoteSubmissionData;
      handleReset();
      const uuidParam = uuid ? `&uuid=${uuid}` : '';
      navigate(`/quoteDetail/${id}?date=${createdAt}${uuidParam}`, {
        state: {
          to: 'draft',
          downloadPdf,
        },
      });
    }
  };

  /**
   * Clone address and compare with masterCopy to decide if addressId can be reused.
   *
   * @param address - Address with optional masterCopy for comparison
   * @returns Cloned address, potentially with reused addressId if no changes detected
   *
   * Cases:
   * 1. No Master Copy: return cloned address
   * 2. Master Copy exists and address unchanged: return cloned address with addressId
   * 3. Master Copy exists but address changed: return cloned address with addressId set to 0
   */
  const cloneAddressWithId = ({
    masterCopy,
    ...address
  }: AddressWithMasterCopy): ShippingAddress | BillingAddress => {
    if (!masterCopy) {
      return address;
    }

    const addressForComparison = omit(address, ['addressId']);
    const masterCopyForComparison = omit(masterCopy, ['addressId']);

    return {
      ...address,
      addressId: isEqual(addressForComparison, masterCopyForComparison) ? masterCopy.addressId : 0,
    };
  };

  const requestOfferForCreatedQuote = async (quote: QuoteSubmissionDataRefType) => {
    await sendQuoteToKing(String(quote.id), Number(quote.createdAt));
    setQuoteSubmissionResponseOpen(true);
  };

  const convertCreatedQuoteToOrder = async (
    quote: QuoteSubmissionDataRefType,
    shippingTerms: QuoteShippingTerms,
  ) => {
    await createOrderFromQuote(String(quote.id), Number(quote.createdAt), shippingTerms);
    handleReset();
    navigate('/orders');
    return true;
  };

  const getConversionDetails = () => {
    const address: ShippingAddress =
      (shippingRef.current ? getAddress().shippingAddress : quoteInfoOrigin.shippingAddress) ??
      shippingAddress;
    const currentAddress = cloneAddressWithId(address);
    return {
      companyId: Number(selectCompanyHierarchyId || companyB2BId || salesRepCompanyId),
      address: { ...currentAddress, extraFields: address.extraFields ?? [] },
      total: conversionTotal,
      currencyCode: displayCurrency.currencyCode || 'EUR',
    };
  };

  const handleSubmit = async (downloadPdf = false, convertToOrder?: QuoteShippingTerms) => {
    if (submissionInProgress.current || loading) {
      return false;
    }

    submissionInProgress.current = true;
    setIsGeneratingPdf(downloadPdf);
    setLoading(true);

    try {
      if (!downloadPdf && quoteSubmissionDataRef.current) {
        if (convertToOrder) {
          return await convertCreatedQuoteToOrder(quoteSubmissionDataRef.current, convertToOrder);
        }
        await requestOfferForCreatedQuote(quoteSubmissionDataRef.current);

        return true;
      }
      const info = cloneDeep(quoteInfoOrigin);
      const { decimalPlaces } = displayCurrency;
      if (isEdit && contactInfoRef?.current) {
        const data = await handleCollectingData(info);
        if (!data) return false;
      }

      const currentAddresses = shippingRef.current ? getAddress() : info;

      if (!hasShippingAddress(currentAddresses.shippingAddress)) {
        snackbar.warning(
          b3Lang(
            downloadPdf
              ? 'quoteDraft.notification.shippingAddressRequiredForPdf'
              : 'quoteDraft.notification.shippingAddressRequired',
          ),
        );
        return false;
      }

      const contactInfo = info?.contactInfo || {};

      const quoteTitle = contactInfo?.quoteTitle || '';

      if ('quoteTitle' in contactInfo) delete contactInfo.quoteTitle;

      const isComplete = Object.keys(contactInfo).every((key: string) => {
        if (key === 'phoneNumber' || key === 'companyName') {
          return true;
        }

        return contactInfo && !!contactInfo[key as ContactInfoKeys];
      });

      if (validateObject(quoteInfoOrigin, 'contactInfo') || !isComplete) {
        snackbar.error(b3Lang('quoteDraft.addQuoteInfo'));
        return false;
      }

      if (!draftQuoteList || draftQuoteList.length === 0) {
        snackbar.error(b3Lang('quoteDraft.submit'));
        return false;
      }

      if (!isAddNonPurchasableOutOfStockToQuoteEnabled && !isBackorderEnabled) {
        const itHasInvalidProduct = draftQuoteList.some((item) => {
          return getVariantInfoOOSAndPurchase(item)?.name;
        });

        if (itHasInvalidProduct) {
          snackbar.error(b3Lang('quoteDraft.submit.errorTip'));
          return false;
        }
      }

      const note = info?.note || '';
      const newNote = note.trim();
      // just trim the note,
      // no matter it's empty or not, to avoid unnecessary space in the quote info

      const perfectAddress = (address: AddressWithMasterCopy) => {
        const newAddress = cloneAddressWithId(address);

        const countryItem = countriesList?.find(
          (item: Country) => item.countryCode === newAddress.country,
        );

        if (countryItem) {
          newAddress.country = countryItem.countryName;
        }

        newAddress.address = address?.address || '';
        newAddress.apartment = address?.apartment || '';

        return newAddress;
      };

      const { shippingAddress: editShippingAddress, billingAddress: editBillingAddress } =
        currentAddresses;

      const shippingAddress = editShippingAddress ? perfectAddress(editShippingAddress) : {};

      const billingAddress = editBillingAddress ? perfectAddress(editBillingAddress) : {};

      let allPrice = 0;
      let allTaxPrice = 0;

      const calculationTime = (value: string | number) => {
        if (typeof value === 'string' && value.includes('-')) {
          return `${new Date(value).getTime() / 1000}`;
        }
        return value;
      };

      const productList = draftQuoteList.map((item) => {
        const { node } = item;
        const product = {
          ...node.productsSearch,
          selectOptions: node?.optionList || '',
        };

        const productFields = getProductOptionsFields(product, {});
        const optionsList =
          productFields
            .map((item) => ({
              optionId: item.optionId,
              optionValue:
                item.fieldType === 'date' ? calculationTime(item.optionValue) : item.optionValue,
              optionLabel: `${item.valueText}`,
              optionName: item.valueLabel,
              type: item?.fieldOriginType || item.fieldType,
            }))
            .filter((list: CustomFieldItems) => !!list.optionName) || [];

        const variants = node?.productsSearch?.variants;
        let variantsItem;
        if (Array.isArray(variants)) {
          variantsItem = variants.find((item) => item.sku === node.variantSku);
        }

        allPrice += Number(node?.basePrice || 0) * Number(node?.quantity || 0);

        allTaxPrice += Number(node?.taxPrice || 0) * Number(node?.quantity || 0);

        const items = {
          productId: node?.productsSearch?.id,
          sku: node.variantSku,
          basePrice: Number(node?.basePrice || 0).toFixed(decimalPlaces),
          discount: '0.00',
          offeredPrice: Number(node?.basePrice || 0).toFixed(decimalPlaces),
          quantity: node.quantity,
          variantId: variantsItem?.variant_id,
          imageUrl: node.primaryImage,
          productName: node.productName,
          options: optionsList,
          itemId: generateUuid(),
        };

        return items;
      });

      const fileList = getFileList(quoteInfoOrigin?.fileInfo || []);

      const data = {
        message: newNote,
        legalTerms: '',
        totalAmount: enteredInclusiveTax
          ? allPrice.toFixed(decimalPlaces)
          : (allPrice + allTaxPrice).toFixed(decimalPlaces),
        grandTotal: allPrice.toFixed(decimalPlaces),
        subtotal: allPrice.toFixed(decimalPlaces),
        companyId: isB2BUser ? selectCompanyHierarchyId || companyB2BId || salesRepCompanyId : '',
        storeHash,
        quoteTitle,
        discount: '0.00',
        channelId,
        userEmail: customer.emailAddress,
        shippingAddress,
        billingAddress,
        contactInfo,
        productList,
        fileList,
        taxTotal: allTaxPrice.toFixed(decimalPlaces),
        currency: displayCurrency,
        referenceNumber: `${info.referenceNumber}` || '',
        extraFields: [
          ...(info.extraFields || []).filter(
            (field: QuoteExtraFields) =>
              field.fieldName !== 'DESTINAZIONE KING' &&
              field.fieldName !== 'send_to_king_timestampa',
          ),
          {
            fieldName: 'DESTINAZIONE KING',
            value: 'HUBSPOT',
          },
        ],
        recipients: info.recipients || [],
      };

      if (!dispatchEvent('on-quote-create', data)) {
        throw new Error();
      }

      const response = await createQuote(data);

      if (isBackorderEnabled) {
        if (response?.error?.extensions?.productValidationErrors?.length) {
          response.error.extensions.productValidationErrors.forEach(
            (err: { productId: number }) => {
              snackbar.error(
                b3Lang('quoteDraft.notification.productCannotBeAddedToQuote', {
                  productId: err.productId,
                }),
              );
            },
          );

          return false;
        }
      }

      const {
        quoteCreate: {
          quote: { id, createdAt, uuid },
        },
      } = response;

      if (id) {
        const cartId = B3LStorage.get('cartToQuoteId');
        const deleteCartObject = deleteCartData(cartId);

        const deletedCart = await deleteCart(deleteCartObject);
        if (deletedCart?.errors?.length) {
          throw new Error(deletedCart.errors[0].message);
        }
        if (deletedCart?.data?.cart?.deleteCart?.deletedCartEntityId) {
          dispatch(setCartNumber(0));
          Cookies.remove('cartId');
        }
      }

      quoteSubmissionDataRef.current = { id, createdAt, uuid };

      if (convertToOrder) {
        return await convertCreatedQuoteToOrder(quoteSubmissionDataRef.current, convertToOrder);
      }
      if (downloadPdf) {
        handleAfterSubmit(quoteSubmissionDataRef.current, true);
      } else {
        await requestOfferForCreatedQuote(quoteSubmissionDataRef.current);
      }
      return true;
    } catch (error: any) {
      b2bLogger.error(error);
      if (downloadPdf) snackbar.error(b3Lang('quoteDraft.pdf.downloadError'));
      if (convertToOrder) snackbar.error(b3Lang('quoteDetail.convertToOrder.error'));
      if (!downloadPdf && !convertToOrder) snackbar.error(b3Lang('quoteDetail.sendToKing.error'));
      return false;
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleCloseQuoteSubmissionResponse = () => {
    setQuoteSubmissionResponseOpen(false);

    handleAfterSubmit(quoteSubmissionDataRef.current);
  };

  const backText = () => {
    let text =
      Number(role) === 100
        ? b3Lang('quoteDraft.button.back')
        : b3Lang('quoteDraft.button.backToQuoteLists');
    if (openAPPParams?.quoteBtn === 'open') {
      text = b3Lang('quoteDraft.button.back');
    } else if (openAPPParams?.quoteBtn === 'add') {
      text = b3Lang('quoteDraft.button.backToProduct');
    }

    return text;
  };

  useEffect(() => {
    if (billingChange && shippingSameAsBilling) {
      if (billingRef.current) {
        const billingAddress = billingRef.current.getContactInfoValue();

        if (shippingRef.current) {
          shippingRef.current.setShippingInfoValue(billingAddress);
        }
      }
    }
  }, [billingChange, shippingSameAsBilling]);

  return (
    <QuotePage
      busy={loading || isGeneratingPdf}
      status="0"
      back={{
        label: backText(),
        onClick: () => {
          if (openAPPParams?.quoteBtn || Number(role) === 100) {
            navigate('/');
            setOpenPage({ isOpen: false, openUrl: '' });
          } else {
            navigate('/quotes');
          }
        },
      }}
      actions={
        quotesActionsPermission
          ? {
              download: { onClick: () => handleSubmit(true) },
              requestOffer: { onClick: () => handleSubmit() },
              convertToOrder: {
                getDetails: getConversionDetails,
                onConfirm: (terms) => handleSubmit(false, terms),
              },
            }
          : undefined
      }
      information={{
        quoteAndExtraFieldsInfo,
        status: 'Draft',
        contactInfo: quoteInfoOrigin.contactInfo,
        shippingAddress: quoteInfoOrigin.shippingAddress,
        billingAddress: quoteInfoOrigin.billingAddress || {},
        handleEditInfoClick,
      }}
      editingInformation={
        isEdit ? (
          <Container flexDirection="column">
            <ContactInfo
              emailAddress={customer.emailAddress}
              info={quoteInfoOrigin?.contactInfo}
              referenceNumber={quoteInfoOrigin?.referenceNumber || ''}
              quoteExtraFields={extraFields}
              extraFieldsDefault={quoteInfoOrigin.extraFields || []}
              recipients={quoteInfoOrigin?.recipients || []}
              handleSaveCCEmail={handleSaveCCEmail}
              ref={contactInfoRef}
            />
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                mt: isMobile ? 0 : '3rem',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <QuoteAddress
                title={b3Lang('quoteDraft.section.shipping')}
                info={quoteInfoOrigin?.shippingAddress}
                addressList={addressList}
                ref={shippingRef}
                role={role}
                accountFormFields={accountFormFields}
                shippingSameAsBilling={shippingSameAsBilling}
                type="shipping"
                setBillingChange={setBillingChange}
              />
            </Box>
            <CustomButton
              sx={{
                mt: '20px',
                mb: '15px',
              }}
              onClick={handleSaveInfoClick}
              variant="outlined"
            >
              {b3Lang('quoteDraft.button.saveInfo')}
            </CustomButton>
          </Container>
        ) : undefined
      }
      dialog={
        <QuoteSubmissionResponse
          isOpen={quoteSubmissionResponseOpen}
          onClose={handleCloseQuoteSubmissionResponse}
        />
      }
    >
      <Box
        sx={{
          mt: '20px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'flex-start',
        }}
      >
        <Container
          flexDirection="column"
          xs={{
            width: '100%',
            minWidth: 0,
            marginBottom: '20px',
            boxShadow:
              '0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 1px 3px rgba(0, 0, 0, 0.12)',
            borderRadius: '4px',
          }}
        >
          <QuoteTable
            formattedTotal={formattedQuoteTotal}
            total={draftQuoteList.length}
            items={draftQuoteList}
            packagingByVariantId={packagingByVariantId}
          />
        </Container>
      </Box>
    </QuotePage>
  );
}

export default QuoteDraft;
