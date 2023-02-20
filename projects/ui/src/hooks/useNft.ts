import { ref } from 'vue';
import { IBasePart } from '../../../scripts/create_catalog';
import { readNft, unequipSlot } from '../../../scripts/read_token'; 

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = '5G2sjSdb5g6kbJqq2QUT5bD5Ctays9FjhdqKXF1RL5CKVDA8';
  const partsAddress = '5DcKdBRCjrmcisQ47LfjfoA3MjYKE6LbvaAuzr2EsZWVeVqs';

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