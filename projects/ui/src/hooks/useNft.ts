import { ref } from "vue";
import { IBasePart } from "../../../scripts/create_catalog";
import {
  readNft,
  unequipSlot,
  getEquippableChildren,
} from "../../../scripts/read_token";
import { Id } from "../../../scripts/typed_contracts/types-returns/rmrk_contract";

export interface AssetPreview {
  id: number;
  url: string;
}

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = "5FQFMtrD4FKugth8BP6CJmEP9BzhVRwQzH3xrHNnQ79ka6h7";
  const partsAddress = "5GBVn5pMBC9BVi266vaDm4mSqPrTvT3LpYbaAs9DX8kn6yWb";

  const fetchNftParts = async (): Promise<void> => {
    parts.value = await readNft(chunkyAddress, partsAddress, tokenId);
  };

  const unequip = async (slot?: string | number): Promise<void> => {
    console.log("unequipping", slot);
    if (slot && (await unequipSlot(chunkyAddress, tokenId, slot.toString()))) {
      fetchNftParts();
    } else {
      console.log("unable to unequip");
    }
  };

  const getChildrenToEquipPreview = async (
    slotId: number
  ): Promise<AssetPreview[]> => {
    const children = await getEquippableChildren(chunkyAddress, tokenId);
    // console.log(children);
    const result: AssetPreview[] = [];

    children.forEach((v, k) => {
      // Assumption. Preview asset is always first asset.
      result.push({
        id: v?.
      } as AssetPreview)
    });

    return children.values. map((item) => {
      
      return {
        id: (<number[]>item[1])[0],
        url: "",
      } as AssetPreview;
    });
  };

  fetchNftParts();

  return {
    parts,
    unequip,
    getChildrenToEquipPreview,
  };
};
