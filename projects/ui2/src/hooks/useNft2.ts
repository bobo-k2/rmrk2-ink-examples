import { compile, ref } from "vue";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { sanitizeIpfsUrl } from "../../../scripts/common";
import { getSigner, getTypedContract } from "../../../scripts/common_api";
import { ALICE_URI } from "../../../scripts/secret";
import { hex2ascii } from "../../../scripts/read_token";
import { PartType } from "../../../scripts/typed_contracts/types-returns/rmrk_contract";

export interface Asset {
  equippableGroupId: number;
  assetUri: string;
  parts: Part[];
  id: number;
}

export interface Part {
  id: number;
  partType: PartType;
  z: number;
  partUri: string;
  isEquippableByAll: boolean;
  children: Asset[];
}

export const useNft2 = (contractAddress: string) => {
  const tokenAssets = ref<Asset[]>([]);

  const getToken = async (tokenId: number): Promise<Asset[]> => {
    const assets = await fetchNft(contractAddress, tokenId);
    tokenAssets.value = assets;
    console.log(assets);
    return assets;
  };

  const fetchNft = async (
    contractAddress: string,
    tokenId: number
  ): Promise<Asset[]> => {
    // Signer will not work in real life. Since it is not required for reading I will tweak generated code.
    await cryptoWaitReady();
    const signer = getSigner(ALICE_URI);
    const contract = await getTypedContract(contractAddress, signer);
    const id = { u64: tokenId };
    const result: Asset[] = [];

    const acceptedTokenAssets = (
      await contract.query.getAcceptedTokenAssets(id)
    ).value.unwrap();
    const assetIds = acceptedTokenAssets.unwrap();

    for (const assetId of assetIds) {
      const asset = await contract.query["multiAsset::getAsset"](assetId);
      const assetValue = asset.value.unwrap();
      if (assetValue) {
        const uiAsset = {
          equippableGroupId: assetValue?.equippableGroupId,
          assetUri: sanitizeIpfsUrl(
            hex2ascii(assetValue?.assetUri?.toString() ?? "")
          ),
          parts: [],
          id: assetId
        } as Asset;

        const partsToAdd: Part[] = [];
        for (const partId of assetValue.partIds) {
          const part = await contract.query["base::getPart"](partId);
          const partValue = part.value.unwrap();
          if (partValue) {
            const partToAdd = {
              id: partId,
              partType: partValue.partType,
              z: partValue.z,
              isEquippableByAll: partValue.isEquippableByAll,
              partUri: sanitizeIpfsUrl(
                hex2ascii(partValue.partUri.toString() ?? "")
              ),
            } as Part;

            // Equipment
            if (partToAdd.partType === PartType.slot) {
              const equipment = await contract.query.getEquipment(
                id,
                partToAdd.id
              );
              const equipmentValue = equipment.value.ok ? equipment.value.unwrap() : null;
              if (equipmentValue?.childNft[0] && equipmentValue?.childNft[1]?.u64) {
                partToAdd.children = await fetchNft(equipmentValue?.childNft[0].toString(), equipmentValue.childNft[1].u64)
              }
            }

            partsToAdd.push(partToAdd);
          }
        }

        const filteredAndSortedParts = partsToAdd
          //.filter((x) => x.partType === "Fixed")
          .sort((x, y) => (x?.z ?? 0) - (y?.z ?? 0));
        uiAsset.parts.push(...filteredAndSortedParts);

        result.push(uiAsset);
      }
    }

    return result;
  };

  return {
    getToken,
    tokenAssets,
  };
};
