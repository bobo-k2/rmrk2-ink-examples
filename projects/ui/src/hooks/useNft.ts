import { ref } from 'vue';
import { IBasePart } from '../../../scripts/create_catalog';
import { readNft } from '../../../scripts/read_token'; 

export const useNft = () => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = '5F4Aoy2nfGeRLZXF7mm4gk7ZhymXy4EaMRBKzjkNthpUJ8nk';
  const partsAddress = '5FtKQKUiFD9oy8mLqeEnKVQmhThwNachxmZquCQRJHZA8tgQ';

  const fetchNftParts = async (): Promise<void> => {
    parts.value = await readNft(chunkyAddress, partsAddress);
  };

  fetchNftParts();

  return {
    parts
  };
}