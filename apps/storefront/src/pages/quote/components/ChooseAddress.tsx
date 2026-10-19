import { useEffect, useState } from 'react';
import { Box } from '@mui/material';

import B3Dialog from '@/components/B3Dialog';
import { useB3Lang } from '@/lib/lang';
import { AddressItemType } from '@/types/address';

import { AddressItemCard } from './AddressItemCard';

type AddressItemProps = {
  node: AddressItemType;
};

interface ChooseAddressProps {
  isOpen: boolean;
  addressList: AddressItemProps[];
  closeModal: () => void;
  handleChangeAddress: (address: AddressItemType) => void;
  type: string;
}

function ChooseAddress({
  isOpen,
  closeModal,
  handleChangeAddress,
  addressList = [],
  type,
}: ChooseAddressProps) {
  const b3Lang = useB3Lang();
  const [list, setList] = useState<AddressItemType[]>([]);

  useEffect(() => {
    if (addressList.length) {
      const allList = addressList.map((item: AddressItemProps) => item.node);
      const newList = allList.filter(
        (item) =>
          (item.isShipping === 1 && type === 'shipping') ||
          (item.isBilling === 1 && type === 'billing'),
      );
      setList(newList);
    }
  }, [addressList, type]);

  const handleCancelClicked = () => {
    closeModal();
  };

  return (
    <B3Dialog
      fullWidth
      isOpen={isOpen}
      handleLeftClick={handleCancelClicked}
      title={b3Lang('quoteDraft.chooseAddress.chooseFromSavedAddresses')}
      showRightBtn={false}
      maxWidth="lg"
    >
      <Box
        sx={{
          mt: '20px',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gridAutoRows: '1fr',
            gap: 2,
          }}
        >
          {list.map((addressItem: AddressItemType) => (
            <AddressItemCard
              key={addressItem.id}
              item={addressItem}
              onSetAddress={handleChangeAddress}
            />
          ))}
        </Box>
      </Box>
    </B3Dialog>
  );
}

export default ChooseAddress;
