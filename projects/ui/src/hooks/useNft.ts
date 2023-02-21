import { ref } from 'vue';
import { IBasePart } from '../../../scripts/create_catalog';
import { readNft, unequipSlot } from '../../../scripts/read_token'; 

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = '5Ff5SqtbvUzvzZ6Zz5hgjvmj2kbmgvLvrZduw9NU5aGrVTco';
  const partsAddress = '5D3ckVqXRoiXuKQ4CMH8Edvfni21h9Uo8MokFEgynwAKipdh';

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