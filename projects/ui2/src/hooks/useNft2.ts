import { ref } from "vue";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { sanitizeIpfsUrl } from "../../../scripts/common";
import { getSigner, getTypedContract } from "../../../scripts/common_api";
import { ALICE_URI } from "../../../scripts/consts";
import { hex2ascii } from "../../../scripts/read_token";
import { PartType } from "../../../scripts/typed_contracts/types-returns/rmrk_contract";

export interface Asset {
  equippableGroupId: number;
  assetUri: string;
  parts: Part[];
}

export interface Part {
  partType: PartType;
  z: number;
  partUri: string;
  isEquippableByAll: boolean;
}

export const useNft2 = (contractAddress: string) => {
  const tokenAssets = ref<Asset[]>([]);

  const fetchNft = async (tokenId: number): Promise<Asset[]> => {
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

    const assets = await Promise.all(
      assetIds.map(async (id) => {
        return contract.query["multiAsset::getAsset"](id);
      })
    );

    for (const asset of assets) {
      const assetValue = asset.value.unwrap();
      if (assetValue) {
        const uiAsset = {
          equippableGroupId: assetValue?.equippableGroupId,
          assetUri: sanitizeIpfsUrl(
            hex2ascii(assetValue?.assetUri?.toString() ?? "")
          ),
          parts: [],
        } as Asset;

        const parts = await Promise.all(
          assetValue.partIds.map((id) => {
            return contract.query["base::getPart"](id);
          })
        );

        const partsToAdd: Part[] = [];
        for (const part of parts) {
          const partValue = part.value.unwrap();
          if (partValue) {
            partsToAdd.push({
              partType: partValue.partType,
              z: partValue.z,
              isEquippableByAll: partValue.isEquippableByAll,
              partUri: sanitizeIpfsUrl(
                hex2ascii(partValue.partUri.toString() ?? "")
              ),
            } as Part);
          }
        }
        const filteredAndSortedParts = partsToAdd
          .filter((x) => x.partType === "Fixed")
          .sort((x, y) => (x?.z ?? 0) - (y?.z ?? 0));
        uiAsset.parts.push(...filteredAndSortedParts);

        result.push(uiAsset);
      }
    }

    console.log(result);
    tokenAssets.value = result;
    return result;
  };

  return {
    fetchNft,
    tokenAssets,
  };
};
