// This script will read all metadata required to display token on UI in the following order
//  1. getAcceptedAssets
//  2. find composable asset
//  3. find asset details (equipment)

// TODO requires heavy refactoring.

import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ALICE_URI, BOB_URI } from './secret';
import {
  executeCall,
  getApi,
  getContract,
  getGasLimit,
  getSigner,
  getTypedContract,
} from './common_api';
import { IBasePart } from './create_catalog';
import { u32, u64 } from '@polkadot/types-codec';
import { sanitizeIpfsUrl } from './common';
import { IdBuilder } from './typed_contracts/types-arguments/rmrk_contract';
import {
  AccountId,
  Asset,
  Id,
} from './typed_contracts/types-returns/rmrk_contract';

interface EquippableData {
  equippableGroupId: string;
  assetUri: string;
  partIds: string[];
}

interface Equipment {
  assetId: u32;
  childAssetId: u32;
  childNft: [string, u64];
}

export type ExtendedAsset = Asset & { id: number; gatewayUrl: string };

export const readNft = async (
  mainContractAddress: string,
  partsContractAddress: string,
  id: number
): Promise<IBasePart[]> => {
  // TODO provide contract address as param.
  await cryptoWaitReady();
  const contract = await getContract(mainContractAddress);
  const partsContract = await getContract(partsContractAddress);
  const signer = getSigner(ALICE_URI);
  const tokenId = { u64: id };
  const contractTyped = await getTypedContract(mainContractAddress, signer);

  const result = (await contractTyped.query.getAcceptedTokenAssets(tokenId)).value.unwrap();
  if (result.ok) {
      const assetIds = result.unwrap();
      for (let assetId of assetIds) {
      const equippableData = (await contractTyped.query.getAssetAndEquippableData(tokenId, assetId)).value.unwrap();
      const partIds = equippableData.unwrap().partIds;
      const isComposable = partIds && partIds.length > 0;

      if (isComposable) {
        // Parts contract address should come from the above call (getAssetAndEquippableData).
        // Raised an issue https://github.com/rmrk-team/rmrk-ink/issues/46
        const partsContract = await getContract(partsContractAddress);

        const parts = await Promise.all(
          partIds.map(async (id) => {
            const { output } = await partsContract.query['base::getPart'](
              signer.address,
              {
                gasLimit: getGasLimit(contract.api),
                storageDepositLimit: null,
              },
              id
            );

            const part = <IBasePart>JSON.parse(output?.toString() ?? '');
            return { id, ...part, metadataUri: hex2ascii(part.partUri ?? '') };
          })
        );

        const sortedParts = parts
          .map((x) => {
            x.metadataUri = x.metadataUri ? sanitizeIpfsUrl(x.metadataUri) : '';
            return x;
          })
          .sort((x, y) => (x?.z ?? 0) - (y?.z ?? 0));
        const equippableParts = sortedParts.filter(
          (x) => x.partType === 'Slot'
        );

        // get equipment
        if (equippableParts.length > 0) {
          // determine base Uri
          // get collection id
          const { output: collectionId } = await partsContract.query[
            'psp34::collectionId'
          ](signer.address, {
            gasLimit: getGasLimit(contract.api),
            storageDepositLimit: null,
          });

          // get baseUri (passed as constructor argument during the contract initialization.)
          const { output: baseUri } = await partsContract.query[
            'psp34Metadata::getAttribute'
          ](
            signer.address,
            {
              gasLimit: getGasLimit(contract.api),
              storageDepositLimit: null,
            },
            collectionId?.toHuman(),
            'baseUri'
          );

          for (let ePart of equippableParts) {
            const { output: equipment } = await contract.query[
              'equippable::getEquipment'
            ](
              signer.address,
              {
                gasLimit: getGasLimit(contract.api),
                storageDepositLimit: null,
              },
              tokenId,
              ePart.id
            );

            if (equipment?.isEmpty) {
              continue;
            }

            const equipmentJson = JSON.parse(equipment?.toString() ?? '');
            // TODO use TypeChain or similar
            if (equipmentJson && equipmentJson.childNft) {
              const partTokenId = equipmentJson.childNft[1].u64;
              const metadataJsonUri = `${sanitizeIpfsUrl(
                baseUri?.toHuman()?.toString()
              )}/${partTokenId}.json`;

              const { output: assetUri } = await partsContract.query[
                'multiAsset::getAssetUri'
              ](
                signer.address,
                {
                  gasLimit: getGasLimit(contract.api),
                  storageDepositLimit: null,
                },
                equipmentJson.childAssetId
              );

              // fetch json through IPFS gateway
              // const metadataJson = await axios.get(metadataJsonUri);
              // ePart.metadataUri = sanitizeIpfsUrl(metadataJson.data.image);
              ePart.metadataUri = sanitizeIpfsUrl(
                assetUri?.toHuman()?.toString()
              );
            }
          }
        }

        // Now we have all IPFS urls and we are ready to render parts.
        // console.log(sortedParts);
        return sortedParts;
      }
    }
  } else {
    console.error('Can not fetch token assets.');
  }

  return [];
};

export const unequipSlot = async (
  contractAddress: string,
  tokenId: number,
  slotId: string
): Promise<boolean> => {
  const contract = await getContract(contractAddress);
  return await executeCall(
    contract,
    'equippable::unequip',
    getSigner(BOB_URI), // Should be passed as parameter.
    { u64: tokenId },
    slotId
  );
};

export const getEquippableChildren = async (
  contractAddress: string,
  tokenId: number
): Promise<Map<Id, (ExtendedAsset | null)[]>> => {
  await cryptoWaitReady();
  const signer = getSigner(ALICE_URI);
  const contract = await getTypedContract(contractAddress, signer);
  const result = new Map<Id, (ExtendedAsset | null)[]>();

  const children = await contract.query.getAcceptedChildren(
    IdBuilder.U64(tokenId)
  );

  if (children.value) {
    // for (let child of children.value) {
    //   const partsContract = await getTypedContract(child[0].toString(), signer);
    //   const childTokenId = IdBuilder.U64(child[1].u64 ?? 0);
    //   const assetIds = await partsContract.query.getAcceptedTokenAssets(
    //     childTokenId
    //   );

    //   if (assetIds.value.ok) {
    //     const assetsToAdd: ExtendedAsset[] = [];
    //     for (let id of assetIds.value.unwrap()) {
    //       const asset = await partsContract.query['multiAsset::getAsset'](id);
    //       if (asset.value) {
    //         assetsToAdd.push({
    //           ...asset.value,
    //           id,
    //           gatewayUrl: sanitizeIpfsUrl(
    //             hex2ascii(asset.value.assetUri.toString())
    //           ),
    //         } as ExtendedAsset);
    //       }
    //     }

    //     result.set(child[1], assetsToAdd);
    //   }
    // }
  }

  return result;
};

export const equipSlot = async (
  parentContractAddress: string,
  tokenId: Id,
  assetId: string,
  slot: number,
  childContractAddress: string,
  childTokenId: Id,
  childAssetId: string
): Promise<void> => {
  const signer = getSigner(BOB_URI);
  const contract = await getTypedContract(parentContractAddress, signer);
  
  await contract.tx.equip(
    IdBuilder.U64(tokenId.u64 ?? 0),
    assetId,
    slot,
    [childContractAddress, IdBuilder.U64(childTokenId.u64 ?? 0)],
    childAssetId
  );
};

const getIpfsGatewayUrl = (ipfsUrl: string) => {
  const cid = ipfsUrl.replace('ipfs://', '');
  return `https://${cid}.ipfs.nftstorage.link`;
};

export const hex2ascii = (hex: string): string => {
  if (!hex) {
    return '';
  }

  let result = '';
  hex = hex.replace('0x', '');
  for (let i = 0; i < hex.length; i += 2) {
    result += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return result;
};