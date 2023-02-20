import { ref } from 'vue';
import { IBasePart } from '../../../scripts/create_catalog';
import { readNft, unequipSlot } from '../../../scripts/read_token'; 

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = '5FJgDjwiA2mQCx5kQAgSCiDfrB5mDRGXjUi1D8kbucaWb7jf';
  const partsAddress = '5EgKoUjoqK84PXq3Vn5jEMnWQUKQvQ7KZn3y71s2s1s3iErH';

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