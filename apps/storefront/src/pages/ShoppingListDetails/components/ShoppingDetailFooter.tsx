import { useContext, useRef, useState } from 'react';
import { ArrowDropDown, Delete } from '@mui/icons-material';
import { Box, Grid, Menu, MenuItem, Typography } from '@mui/material';

import CustomButton from '@/components/button/CustomButton';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { GlobalContext } from '@/shared/global';
import { rolePermissionSelector, useAppSelector } from '@/store';
import { ShoppingListStatus } from '@/types/shoppingList';
import { currencyFormat } from '@/utils/b3CurrencyFormat';
import { snackbar } from '@/utils/b3Tip';

interface ShoppingDetailFooterProps {
  selectedProductCount: number;
  shoppingListInfo: any;
  allowJuniorPlaceOrder: boolean;
  selectedSubTotal: number;
  isB2BUser: boolean;
  customColor: string;
  isCanEditShoppingList: boolean;
  onDelete: () => void;
  onAddToCart: () => void;
  onAddToQuote: () => void;
}

function ShoppingDetailFooter({
  onDelete,
  onAddToCart,
  onAddToQuote,
  selectedProductCount,
  shoppingListInfo,
  allowJuniorPlaceOrder,
  selectedSubTotal,
  isB2BUser,
  customColor,
  isCanEditShoppingList,
}: ShoppingDetailFooterProps) {
  const [isMobile] = useMobile();
  const b3Lang = useB3Lang();

  const {
    state: { productQuoteEnabled = false },
  } = useContext(GlobalContext);
  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);

  const { shoppingListCreateActionsPermission } = useAppSelector(rolePermissionSelector);
  const ref = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const containerStyle = isMobile
    ? {
        alignItems: 'flex-start',
        flexDirection: 'column',
      }
    : {
        alignItems: 'center',
      };

  const b2bShoppingListActionsPermission = isB2BUser ? shoppingListCreateActionsPermission : true;

  const handleOpenBtnList = () => {
    if (selectedProductCount === 0) {
      snackbar.error(b3Lang('shoppingList.footer.selectOneItem'));
    } else {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleAddSelectedToCart = () => {
    onAddToCart();
    handleClose();
  };

  const handleAddSelectedToQuote = () => {
    onAddToQuote();
    handleClose();
  };

  const buttons = {
    adSelectedToCart: {
      name: b3Lang('shoppingList.footer.addToCart'),
      key: 'add-selected-to-cart',
      handleClick: handleAddSelectedToCart,
    },
    addSelectedToQuote: {
      name: b3Lang('shoppingList.footer.addToQuote'),
      key: 'add-selected-to-quote',
      handleClick: handleAddSelectedToQuote,
    },
  };

  const buttonList = productQuoteEnabled
    ? [buttons.adSelectedToCart, buttons.addSelectedToQuote]
    : [buttons.adSelectedToCart];

  return (
    <Grid
      sx={{
        position: 'fixed',
        bottom: isMobile && isAgenting ? '52px' : 0,
        left: 0,
        backgroundColor: '#fff',
        width: '100%',
        padding: isMobile ? '0 0 1rem 0' : '0 40px 1rem 40px',
        height: isMobile ? '8rem' : 'auto',
        marginLeft: 0,
        display: 'none',
        flexWrap: 'nowrap',
        zIndex: '999',
      }}
      container
      spacing={2}
    >
      <Grid
        item
        sx={{
          display: isMobile ? 'none' : 'block',
          width: '290px',
          paddingLeft: '20px',
        }}
      />
      <Grid
        item
        sx={
          isMobile
            ? {
                flexBasis: '100%',
              }
            : {
                flexBasis: '690px',
                flexGrow: 1,
              }
        }
      >
        <Box
          sx={{
            width: '100%',
            pr: '20px',
            display: 'flex',
            zIndex: '999',
            justifyContent: 'space-between',
            ...containerStyle,
          }}
        >
          <Typography
            sx={{
              color: '#000000',
              fontSize: '16px',
              fontWeight: '400',
            }}
          >
            {b3Lang('shoppingList.footer.selectedProducts', {
              quantity: selectedProductCount,
            })}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#000000',
              }}
            >
              {b3Lang('shoppingList.footer.subtotal', {
                subtotal: currencyFormat(selectedSubTotal),
              })}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                marginTop: isMobile ? '0.5rem' : 0,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              {!allowJuniorPlaceOrder &&
                isCanEditShoppingList &&
                b2bShoppingListActionsPermission && (
                  <CustomButton
                    sx={{
                      padding: '5px',
                      border: `1px solid ${customColor || '#0D4372'}`,
                      margin: isMobile ? '0 1rem 0 0' : '0 1rem',
                      minWidth: 'auto',
                    }}
                    disabled={shoppingListInfo?.status === ShoppingListStatus.ReadyForApproval}
                  >
                    <Delete
                      color="primary"
                      sx={{
                        color: customColor,
                      }}
                      onClick={onDelete}
                    />
                  </CustomButton>
                )}
              {buttonList.length ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginTop: isMobile ? '0.5rem' : 0,
                    marginLeft: isMobile ? 0 : '20px',
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {buttonList.length === 1 && buttonList[0] && (
                    <CustomButton
                      variant="contained"
                      onClick={buttonList[0].handleClick}
                      sx={{
                        marginRight: isMobile ? '1rem' : 0,
                        width: isMobile ? '100%' : 'auto',
                      }}
                    >
                      {buttonList[0].name}
                    </CustomButton>
                  )}
                  {buttonList.length === 2 && (
                    <>
                      <CustomButton
                        variant="contained"
                        onClick={handleOpenBtnList}
                        ref={ref}
                        sx={{
                          marginRight: isMobile ? '1rem' : 0,
                          width: isMobile ? '100%' : 'auto',
                        }}
                        endIcon={<ArrowDropDown />}
                      >
                        {b3Lang('shoppingList.footer.addSelectedTo')}
                      </CustomButton>
                      <Menu
                        id="basic-menu"
                        anchorEl={ref.current}
                        open={isOpen}
                        onClose={handleClose}
                        MenuListProps={{
                          'aria-labelledby': 'basic-button',
                        }}
                      >
                        {buttonList.length > 1 &&
                          buttonList.map((button) => (
                            <MenuItem
                              key={button.key}
                              onClick={() => {
                                button.handleClick();
                              }}
                            >
                              {button.name}
                            </MenuItem>
                          ))}
                      </Menu>
                    </>
                  )}
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Grid>
      <Grid
        item
        sx={
          isMobile
            ? {
                flexBasis: '100%',
                display: isMobile ? 'none' : 'block',
              }
            : {
                flexBasis: '340px',
                display: isMobile ? 'none' : 'block',
              }
        }
      />
    </Grid>
  );
}

export default ShoppingDetailFooter;
