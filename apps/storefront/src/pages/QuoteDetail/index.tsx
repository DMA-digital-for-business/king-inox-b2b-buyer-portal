import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Grid } from '@mui/material';
import copy from 'copy-to-clipboard';
import { get } from 'lodash-es';

import B3Spin from '@/components/spin/B3Spin';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useIsBackorderEnabled } from '@/hooks/useIsBackorderEnabled';
import { useMobile } from '@/hooks/useMobile';
import { useScrollBar } from '@/hooks/useScrollBar';
import { useB3Lang } from '@/lib/lang';
import { GlobalContext } from '@/shared/global';
import { getB2BQuoteDetail, getBcQuoteDetail, searchProducts } from '@/shared/service/b2b';
import type { ProductValidationError } from '@/shared/service/request/b3Fetch';
import {
  activeCurrencyInfoSelector,
  isB2BUserSelector,
  rolePermissionSelector,
  useAppSelector,
} from '@/store';
import { QuoteExtraFieldsData } from '@/types/quotes';
import { verifyLevelPermission } from '@/utils/b3CheckPermissions/check';
import { b2bPermissionsMap } from '@/utils/b3CheckPermissions/config';
import { displayFormat } from '@/utils/b3DateFormat';
import { getBCPrice, getVariantInfoOOSAndPurchase } from '@/utils/b3Product/b3Product';
import { conversionProductsList } from '@/utils/b3Product/shared/config';
import { snackbar } from '@/utils/b3Tip';
import { buildCurrenciesMap } from '@/utils/currencyUtils';
import { getSearchVal } from '@/utils/loginInfo';
import {
  VALIDATED_PRODUCT_ERROR_TYPES,
  ValidatedProductError,
  validateProductsLegacy as validateProductsApi,
} from '@/utils/validateProducts';

import { FileObjects } from '../quote/components/FileUpload';
import Message from '../quote/components/Message';
import QuoteAttachment from '../quote/components/QuoteAttachment';
import QuoteDetailHeader from '../quote/components/QuoteDetailHeader';
import QuoteDetailSummary from '../quote/components/QuoteDetailSummary';
import QuoteDetailTable from '../quote/components/QuoteDetailTable';
import QuoteInfo from '../quote/components/QuoteInfo';
import QuoteNote from '../quote/components/QuoteNote';
import { getPackagingMetafieldValue, packagingColumns } from '../quote/components/quotePackaging';
import {
  downloadQuotePdf,
  printQuotePdf,
  QUOTE_PDF_LOGO_URL,
  QuotePdfData,
} from '../quote/components/quotePdf';
import { formatQuoteConvertedPrice } from '../quote/components/quotePriceFormat';
import QuoteTermsAndConditions from '../quote/components/QuoteTermsAndConditions';
import {
  getQuoteValidationErrorMessage,
  QUOTE_VALIDATION_ERROR_CODES,
  QUOTE_VALIDATION_MESSAGE_CONTEXTS,
} from '../quote/shared/getQuoteValidationErrorMessage';
import { buildQuoteStockSnapshot } from '../quote/utils/buildQuoteStockSnapshot';
import getB2BQuoteExtraFields from '../quote/utils/getQuoteExtraFields';
import { handleQuoteCheckout } from '../quote/utils/quoteCheckout';

interface ProductOption {
  optionId: number;
  optionValue: string;
  optionName?: string;
  optionLabel?: string;
  type?: string;
}

interface ProductInfoProps {
  basePrice: number | string;
  baseSku: string;
  createdAt: number;
  discount: number | string;
  offeredPrice: number | string;
  enteredInclusive: boolean;
  id: number | string;
  itemId: number;
  optionList: string;
  options?: ProductOption[];
  primaryImage: string;
  imageUrl?: string;
  notes?: string;
  productId: number;
  productName: string;
  productUrl: string;
  quantity: number | string;
  tax: number | string;
  updatedAt: number;
  variantId: number;
  variantSku: string;
  sku?: string;
  productsSearch: CustomFieldItems;
  backorderMessage?: string;
  totalOnHand?: number;
  quantityBackordered?: number;
}

const validateProducts = (products: ProductInfoProps[]) => {
  const transformedProducts = products.map((product) => ({
    ...product,
    productsSearch: {
      ...product.productsSearch,
      newSelectOptionList: (product.options || []).map((opt) => ({
        optionId: `attribute[${opt.optionId}]`,
        optionValue: opt.optionValue,
      })),
    },
  }));

  return validateProductsApi(transformedProducts);
};

function useData() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const uuid = searchParams.get('uuid') || undefined;
  const {
    state: { quoteConfig, storeName },
  } = useContext(GlobalContext);
  const companyId = useAppSelector(({ company }) => company.companyInfo.id);
  const emailAddress = useAppSelector(({ company }) => company.customer.emailAddress);
  const customerGroupId = useAppSelector(({ company }) => company.customer.customerGroupId);
  const role = useAppSelector(({ company }) => company.customer.role);

  const isB2BUser = useAppSelector(isB2BUserSelector);
  const { selectCompanyHierarchyId } = useAppSelector(
    ({ company }) => company.companyHierarchyInfo,
  );

  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);

  const { currency_code: currencyCode } = useAppSelector(activeCurrencyInfoSelector);
  const currencies = useAppSelector(({ storeConfigs }) => storeConfigs.currencies.currencies);
  const currenciesMap = useMemo(() => buildCurrenciesMap(currencies), [currencies]);
  const enteredInclusiveTax = useAppSelector(
    ({ storeConfigs }) => storeConfigs.currencies.enteredInclusiveTax,
  );
  const isEnableProduct = useAppSelector(
    ({ global }) => global.blockPendingQuoteNonPurchasableOOS?.isEnableProduct,
  );

  const { purchasabilityPermission } = useAppSelector(rolePermissionSelector);

  const fetchProductsWithSearch = async (
    listProducts: ProductInfoProps[],
  ): Promise<ProductInfoProps[]> => {
    if (listProducts.length === 0) return [];

    const productIds = Array.from(new Set(listProducts.map((item) => item.productId)));
    const options = { productIds, currencyCode, companyId, customerGroupId };

    const { productsSearch } = await searchProducts(options);
    const newProductsSearch = conversionProductsList(productsSearch);

    return listProducts.map((item) => {
      const productInfo = newProductsSearch.find(
        (search: CustomFieldItems) => Number(item.productId) === Number(search.id),
      );
      return { ...item, productsSearch: productInfo || {} };
    });
  };

  const location = useLocation();

  const getQuote = async () => {
    const { search } = location;

    const date = getSearchVal(search, 'date') || '';
    const uuid = getSearchVal(search, 'uuid') || '';
    const data = {
      id: Number(id),
      date: date.toString(),
      uuid: uuid ? uuid.toString() : undefined,
    };

    const { quote } = await (Number(role) === 99
      ? getBcQuoteDetail(data)
      : getB2BQuoteDetail(data));

    return quote;
  };

  return {
    id,
    uuid,
    quoteConfig,
    storeName,
    role,
    emailAddress,
    isB2BUser,
    selectCompanyHierarchyId,
    isAgenting,
    currenciesMap,
    enteredInclusiveTax,
    isEnableProduct,
    purchasabilityPermission,
    fetchProductsWithSearch,
    getQuote,
  };
}

const containerStyle = (isMobile: boolean) => {
  return isMobile
    ? {
        alignItems: 'flex-end',
        flexDirection: 'column',
      }
    : {
        alignItems: 'center',
      };
};

function Footer({ children, isAgenting }: { children: React.ReactNode; isAgenting: boolean }) {
  const [isMobile] = useMobile();
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: isMobile && isAgenting ? '52px' : 0,
        left: 0,
        backgroundColor: '#fff',
        width: '100%',
        padding: '0.8rem 1rem',
        height: 'auto',
        display: 'flex',
        zIndex: '999',
        justifyContent: isMobile ? 'center' : 'flex-end',
        displayPrint: 'none',
        ...containerStyle(isMobile),
      }}
    >
      {children}
    </Box>
  );
}

function ProceedToCheckoutButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  const [isMobile] = useMobile();
  return (
    <Button
      variant="contained"
      onClick={onClick}
      sx={{
        width: isMobile ? '100%' : 'auto',
      }}
    >
      {children}
    </Button>
  );
}

function QuoteDetail() {
  const navigate = useNavigate();

  const {
    id,
    uuid,
    quoteConfig,
    storeName,
    role,
    emailAddress,
    isB2BUser,
    selectCompanyHierarchyId,
    isAgenting,
    currenciesMap,
    enteredInclusiveTax,
    isEnableProduct,
    purchasabilityPermission,
    fetchProductsWithSearch,
    getQuote,
  } = useData();

  const [isMobile] = useMobile();

  const b3Lang = useB3Lang();

  const isCurrencySymbolPlacementFixEnabled = useFeatureFlag(
    'B2B-3876.fix_quote_currency_symbol_placement',
  );
  const isBackorderMessagingEnabled = useFeatureFlag(
    'BACK-134.backorders_phase_1_1_control_messaging_on_storefront',
  );

  const [quoteDetail, setQuoteDetail] = useState<any>({});
  const [productList, setProductList] = useState<ProductInfoProps[]>([]);
  const hasBackorderedItems = productList.some((item) => (item.quantityBackordered ?? 0) > 0);
  const [fileList, setFileList] = useState<FileObjects[]>([]);
  const [isHideQuoteCheckout, setIsHideQuoteCheckout] = useState(true);
  const [quoteValidationErrors, setQuoteValidationErrors] = useState<
    ValidatedProductError<ProductInfoProps>[]
  >([]);
  const [quoteHasWarnings, setQuoteHasWarnings] = useState(true);

  const [quoteSummary, setQuoteSummary] = useState({
    originalSubtotal: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    totalAmount: 0,
  });
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [isShowFooter, setIsShowFooter] = useState(false);
  const [quoteDetailTax, setQuoteDetailTax] = useState(0);
  const [noBuyerProductName, setNoBuyerProductName] = useState({
    oos: '',
    nonPurchasable: '',
  });

  const [quotePurchasabilityPermissionInfo, setQuotePurchasabilityPermission] = useState({
    quotePurchasabilityPermission: false,
    quoteConvertToOrderPermission: false,
  });

  const [quoteCheckoutLoading, setQuoteCheckoutLoading] = useState<boolean>(false);

  const [shouldHidePrices, setShouldHidePrices] = useState<boolean>(true);
  const showInclusiveTaxPrice = useAppSelector(({ global }) => global.showInclusiveTaxPrice);

  const location = useLocation();

  const isBackorderEnabled = useIsBackorderEnabled();

  const isAutoQuotingEnabled =
    quoteConfig.find((item) => item.key === 'quote_auto_quoting')?.value === '1';

  const quoteReviewedBySalesRep =
    Object.keys(quoteDetail).length === 0
      ? false
      : !!quoteDetail.salesRep || !!quoteDetail.salesRepEmail;

  useEffect(() => {
    if (!quoteDetail?.id) return;

    const { quoteConvertToOrderPermission: quoteCheckoutPermissionCode } = b2bPermissionsMap;

    const getPurchasabilityAndConvertToOrderPermission = () => {
      if (isB2BUser) {
        const companyId = quoteDetail?.companyId?.id || null;
        const userEmail = quoteDetail?.contactInfo?.email || '';
        return {
          quotePurchasabilityPermission: purchasabilityPermission,
          quoteConvertToOrderPermission: verifyLevelPermission({
            code: quoteCheckoutPermissionCode,
            companyId,
            userEmail,
          }),
        };
      }

      return {
        quotePurchasabilityPermission: true,
        quoteConvertToOrderPermission: true,
      };
    };

    const { quotePurchasabilityPermission, quoteConvertToOrderPermission } =
      getPurchasabilityAndConvertToOrderPermission();

    setQuotePurchasabilityPermission({
      quotePurchasabilityPermission,
      quoteConvertToOrderPermission,
    });
  }, [isB2BUser, quoteDetail, selectCompanyHierarchyId, purchasabilityPermission]);

  const quoteDetailBackendValidations = async (
    productListResponse: ProductInfoProps[],
    quoteReviewedBySalesRepResponse: boolean,
  ) => {
    if (!productListResponse.length) {
      return;
    }

    const { error, warning } = await validateProducts(productListResponse);

    if (!error.length && !warning.length) {
      setShouldHidePrices(false);
      setQuoteHasWarnings(false);
    }

    error.forEach((err) => {
      const errorCode =
        err.error.type === VALIDATED_PRODUCT_ERROR_TYPES.NETWORK
          ? QUOTE_VALIDATION_ERROR_CODES.NETWORK_ERROR
          : err.error.errorCode;
      snackbar.error(
        getQuoteValidationErrorMessage({
          b3Lang,
          errorCode,
          productName: err.product.productName || '',
        }),
      );
    });

    if (quoteReviewedBySalesRepResponse) {
      setShouldHidePrices(false);
    }

    setQuoteValidationErrors(error);
  };

  const quoteDetailFrontendValidations = (
    productListResponse: ProductInfoProps[],
    quoteReviewedBySalesRepResponse: boolean,
  ) => {
    let oosErrorList = '';
    let nonPurchasableErrorList = '';

    productListResponse.forEach((item: CustomFieldItems) => {
      const buyerInfo = getVariantInfoOOSAndPurchase(item);

      if (buyerInfo?.type && isEnableProduct && !item?.purchaseHandled) {
        if (buyerInfo.type === 'oos') {
          oosErrorList += `${item.productName}${oosErrorList ? ',' : ''}`;
        }

        if (buyerInfo.type === 'non-purchasable') {
          nonPurchasableErrorList += `${item.productName}${nonPurchasableErrorList ? ',' : ''}`;
        }
      }
    });

    const isHideCheckout = !!oosErrorList || !!nonPurchasableErrorList;
    if (isEnableProduct && quoteReviewedBySalesRepResponse && isHideCheckout) {
      if (oosErrorList)
        snackbar.error(
          b3Lang('quoteDetail.message.insufficientStock', {
            ProductName: oosErrorList,
          }),
        );

      if (nonPurchasableErrorList)
        snackbar.error(
          b3Lang('quoteDetail.message.nonPurchasable', {
            ProductName: nonPurchasableErrorList,
          }),
        );
    }

    setIsHideQuoteCheckout(isHideCheckout);

    setNoBuyerProductName({
      oos: oosErrorList,
      nonPurchasable: nonPurchasableErrorList,
    });
  };

  const validateQuoteProducts = isBackorderEnabled
    ? quoteDetailBackendValidations
    : quoteDetailFrontendValidations;

  const hasQuoteValidationErrorsBackendFlow = () => {
    if (quoteValidationErrors.length) {
      quoteValidationErrors.forEach((err) => {
        const errorCode =
          err.error.type === VALIDATED_PRODUCT_ERROR_TYPES.NETWORK
            ? QUOTE_VALIDATION_ERROR_CODES.NETWORK_ERROR
            : err.error.errorCode;
        snackbar.error(
          getQuoteValidationErrorMessage({
            b3Lang,
            errorCode,
            productName: err.product.productName || '',
          }),
        );
      });

      return true;
    }

    return false;
  };

  const hasQuoteValidationErrorsFrontendFlow = useCallback(() => {
    if (isHideQuoteCheckout) {
      const { oos, nonPurchasable } = noBuyerProductName;
      if (oos)
        snackbar.error(
          b3Lang('quoteDetail.message.insufficientStock', {
            ProductName: oos,
          }),
        );

      if (nonPurchasable)
        snackbar.error(
          b3Lang('quoteDetail.message.nonPurchasable', {
            ProductName: nonPurchasable,
          }),
        );
    }
    return isHideQuoteCheckout;
    // disabling as b3Lang is a dependency that will trigger rendering issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHideQuoteCheckout, noBuyerProductName]);

  const hasQuoteValidationErrors = isBackorderEnabled
    ? hasQuoteValidationErrorsBackendFlow
    : hasQuoteValidationErrorsFrontendFlow;

  const getTaxRate = (variants: any) => {
    if (variants.length) {
      const taxExclusive = get(variants, '[0].bc_calculated_price.tax_exclusive', 0);
      const taxInclusive = get(variants, '[0].bc_calculated_price.tax_inclusive', 0);
      return taxExclusive > 0 ? (taxInclusive - taxExclusive) / taxExclusive : 0;
    }
    return 0;
  };

  const getQuoteExtraFields = async (currentExtraFields: QuoteExtraFieldsData[]) => {
    const extraFieldsInfo = await getB2BQuoteExtraFields();
    const quoteCurrentExtraFields: QuoteExtraFieldsData[] = [];
    if (extraFieldsInfo.length) {
      extraFieldsInfo.forEach((item) => {
        const extraField = item;
        const currentExtraField = currentExtraFields.find(
          (field: QuoteExtraFieldsData) => field.fieldName === extraField.name,
        );

        quoteCurrentExtraFields.push({
          fieldName: extraField.name || '',
          fieldValue: currentExtraField?.fieldValue || extraField.default,
        });
      });
    }

    return quoteCurrentExtraFields;
  };

  const getQuoteDetail = async () => {
    setIsRequestLoading(true);
    setIsShowFooter(false);

    try {
      const quote = await getQuote();
      const productsWithMoreInfo = await fetchProductsWithSearch(quote.productsList).catch(
        () => undefined,
      );
      const quoteExtraFieldInfos = await getQuoteExtraFields(quote.extraFields);
      const productListResponse = productsWithMoreInfo ?? [];
      setQuoteDetail({
        ...quote,
        extraFields: quoteExtraFieldInfos,
      });
      setQuoteSummary({
        originalSubtotal: quote.subtotal,
        discount: quote.discount,
        tax: quote.taxTotal,
        shipping: quote.shippingTotal,
        totalAmount: quote.totalAmount,
      });

      setProductList(productListResponse);

      const { salesRep, salesRepEmail } = quote;
      const quoteReviewedBySalesRepResponse = Boolean(salesRep || salesRepEmail);

      await Promise.resolve(
        validateQuoteProducts(productListResponse, quoteReviewedBySalesRepResponse),
      );

      if (Number(quote.shippingTotal) === 0) {
        setQuoteDetailTax(Number(quote.taxTotal));
      } else {
        let taxPrice = 0;
        productsWithMoreInfo?.forEach((product) => {
          const {
            quantity,
            offeredPrice,
            productsSearch: { variants = [] },
          } = product;

          const taxRate = getTaxRate(variants);
          taxPrice += enteredInclusiveTax
            ? ((Number(offeredPrice) * taxRate) / (1 + taxRate)) * Number(quantity)
            : Number(offeredPrice) * taxRate * Number(quantity);
        });

        setQuoteDetailTax(taxPrice);
      }

      const { backendAttachFiles = [], storefrontAttachFiles = [] } = quote;
      const newFileList: FileObjects[] = [];
      storefrontAttachFiles.forEach((file: CustomFieldItems) => {
        newFileList.push({
          fileName: file.fileName,
          fileType: file.fileType,
          fileUrl: file.fileUrl,
          id: file.id,
          hasDelete: quoteDetail.status !== 4,
          title: b3Lang('quoteDetail.uploadedByCustomer', {
            createdBy: file.createdBy,
          }),
        });
      });

      backendAttachFiles.forEach((file: CustomFieldItems) => {
        newFileList.push({
          fileName: file.fileName,
          fileType: file.fileType,
          fileUrl: file.fileUrl,
          id: file.id,
          title: b3Lang('quoteDetail.uploadedBySalesRep', {
            createdBy: file.createdBy,
          }),
        });
      });

      setFileList(newFileList);

      // On enrichment failure, fall back to the original (unenriched) productsList so the
      // table's empty-state fallback in getQuoteTableDetails still has items to render.
      return { ...quote, productsList: productsWithMoreInfo ?? quote.productsList };
    } catch (error: unknown) {
      if (error instanceof Error) {
        snackbar.error(error.message);
      }
      throw error;
    } finally {
      setIsRequestLoading(false);
      setIsShowFooter(true);
    }
  };

  const quoteAndExtraFieldsInfo = useMemo(() => {
    const currentExtraFields = quoteDetail?.extraFields?.map(
      (field: { fieldName: string; fieldValue: string | number }) => ({
        fieldName: field.fieldName,
        value: field.fieldValue,
      }),
    );

    return {
      info: {
        quoteTitle: quoteDetail?.quoteTitle || '',
        referenceNumber: quoteDetail?.referenceNumber || '',
      },
      extraFields: currentExtraFields || [],
      recipients: quoteDetail?.recipients || [],
    };
  }, [quoteDetail]);

  const displayCurrency = useMemo(() => {
    if (isCurrencySymbolPlacementFixEnabled && quoteDetail.currency?.currencyCode) {
      const currencySnapshot = currenciesMap[quoteDetail.currency.currencyCode];
      if (currencySnapshot) return currencySnapshot;
    }
    return quoteDetail.currency;
  }, [isCurrencySymbolPlacementFixEnabled, quoteDetail.currency, currenciesMap]);

  const shouldHidePrice = isBackorderEnabled ? shouldHidePrices : isHideQuoteCheckout;

  const buildCurrentQuotePdfData = (): QuotePdfData => {
    const isOpened = Number(quoteDetail.status) === 1;
    const tbd = b3Lang('quoteDetail.summary.tbd');
    const formatPdfPrice = (price: number) =>
      shouldHidePrice
        ? tbd
        : formatQuoteConvertedPrice(price, {
            currency: displayCurrency,
            isConversionRate: false,
            useCurrentCurrency: !!displayCurrency,
          });
    const lines = productList.map((product) => {
      const variants = product.productsSearch?.variants || [];
      const offeredPrice = Number(product.offeredPrice);
      const taxRate = getTaxRate(variants);
      const offeredTax = enteredInclusiveTax
        ? (offeredPrice * taxRate) / (1 + taxRate)
        : offeredPrice * taxRate;
      const unitPrice = getBCPrice(offeredPrice, offeredTax);
      const options = (product.options || [])
        .filter(({ optionName, optionLabel }) => Boolean(optionName && optionLabel))
        .map(({ optionName, optionLabel }) => `${optionName}: ${optionLabel}`);

      if (product.notes) {
        options.push(`${b3Lang('global.quoteNote.notes')}: ${product.notes}`);
      }

      return {
        id: String(product.itemId || product.id || product.variantId),
        imageUrl: product.imageUrl || product.primaryImage,
        name: product.productName || '',
        sku: product.sku || product.variantSku || product.baseSku || '',
        options,
        packaging: packagingColumns.map(
          ({ key, title }) =>
            `${title}: ${getPackagingMetafieldValue(
              { ...product, variantSku: product.variantSku || product.sku },
              key,
            )}`,
        ),
        unitPrice: formatPdfPrice(unitPrice),
        quantity: Number(product.quantity),
        totalPrice: formatPdfPrice(unitPrice * Number(product.quantity)),
      };
    });
    const statusLabelKeys: Record<string, string> = {
      '0': 'global.quoteStatusCode.draft',
      '1': 'global.quoteStatusCode.open',
      '4': 'global.quoteStatusCode.ordered',
      '5': 'global.quoteStatusCode.expired',
    };
    const statusLabel = b3Lang(
      statusLabelKeys[String(quoteDetail.status)] || 'global.quoteStatusCode.open',
    );
    const quotedSubtotal = Number(quoteSummary.originalSubtotal) - Number(quoteSummary.discount);
    let visibleSubtotal = quotedSubtotal;
    if (enteredInclusiveTax && !showInclusiveTaxPrice) {
      visibleSubtotal -= quoteDetailTax;
    } else if (!enteredInclusiveTax && showInclusiveTaxPrice) {
      visibleSubtotal += quoteDetailTax;
    }
    const shippingIsTbd =
      !quoteDetail?.shippingMethod?.id &&
      ((!quoteDetail?.salesRepEmail && Number(quoteDetail.status) === 1) ||
        (quoteDetail?.salesRepEmail && [1, 5].includes(Number(quoteDetail.status))));
    const taxIsTbd =
      quoteDetail?.salesRepEmail &&
      !quoteDetail?.shippingMethod?.id &&
      [1, 5].includes(Number(quoteDetail.status));

    return {
      storeName,
      logoUrl: QUOTE_PDF_LOGO_URL,
      quoteTitle: quoteDetail.quoteTitle || '',
      referenceNumber: quoteDetail.referenceNumber || quoteDetail.quoteNumber || '',
      issuedAt:
        isOpened && quoteDetail.createdAt
          ? String(displayFormat(Number(quoteDetail.createdAt)))
          : undefined,
      expirationDate:
        isOpened && quoteDetail.expiredAt
          ? String(displayFormat(Number(quoteDetail.expiredAt)))
          : undefined,
      contactInfo: quoteDetail.contactInfo || {},
      billingAddress: quoteDetail.billingAddress || {},
      shippingAddress: quoteDetail.shippingAddress || {},
      extraFields: quoteAndExtraFieldsInfo.extraFields,
      recipients: quoteDetail.recipients || [],
      lines,
      packagingByVariantId: {},
      summary: {
        subtotal: formatPdfPrice(visibleSubtotal),
        shipping: shippingIsTbd ? tbd : formatPdfPrice(Number(quoteSummary.shipping)),
        tax: taxIsTbd ? tbd : formatPdfPrice(Number(quoteSummary.tax)),
        grandTotal: formatPdfPrice(Number(quoteSummary.totalAmount)),
      },
      labels: {
        quote: b3Lang('quoteDraft.title.Quote'),
        draft: statusLabel,
        buyerInfo: b3Lang('quoteDraft.contactInfo.contact'),
        quoteInfo: b3Lang('quoteDraft.quoteInfo.title'),
        billing: b3Lang('global.quoteInfo.billing'),
        shipping: b3Lang('global.quoteInfo.shipping'),
        title: b3Lang('quoteDraft.contactInfo.quoteTitle'),
        reference: b3Lang('quoteDraft.contactInfo.referenceNumber'),
        issuedOn: b3Lang('quoteDetail.header.issuedOn'),
        expirationDate: b3Lang('quoteDetail.header.expirationDate'),
        cc: b3Lang('quoteDraft.contactInfo.ccEmail'),
        products: b3Lang('quoteDraft.pdf.products'),
        product: b3Lang('quoteDetail.table.product'),
        price: b3Lang('quoteDetail.table.price'),
        quantity: b3Lang('quoteDetail.table.qty'),
        total: b3Lang('quoteDetail.table.total'),
        noProducts: b3Lang('quoteDraft.quoteTable.noProducts'),
        summary: b3Lang('quoteDetail.summary.quoteSummary'),
        subtotal: b3Lang('quoteDetail.summary.quotedSubtotal'),
        tax: b3Lang('quoteDetail.summary.tax'),
        grandTotal: b3Lang('quoteDetail.summary.grandTotal'),
        page: b3Lang('quoteDraft.pdf.page'),
        of: b3Lang('quoteDraft.pdf.of'),
      },
      filePrefix: b3Lang('quoteDraft.pdf.filePrefix'),
      draftLabel: statusLabel,
    };
  };

  const exportPdf = async () => {
    setIsRequestLoading(true);
    try {
      await downloadQuotePdf(buildCurrentQuotePdfData());
    } catch {
      snackbar.error(b3Lang('quoteDraft.pdf.downloadError'));
    } finally {
      setIsRequestLoading(false);
    }
  };

  const printQuote = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      snackbar.error(b3Lang('quoteDraft.pdf.downloadError'));
      return;
    }

    setIsRequestLoading(true);
    try {
      await printQuotePdf(buildCurrentQuotePdfData(), printWindow);
    } catch {
      printWindow.close();
      snackbar.error(b3Lang('quoteDraft.pdf.downloadError'));
    } finally {
      setIsRequestLoading(false);
    }
  };

  const getQuoteTableDetails = async (params: any) => {
    let allProductsList = productList;

    if (allProductsList.length === 0) {
      const quote = await getQuoteDetail();
      allProductsList = quote?.productsList || [];
    }

    const startIndex = Number(params.offset);
    const endIndex = Number(params.first) + startIndex;

    if (!allProductsList.length) {
      return {
        edges: [],
        totalCount: 0,
      };
    }
    const list = allProductsList.slice(startIndex, endIndex);

    return {
      edges: list,
      totalCount: allProductsList.length,
    };
  };

  useEffect(() => {
    const { state } = location;

    if (!state) return;

    setTimeout(() => {
      snackbar.success(
        Number(role) === 100
          ? b3Lang('quoteDetail.submittedQuote')
          : b3Lang('quoteDetail.quoteSubmitted'),
        {
          action: {
            label:
              Number(role) === 100
                ? b3Lang('quoteDetail.copyQuoteLink')
                : b3Lang('quoteDetail.reviewAllQuotes'),
            onClick: () => {
              if (Number(role) === 100) {
                copy(window.location.href);
                snackbar.success(b3Lang('quoteDetail.copySuccessful'));
              } else {
                navigate('/quotes');
              }
            },
          },
        },
      );
    }, 10);
    location.state = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navigate, role]);

  const formatQuoteValidationError = (err: ProductValidationError) =>
    getQuoteValidationErrorMessage({
      b3Lang,
      errorCode: err.code,
      productName: err.productName ?? '',
      context: QUOTE_VALIDATION_MESSAGE_CONTEXTS.QUOTE,
    });

  const fetchCurrentStockSnapshot = async () => {
    const refreshed = await fetchProductsWithSearch(productList);
    return buildQuoteStockSnapshot(refreshed);
  };

  const quoteGotoCheckout = async () => {
    try {
      if (hasQuoteValidationErrors()) return;
      setQuoteCheckoutLoading(true);
      await handleQuoteCheckout({
        quoteId: id,
        quoteUuid: uuid,
        role,
        location,
        navigate,
        b3Lang,
        formatValidationError: formatQuoteValidationError,
        isBackorderMessagingEnabled,
        quoteStockSnapshot: buildQuoteStockSnapshot(productList),
        fetchCurrentStockSnapshot,
      });
    } finally {
      setQuoteCheckoutLoading(false);
    }
  };
  useEffect(() => {
    if (location.search.includes('isCheckout') && id) {
      quoteGotoCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isHideQuoteCheckout]);

  const isAutoEnableQuoteCheckout = useMemo(() => {
    if (!isAutoQuotingEnabled && !quoteReviewedBySalesRep) return false;

    return true;
  }, [quoteReviewedBySalesRep, isAutoQuotingEnabled]);

  const isEnableProductShowCheckoutFrontendFlow = () => {
    if (isEnableProduct) {
      if (quoteReviewedBySalesRep && isHideQuoteCheckout) return true;
      if (!isHideQuoteCheckout) return true;

      return false;
    }

    return true;
  };

  const isEnableProductShowCheckoutBackendFlow = () => {
    return !quoteHasWarnings || quoteReviewedBySalesRep;
  };

  const enableProceedToCheckoutButton = isBackorderEnabled
    ? isEnableProductShowCheckoutBackendFlow
    : isEnableProductShowCheckoutFrontendFlow;

  useScrollBar(false);

  const { quotePurchasabilityPermission, quoteConvertToOrderPermission } =
    quotePurchasabilityPermissionInfo;

  return (
    <B3Spin isSpinning={isRequestLoading || quoteCheckoutLoading}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <QuoteDetailHeader
          status={quoteDetail.status}
          quoteNumber={quoteDetail.quoteNumber}
          issuedAt={quoteDetail.createdAt}
          expirationDate={quoteDetail.expiredAt}
          exportPdf={exportPdf}
          printQuote={printQuote}
          role={role}
          salesRepInfo={quoteDetail.salesRepInfo}
        />

        <Box
          sx={{
            marginTop: '1rem',
          }}
        >
          <QuoteInfo
            quoteAndExtraFieldsInfo={quoteAndExtraFieldsInfo}
            contactInfo={quoteDetail.contactInfo}
            shippingAddress={quoteDetail.shippingAddress}
            billingAddress={quoteDetail.billingAddress}
          />
        </Box>

        <Grid
          container
          spacing={isMobile ? 2 : 0}
          rowSpacing={0}
          sx={{
            overflow: 'auto',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            paddingBottom: '20px',
            marginBottom: isMobile ? '6rem' : 0,
            marginTop: isMobile ? 0 : '1rem',
            '@media print': {
              overflow: 'hidden',
            },
          }}
        >
          <Grid
            item
            xs={isMobile ? 12 : 8}
            rowSpacing={0}
            sx={
              isMobile
                ? {
                    flexBasis: '100%',
                    pl: '16px',
                  }
                : {
                    mr: '16px',
                  }
            }
          >
            <Box
              sx={
                isMobile
                  ? {
                      flexBasis: '100%',
                    }
                  : {}
              }
            >
              <QuoteDetailTable
                total={productList.length}
                productList={productList}
                currency={displayCurrency}
                quoteReviewedBySalesRep={quoteReviewedBySalesRep}
                getQuoteTableDetails={getQuoteTableDetails}
                getTaxRate={getTaxRate}
                displayDiscount={quoteDetail.displayDiscount}
                status={quoteDetail.status}
              />
            </Box>
          </Grid>
          <Grid
            item
            xs={isMobile ? 12 : 4}
            rowSpacing={0}
            sx={
              isMobile
                ? {
                    flexBasis: '100%',
                  }
                : {
                    pl: 0,
                  }
            }
          >
            <Box
              sx={{
                marginBottom: '1rem',
              }}
            >
              <QuoteDetailSummary
                shouldHidePrice={shouldHidePrice}
                quoteSummary={quoteSummary}
                quoteDetailTax={quoteDetailTax}
                status={quoteDetail.status}
                quoteDetail={quoteDetail}
                currency={displayCurrency}
                hasBackorderedItems={hasBackorderedItems}
              />
            </Box>

            {quoteDetail.notes && (
              <Box
                sx={{
                  marginBottom: '1rem',
                  displayPrint: 'none',
                }}
              >
                <QuoteNote quoteNotes={quoteDetail.notes} />
              </Box>
            )}

            <Box
              sx={{
                marginBottom: '1rem',
                displayPrint: 'none',
              }}
            >
              <Message
                id={id}
                status={quoteDetail.status}
                isB2BUser={isB2BUser}
                email={emailAddress || ''}
                msgs={quoteDetail?.trackingHistory || []}
              />
            </Box>

            <Box
              sx={{
                marginBottom: '1rem',
                displayPrint: 'none',
              }}
            >
              <QuoteAttachment
                allowUpload={Number(quoteDetail.status) !== 4}
                quoteId={quoteDetail.id}
                status={quoteDetail.status}
                defaultFileList={fileList}
              />
            </Box>

            {quoteDetail.legalTerms && (
              <Box
                sx={{
                  displayPrint: 'none',
                }}
              >
                <QuoteTermsAndConditions quoteLegalTerms={quoteDetail.legalTerms} />
              </Box>
            )}
          </Grid>
        </Grid>

        {quoteConvertToOrderPermission &&
          quotePurchasabilityPermission &&
          Number(quoteDetail.status) !== 4 &&
          Number(quoteDetail.status) !== 5 &&
          isShowFooter &&
          quoteDetail?.allowCheckout &&
          isAutoEnableQuoteCheckout &&
          enableProceedToCheckoutButton() && (
            <Footer isAgenting={isAgenting}>
              <ProceedToCheckoutButton
                onClick={() => {
                  if (hasQuoteValidationErrors()) return;
                  handleQuoteCheckout({
                    role,
                    location,
                    quoteId: quoteDetail.id,
                    quoteUuid: quoteDetail.uuid,
                    navigate,
                    b3Lang,
                    formatValidationError: formatQuoteValidationError,
                    isBackorderMessagingEnabled,
                    quoteStockSnapshot: buildQuoteStockSnapshot(productList),
                    fetchCurrentStockSnapshot,
                  });
                }}
              >
                {b3Lang('quoteDetail.footer.proceedToCheckout')}
              </ProceedToCheckoutButton>
            </Footer>
          )}
      </Box>
    </B3Spin>
  );
}

export default QuoteDetail;
