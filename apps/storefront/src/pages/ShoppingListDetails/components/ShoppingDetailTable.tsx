import {
  Dispatch,
  forwardRef,
  Ref,
  SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Delete, StickyNote2 } from '@mui/icons-material';
import { Box, FormControlLabel, Grid, styled, Switch, TextField, Typography } from '@mui/material';
import cloneDeep from 'lodash-es/cloneDeep';

import BackorderMessage from '@/components/BackorderMessage';
import {
  B3PaginationTable,
  GetRequestList,
  TableRefreshConfig,
} from '@/components/table/B3PaginationTable';
import { TableColumnItem } from '@/components/table/B3Table';
import { PRODUCT_DEFAULT_IMAGE } from '@/constants';
import { useBackorderStorefrontMessaging } from '@/hooks/useBackorderStorefrontMessaging';
import { useMobile } from '@/hooks/useMobile';
import { useSort } from '@/hooks/useSort';
import { useB3Lang } from '@/lib/lang';
import {
  formatPackagingQuantity,
  getPackagingMetafieldValue,
  normalizeQuantityToBoxMultiple,
  normalizeQuantityToBoxStep,
  packagingColumns,
} from '@/pages/quote/components/quotePackaging';
import { formatQuotePrice, formatQuoteUnitPrice } from '@/pages/quote/components/quotePriceFormat';
import { useQuotePackagingMetafields } from '@/pages/quote/components/useQuotePackagingMetafields';
import { updateB2BShoppingListsItem, updateBcShoppingListsItem } from '@/shared/service/b2b';
import {
  type CatalogQuickVariantSku,
  getVariantInfoBySkus,
} from '@/shared/service/b2b/graphql/product';
import { rolePermissionSelector, useAppSelector } from '@/store';
import b2bGetVariantImageByVariantInfo from '@/utils/b2bGetVariantImageByVariantInfo';
import { currencyFormat } from '@/utils/b3CurrencyFormat';
import { getBCPrice, getDisplayPrice } from '@/utils/b3Product/b3Product';
import { getProductOptionsFields, ProductsProps } from '@/utils/b3Product/shared/config';
import { snackbar } from '@/utils/b3Tip';
import {
  catalogListHasBackorderedItemsForDisplay,
  getCatalogProductRowDisplayState,
} from '@/utils/catalogBackorderDisplay';

import B3FilterSearch from '../../../components/filter/B3FilterSearch';

import ShoppingDetailAddNotes from './ShoppingDetailAddNotes';
import ShoppingDetailCard from './ShoppingDetailCard';

interface ListItem {
  [key: string]: string;
}

interface ProductInfoProps {
  basePrice: number | string;
  baseSku: string;
  createdAt: number;
  discount: number | string;
  enteredInclusive: boolean;
  id: number | string;
  itemId: number;
  optionList: string;
  primaryImage: string;
  productId: number;
  productName: string;
  productUrl: string;
  quantity: number | string;
  tax: number | string;
  updatedAt: number;
  variantId: number;
  variantSku: string;
  productsSearch: CustomFieldItems;
  productNote: string;
  disableCurrentCheckbox?: boolean;
}

interface ListItemProps {
  node: ProductInfoProps;
}

interface ShoppingDetailTableProps {
  shoppingListInfo: any;
  setIsRequestLoading: Dispatch<SetStateAction<boolean>>;
  shoppingListId: number | string;
  getShoppingListDetails: GetRequestList<SearchProps, CustomFieldItems>;
  setCheckedArr: (values: ProductsProps[]) => void;
  isReadForApprove: boolean;
  isJuniorApprove: boolean;
  setDeleteItemId: (itemId: number | string) => void;
  setDeleteOpen: (open: boolean) => void;
  isB2BUser: boolean;
  isCanEditShoppingList: boolean;
}

interface SearchProps {
  search?: string;
  first?: number;
  offset?: number;
  orderBy: string;
}

interface PaginationTableRefProps extends HTMLInputElement {
  getList: () => void;
  getCacheList: () => ListItemProps[];
  setList: (items?: ListItemProps[]) => void;
  setCacheAllList: (items?: ListItemProps[]) => void;
  getSelectedValue: () => void;
  refresh: (type?: TableRefreshConfig) => void;
}

const StyledShoppingListTableContainer = styled('div')(() => ({
  backgroundColor: '#FFFFFF',
  padding: '16px',
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(0, 0, 0, 0.12)',
  borderRadius: '4px',
  overflow: 'hidden',
  '& > .MuiCard-root': {
    height: 'auto',
  },
  boxShadow:
    '0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 1px 3px rgba(0, 0, 0, 0.12)',

  '& tbody': {
    '& tr': {
      '& td': {
        verticalAlign: 'top',
      },
      '& td: first-of-type': {
        paddingTop: '25px',
      },
    },
    '& tr: hover': {
      '& #shoppingList-actionList': {
        opacity: 1,
      },
    },
  },
}));

const StyledImage = styled('img')(() => ({
  maxWidth: '60px',
  height: 'auto',
  marginRight: '0.5rem',
}));

const StyledTextField = styled(TextField)(() => ({
  '& input': {
    paddingTop: '12px',
    paddingRight: '6px',
  },
}));

const defaultSortKey = 'updatedAt';

const sortKeys = {
  Product: 'productName',
  updatedAt: 'updatedAt',
  Qty: 'quantity',
};

function ShoppingDetailTable(props: ShoppingDetailTableProps, ref: Ref<unknown>) {
  const [isMobile] = useMobile();
  const b3Lang = useB3Lang();

  const {
    shoppingListInfo,
    setIsRequestLoading,
    shoppingListId,
    getShoppingListDetails,
    setCheckedArr,
    isReadForApprove,
    setDeleteItemId,
    setDeleteOpen,
    isJuniorApprove,
    isB2BUser,
    isCanEditShoppingList,
  } = props;

  const showInclusiveTaxPrice = useAppSelector(({ global }) => global.showInclusiveTaxPrice);

  const { shoppingListCreateActionsPermission } = useAppSelector(rolePermissionSelector);

  const canShoppingListActions = isB2BUser
    ? shoppingListCreateActionsPermission && isCanEditShoppingList
    : true;
  const b2bAndBcShoppingListActionsPermissions = isB2BUser ? canShoppingListActions : true;

  const paginationTableRef = useRef<PaginationTableRefProps | null>(null);

  const [search, setSearch] = useState<SearchProps>({
    orderBy: `-${sortKeys[defaultSortKey]}`,
  });
  const [qtyNotChangeFlag, setQtyNotChangeFlag] = useState<boolean>(true);
  const [originProducts, setOriginProducts] = useState<ListItemProps[]>([]);
  const packagingByVariantId = useQuotePackagingMetafields(originProducts);
  const [shoppingListTotalPrice, setShoppingListTotalPrice] = useState<number>(0.0);

  const [addNoteOpen, setAddNoteOpen] = useState<boolean>(false);
  const [addNoteItemId, setAddNoteItemId] = useState<number | string>('');
  const [notes, setNotes] = useState<string>('');
  const [disabledSelectAll, setDisabledSelectAll] = useState<boolean>(false);

  const [priceHidden, setPriceHidden] = useState<boolean>(false);
  const [variantInfoList, setVariantInfoList] = useState<CatalogQuickVariantSku[]>([]);
  const fetchedInventorySkusRef = useRef<Set<string>>(new Set());
  const [showBackorderDetails, setShowBackorderDetails] = useState(false);
  const [tableDataVersion, setTableDataVersion] = useState(0);

  const [handleSetOrderBy, order, orderBy] = useSort(sortKeys, defaultSortKey, search, setSearch);

  const {
    isBackorderMessagingContextEnabled,
    isBackorderMessagingEnabled,
    hasAnyBackorderDisplay,
  } = useBackorderStorefrontMessaging();
  const backorderUiEnabled = isBackorderMessagingContextEnabled && hasAnyBackorderDisplay;

  const inventoryBySku = useMemo(() => {
    const map: Record<string, CatalogQuickVariantSku> = {};
    variantInfoList.forEach((row) => {
      if (row.variantSku) {
        map[row.variantSku.toUpperCase()] = row;
      }
    });
    return map;
  }, [variantInfoList]);

  const fetchInventoryForSkus = useCallback(
    async (skus: string[]) => {
      if (!backorderUiEnabled || skus.length === 0) return;

      const existingSkus = fetchedInventorySkusRef.current;

      const newSkus = [...new Set(skus.map((sku) => sku.toUpperCase()))].filter(
        (sku) => !existingSkus.has(sku),
      );

      if (newSkus.length === 0) return;

      newSkus.forEach((sku) => existingSkus.add(sku));

      try {
        const { variantSku: nextVariantInfoList = [] } = await getVariantInfoBySkus(newSkus);
        setVariantInfoList((prev) => [...prev, ...nextVariantInfoList]);
      } catch {
        newSkus.forEach((sku) => existingSkus.delete(sku));
        // Inventory fetch failure should not block the product list
      }
    },
    [backorderUiEnabled],
  );

  const hasBackorderedItems = useMemo(() => {
    if (!isBackorderMessagingEnabled) {
      return false;
    }

    const cacheList: ListItemProps[] = paginationTableRef.current?.getCacheList() || [];
    const items = cacheList.map(({ node }) => ({
      qty: Number(node.quantity) || 0,
      variantSku: node.variantSku,
    }));

    return catalogListHasBackorderedItemsForDisplay(items, inventoryBySku);
    // tableDataVersion drives re-evaluation when list or qty changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryBySku, isBackorderMessagingEnabled, tableDataVersion]);

  const showBackorderToggle = backorderUiEnabled && hasBackorderedItems;

  const productCountTitle = priceHidden
    ? b3Lang('shoppingList.table.totalProductCount', {
        quantity: shoppingListInfo?.products?.totalCount || 0,
      })
    : b3Lang('shoppingList.table.totalProductCountWithPrice', {
        quantity: shoppingListInfo?.products?.totalCount || 0,
        price: currencyFormat(shoppingListTotalPrice || 0.0),
      });

  const getListWithInventory = useCallback(
    async (params: SearchProps) => {
      const result = await getShoppingListDetails(params);
      const listProducts = result?.edges as ListItemProps[] | undefined;

      if (backorderUiEnabled && listProducts?.length) {
        const skus = listProducts
          .map((item) => item.node.variantSku)
          .filter((sku): sku is string => Boolean(sku));
        fetchInventoryForSkus(skus).catch(() => {
          // Inventory fetch failure should not block the product list
        });
      }

      setTableDataVersion((version) => version + 1);

      return result;
    },
    [backorderUiEnabled, fetchInventoryForSkus, getShoppingListDetails],
  );

  const handleUpdateProductQty = (id: number | string, value: number | string) => {
    if (!Number.isFinite(Number(value))) return;
    const listItems: ListItemProps[] = paginationTableRef.current?.getList() || [];
    const currentItem = listItems.find(({ node }) => node.id === id);
    if (!currentItem) return;
    const quantity = Math.min(
      1000000,
      normalizeQuantityToBoxStep(
        currentItem.node,
        Math.max(1, Math.min(1000000, Math.ceil(Number(value)))),
        Number(currentItem.node.quantity),
        packagingByVariantId,
      ),
    );
    const originalItem = originProducts.find(({ node }) => node.id === id);
    setQtyNotChangeFlag(Number(originalItem?.node.quantity) === quantity);
    const listCacheItems: ListItemProps[] = paginationTableRef.current?.getCacheList() || [];
    const newListItems = listItems?.map((item: ListItemProps) => {
      const { node } = item;
      if (node?.id === id) {
        node.quantity = `${quantity}`;
        node.disableCurrentCheckbox = quantity === 0;
      }

      return item;
    });
    const newListCacheItems = listCacheItems?.map((item: ListItemProps) => {
      const { node } = item;
      if (node?.id === id) {
        node.quantity = `${quantity}`;
        node.disableCurrentCheckbox = quantity === 0;
      }

      return item;
    });

    const nonNumberProducts = newListItems.filter(
      (item: ListItemProps) => Number(item.node.quantity) === 0,
    );
    setDisabledSelectAll(nonNumberProducts.length === newListItems.length);
    paginationTableRef.current?.setList([...newListItems]);
    paginationTableRef.current?.setCacheAllList([...newListCacheItems]);
    setTableDataVersion((version) => version + 1);
  };

  const initSearch = (type?: TableRefreshConfig) => {
    paginationTableRef.current?.refresh(type);
  };

  useImperativeHandle(ref, () => ({
    initSearch,
    getList: () => paginationTableRef.current?.getList(),
    setList: () => paginationTableRef.current?.setList(),
    getSelectedValue: () => paginationTableRef.current?.getSelectedValue(),
  }));

  const handleSearchProduct = async (q: string) => {
    setSearch({
      ...search,
      search: q,
    });
  };

  const handleUpdateShoppingListItem = async (itemId: number | string, quantity?: number) => {
    const listItems: ListItemProps[] = paginationTableRef.current?.getList() || [];
    const currentItem = listItems.find((item: ListItemProps) => {
      const { node } = item;

      return node.itemId === itemId;
    });
    let currentNode;

    if (currentItem) {
      currentNode = currentItem.node;
    }

    const options = JSON.parse(currentNode?.optionList || '[]');

    const optionsList = options.map(
      (option: { option_id: number | string; option_value: number | string }) => ({
        optionId: option.option_id,
        optionValue: option.option_value,
      }),
    );

    const itemData: CustomFieldItems = {
      variantId: currentNode?.variantId,
      quantity: quantity ?? Number(currentNode?.quantity || 0),
      optionList: optionsList || [],
      productNote: notes,
    };

    const data = {
      itemId,
      shoppingListId,
      itemData,
    };

    const updateShoppingListItem = isB2BUser
      ? updateB2BShoppingListsItem
      : updateBcShoppingListsItem;

    await updateShoppingListItem(data);
  };

  const handleUpdateShoppingListItemQty = async (itemId: number | string) => {
    const items: ListItemProps[] = paginationTableRef.current?.getList() || [];
    const item = items.find(({ node }) => node.itemId === itemId);
    if (!item) return;
    const quantity = Math.min(
      1000000,
      normalizeQuantityToBoxMultiple(
        item.node,
        Math.max(1, Math.min(1000000, Math.ceil(Number(item.node.quantity)))),
        packagingByVariantId,
      ),
    );
    if (qtyNotChangeFlag && quantity === Number(item.node.quantity)) return;
    handleUpdateProductQty(item.node.id, quantity);
    setIsRequestLoading(true);
    try {
      await handleUpdateShoppingListItem(itemId, quantity);
      snackbar.success(b3Lang('shoppingList.table.quantityUpdated'));
      setQtyNotChangeFlag(true);
      initSearch({ keepCheckedItems: true });
    } finally {
      setIsRequestLoading(false);
    }
  };

  const getSelectCheckbox = (selectCheckbox: Array<string | number>) => {
    if (selectCheckbox.length > 0) {
      const productList: ProductsProps[] = paginationTableRef.current?.getList() || [];
      const checkedItems: ProductsProps[] = [];
      selectCheckbox.forEach((item) => {
        const newItems = productList.find((product) => {
          const { node } = product;

          return node.id === item;
        });

        if (newItems) checkedItems.push(newItems);
      });

      setCheckedArr([...checkedItems]);
    } else {
      setCheckedArr([]);
    }
  };

  const handleCancelAddNotesClick = () => {
    setAddNoteOpen(false);
    setAddNoteItemId('');
    setNotes('');
  };

  const handleAddItemNotesClick = async () => {
    setIsRequestLoading(true);
    try {
      handleCancelAddNotesClick();
      await handleUpdateShoppingListItem(addNoteItemId);
      snackbar.success(b3Lang('shoppingList.table.productNotesUpdated'));
      initSearch({ keepCheckedItems: true });
    } finally {
      setIsRequestLoading(false);
    }
  };

  useEffect(() => {
    if (shoppingListInfo) {
      const {
        products: { edges },
        grandTotal,
        totalTax,
      } = shoppingListInfo;

      const NewShoppingListTotalPrice = showInclusiveTaxPrice
        ? Number(grandTotal)
        : Number(grandTotal) - Number(totalTax) || 0.0;

      const isPriceHidden = edges.some((item: CustomFieldItems) => {
        if (item?.node?.productsSearch) {
          return item.node.productsSearch?.isPriceHidden || false;
        }

        return false;
      });

      setPriceHidden(isPriceHidden);
      setOriginProducts(cloneDeep(edges));
      setShoppingListTotalPrice(NewShoppingListTotalPrice);
    }
  }, [shoppingListInfo, showInclusiveTaxPrice]);

  useEffect(() => {
    if (shoppingListInfo) {
      const {
        products: { edges },
      } = shoppingListInfo;
      const nonNumberProducts = edges.filter((item: ListItemProps) => item.node.quantity === 0);
      setDisabledSelectAll(nonNumberProducts.length === edges.length);
    }
  }, [shoppingListInfo]);

  const showPrice = (price: string, row: CustomFieldItems): string | number => {
    const {
      productsSearch: { isPriceHidden },
    } = row;
    if (isPriceHidden) return '';
    return getDisplayPrice({
      price,
      productInfo: row,
      showText: isPriceHidden ? '' : price,
      forcedSkip: true,
    });
  };

  const columnItems: TableColumnItem<ListItem>[] = [
    {
      key: 'Product',
      title: b3Lang('shoppingList.table.product'),
      render: (row: CustomFieldItems) => {
        const product: any = {
          ...row.productsSearch,
          selectOptions: row.optionList,
        };
        const productFields = getProductOptionsFields(product, {});

        const optionList = JSON.parse(row.optionList);
        const optionsValue: CustomFieldItems[] = productFields.filter((item) => item.valueText);

        const currentVariants = product.variants || [];
        const currentImage =
          b2bGetVariantImageByVariantInfo(currentVariants, {
            variantId: row.variantId,
            variantSku: row.variantSku,
          }) || row.primaryImage;

        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
            }}
          >
            <StyledImage
              src={currentImage || PRODUCT_DEFAULT_IMAGE}
              alt="Product-img"
              loading="lazy"
            />
            <Box>
              <Typography
                variant="body1"
                color="#212121"
                onClick={() => {
                  const {
                    location: { origin },
                  } = window;

                  window.location.href = `${origin}${row.productUrl}`;
                }}
                sx={{
                  cursor: 'pointer',
                }}
              >
                {row.productName}
              </Typography>
              <Typography variant="body1" color="#616161">
                {row.variantSku}
              </Typography>
              {optionList.length > 0 && optionsValue.length > 0 && (
                <Box>
                  {optionsValue.map((option: any) => (
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        lineHeight: '1.5',
                        color: '#455A64',
                      }}
                      key={option.valueLabel}
                    >
                      {`${option.valueLabel}: ${option.valueText}`}
                    </Typography>
                  ))}
                </Box>
              )}

              {row?.productNote && row?.productNote.trim().length > 0 && (
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: '#ED6C02',
                    marginTop: '0.3rem',
                  }}
                >
                  {row.productNote}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
      width: '20%',
      isSortable: true,
    },
    {
      key: 'Measure',
      title: 'Misura',
      render: (row) => (
        <Typography sx={{ padding: '12px 0' }}>
          {getPackagingMetafieldValue(row, 'MISURA', packagingByVariantId)}
        </Typography>
      ),
      width: '10%',
    },
    {
      key: 'Price',
      title: b3Lang('shoppingList.table.price'),
      render: (row: CustomFieldItems) => {
        const { basePrice, taxPrice = 0 } = row;
        const inTaxPrice = getBCPrice(Number(basePrice), Number(taxPrice));

        return (
          <Typography
            sx={{
              padding: '12px 0',
            }}
          >
            {showPrice(formatQuoteUnitPrice(inTaxPrice), row)}
          </Typography>
        );
      },
      width: '10%',
      style: {
        textAlign: 'right',
      },
    },
    ...packagingColumns.map(
      (column): TableColumnItem<ListItem> => ({
        key: column.key,
        title: column.title,
        render: (row) => (
          <Typography sx={{ padding: '12px 0' }}>
            {formatPackagingQuantity(
              getPackagingMetafieldValue(row, column.key, packagingByVariantId),
            )}
          </Typography>
        ),
        width: '10%',
        style: { textAlign: 'right' },
      }),
    ),
    {
      key: 'Qty',
      title: b3Lang('shoppingList.table.quantity'),
      render: (row) => {
        const inventoryRow = inventoryBySku[row.variantSku?.toUpperCase()];
        const { backorderFields } = getCatalogProductRowDisplayState({
          qty: Number(row.quantity) || 0,
          showAvailableToSellHelper: false,
          inventoryRow,
          backorderUiEnabled,
          formatOnlyAvailable: () => '',
        });

        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              width: '100%',
            }}
          >
            <StyledTextField
              size="small"
              type="number"
              variant="filled"
              sx={{
                width: '72px',
              }}
              disabled={
                b2bAndBcShoppingListActionsPermissions ? isReadForApprove || isJuniorApprove : true
              }
              value={row.quantity}
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
              onChange={(e) => {
                handleUpdateProductQty(row.id, e.target.value);
              }}
              onBlur={() => {
                handleUpdateShoppingListItemQty(row.itemId);
              }}
            />
            {backorderFields && (
              <Box sx={{ mt: 1, width: '100%', textAlign: 'right' }}>
                <BackorderMessage
                  totalOnHand={backorderFields.totalOnHand}
                  quantityBackordered={backorderFields.quantityBackordered}
                  backorderMessage={backorderFields.backorderMessage}
                  visible={showBackorderDetails}
                />
              </Box>
            )}
          </Box>
        );
      },
      width: backorderUiEnabled ? '18%' : '15%',
      style: {
        textAlign: 'right',
      },
      isSortable: true,
    },
    {
      key: 'Total',
      title: b3Lang('shoppingList.table.total'),
      render: (row: CustomFieldItems) => {
        const { basePrice, quantity, itemId, taxPrice = 0 } = row;

        const inTaxPrice = getBCPrice(Number(basePrice), Number(taxPrice));

        const totalPrice = inTaxPrice * Number(quantity);

        return (
          <Box>
            <Typography
              sx={{
                padding: '12px 0',
              }}
            >
              {showPrice(formatQuotePrice(totalPrice), row)}
            </Typography>
            <Box
              sx={{
                marginTop: '1rem',
                opacity: 0,
                textAlign: isMobile ? 'end' : 'start',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
              id="shoppingList-actionList"
            >
              {canShoppingListActions && (
                <>
                  <Grid
                    item
                    sx={{
                      marginRight: '0.5rem',
                      minWidth: '32px',
                    }}
                  >
                    <StickyNote2
                      sx={{
                        cursor: 'pointer',
                        color: 'rgba(0, 0, 0, 0.54)',
                      }}
                      onClick={() => {
                        setAddNoteOpen(true);
                        setAddNoteItemId(Number(itemId));

                        if (row.productNote) {
                          setNotes(row.productNote);
                        }
                      }}
                    />
                  </Grid>

                  <Grid
                    item
                    sx={{
                      marginLeft: '0.3rem',
                    }}
                  >
                    {b2bAndBcShoppingListActionsPermissions &&
                      !isReadForApprove &&
                      !isJuniorApprove && (
                        <Delete
                          sx={{
                            cursor: 'pointer',
                            color: 'rgba(0, 0, 0, 0.54)',
                          }}
                          onClick={() => {
                            setDeleteOpen(true);
                            setDeleteItemId(Number(itemId));
                          }}
                        />
                      )}
                  </Grid>
                </>
              )}
            </Box>
          </Box>
        );
      },
      width: '15%',
      style: {
        textAlign: 'right',
      },
    },
  ];

  return (
    <StyledShoppingListTableContainer>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0 0 1rem 0',
        }}
      >
        <Typography
          sx={{
            fontSize: '24px',
          }}
        >
          {productCountTitle}
        </Typography>
        {showBackorderToggle && (
          <FormControlLabel
            control={
              <Switch
                checked={showBackorderDetails}
                onChange={(e) => setShowBackorderDetails(e.target.checked)}
              />
            }
            label={b3Lang('quoteDetail.table.backorderDetails')}
            labelPlacement="start"
            sx={{ mr: 0, gap: '0.5rem', flexShrink: 0 }}
          />
        )}
      </Box>
      <Box
        sx={{
          marginBottom: '5px',
        }}
      >
        <B3FilterSearch
          searchBGColor="rgba(0, 0, 0, 0.06)"
          handleChange={(e) => {
            handleSearchProduct(e);
          }}
        />
      </Box>

      <B3PaginationTable
        ref={paginationTableRef}
        columnItems={columnItems}
        rowsPerPageOptions={[10, 20, 50]}
        getRequestList={getListWithInventory}
        searchParams={search}
        isCustomRender={false}
        showCheckbox
        showSelectAllCheckbox
        applyAllDisableCheckbox={false}
        disableCheckbox={disabledSelectAll}
        hover
        labelRowsPerPage={b3Lang('shoppingList.table.itemsPerPage')}
        showBorder={false}
        requestLoading={setIsRequestLoading}
        getSelectCheckbox={getSelectCheckbox}
        itemIsMobileSpacing={0}
        noDataText={b3Lang('shoppingList.table.noProductsFound')}
        sortDirection={order}
        orderBy={orderBy}
        sortByFn={handleSetOrderBy}
        pageType="shoppingListDetailsTable"
        renderItem={(row, index, checkBox) => (
          <ShoppingDetailCard
            len={shoppingListInfo?.products?.edges.length || 0}
            item={row}
            itemIndex={index}
            showPrice={showPrice}
            onDelete={setDeleteItemId}
            checkBox={checkBox}
            setDeleteOpen={setDeleteOpen}
            setAddNoteOpen={setAddNoteOpen}
            setAddNoteItemId={setAddNoteItemId}
            setNotes={setNotes}
            handleUpdateProductQty={handleUpdateProductQty}
            handleUpdateShoppingListItem={handleUpdateShoppingListItemQty}
            isReadForApprove={isReadForApprove || isJuniorApprove}
            b2bAndBcShoppingListActionsPermissions={b2bAndBcShoppingListActionsPermissions}
            packagingByVariantId={packagingByVariantId}
            inventoryBySku={inventoryBySku}
            backorderUiEnabled={backorderUiEnabled}
            showBackorderDetails={showBackorderDetails}
          />
        )}
      />

      <ShoppingDetailAddNotes
        open={addNoteOpen}
        notes={notes}
        setNotes={setNotes}
        handleCancelAddNotesClick={handleCancelAddNotesClick}
        handleAddItemNotesClick={handleAddItemNotesClick}
      />
    </StyledShoppingListTableContainer>
  );
}

export default forwardRef(ShoppingDetailTable);
