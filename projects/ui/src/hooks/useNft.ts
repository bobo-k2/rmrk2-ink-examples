import { ref } from 'vue';
import { IBasePart } from '../../../scripts/create_catalog';
import { readNft, unequipSlot } from '../../../scripts/read_token'; 

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = 'bZppMNEa3XNibNuFazJy632JiM9C7aiuvMGBjcrJwHH5khY';
  const partsAddress = 'at6Hz7SqebyffrTtmfFQp4MFqMNePLYg9PZ4SXMziFtEtYj';

  const fetchNftParts = async (): Promise<void> => {
    parts.value = await readNft(chunkyAddress, partsAddress, tokenId);
  };

  const unequip = async (slot?: string | number): Promise<void> => {
    console.log('unequipping', slot);
    if (slot && await unequipSlot(chunkyAddress, tokenId, slot.toString())) {
      fetchNftParts();
    } else {
      console.log('unable to unequip');
    }
  }

  fetchNftParts();

  return {
    parts,
    unequip
  };
}