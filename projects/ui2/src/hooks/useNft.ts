import { ref } from "vue";
import { IBasePart } from "../../../scripts/create_catalog";
import {
  readNft,
  unequipSlot,
  getEquippableChildren,
  equipSlot,
  ExtendedAsset,
} from "../../../scripts/read_token";
import { Id } from "../../../scripts/typed_contracts/types-returns/rmrk_contract";

export interface AssetPreview {
  id: number;
  url: string;
}

export const useNft = (tokenId: number) => {
  const parts = ref<IBasePart[]>([]);
  const chunkyAddress = "5FCwrmBRma89zmea4up7NkaWGDdMPTJpMwwusYueF4qp4rn5";
  const partsAddress = "5FVH3Hg3S7N9Ask4D5uLo5VD9B8rKo1BZndTgjSTY7VNYWVv";

  const fetchNftParts = async (): Promise<void> => {
    parts.value = await readNft(chunkyAddress, partsAddress, tokenId);
    console.log(parts.value);
  };

  const unequip = async (slot?: string | number): Promise<void> => {
    console.log("unequipping", slot);
    if (slot && (await unequipSlot(chunkyAddress, tokenId, slot.toString()))) {
      await fetchNftParts();
    } else {
      console.log("unable to unequip");
    }
  };

  const equip = async (slot: string | number, childTokenId: Id, assets: (ExtendedAsset | null)[] | undefined): Promise<void> => {
    // TODO see how to handle this
    const parentAssetToEquip = '2';
    if (slot) {
      // TODO determine asset to equip
      // Assumption. Asset 0 is preview, asset 1 goes to lowest slot number, asset 2 to next one and so on....
      const slots = parts.value.filter(x => x.partType === 'Slot').map(x => x.id);
      const assetIndex = slots.indexOf(slot) + 1;
      const assetId = assets ? assets[assetIndex]?.id.toString() : '1';
      await equipSlot(chunkyAddress, { u64: tokenId}, parentAssetToEquip, parseInt(slot.toString()), partsAddress, childTokenId, assetId ?? '1');
      await fetchNftParts();
    }
  }

  const getChildrenToEquipPreview = async (
    slotId: number
  ): Promise<Map<Id, (ExtendedAsset | null)[]>> => {
    const children = await getEquippableChildren(chunkyAddress, tokenId);
    // console.log(children);
    
    return children;
  };

  fetchNftParts();

  return {
    parts,
    equip,
    unequip,
    getChildrenToEquipPreview,
  };
};
