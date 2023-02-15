// This script will read all metadada required to display token on UI in the following order
//  1. getAcceptedAssets
//  2. find composable asset
//  3. find asset details (equipment)

// TODO requires heavy refactoring.

import { ALICE_URI } from './consts';
import { getContract, getGasLimit, getSigner } from './common_api';
import { IBasePart } from './create_catalog';
import { u32, u64 } from '@polkadot/types-codec';
import axios from 'axios';
import { sanitizeIpfsUrl } from './common';

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

export const readNft = async (
  mainContractAddress: string,
  partsContractAddress: string
): Promise<IBasePart[]> => {
  // TODO provide contract address as param.
  const contract = await getContract(mainContractAddress);
  const signer = getSigner(ALICE_URI);
  const tokenId = { u64: 1 };

  // 1. Get assets
  const { result, output } = await contract.query[
    'multiAsset::getAcceptedTokenAssets'
  ](
    signer.address,
    {
      gasLimit: getGasLimit(contract.api),
      storageDepositLimit: null,
    },
    tokenId
  );

  if (result.isOk) {
    // TODO there should be a better way. Maybe typechain
    const assetIds = JSON.parse(output.toString()).ok as number[];
    for (let assetId of assetIds) {
      const { result, output } = await contract.query[
        'equippable::getAssetAndEquippableData'
      ](
        signer.address,
        {
          gasLimit: getGasLimit(contract.api),
          storageDepositLimit: null,
        },
        tokenId,
        assetId
      );

      const { equippableGroupId, assetUri, partIds } = <EquippableData>(
        JSON.parse(output.toString()).ok
      );
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

            const part = <IBasePart>JSON.parse(output.toString());
            return { id, ...part, metadataUri: hex2ascii(part.metadataUri) };
          })
        );

        const sortedParts = parts
          .map((x) => {
            x.metadataUri = x.metadataUri ? sanitizeIpfsUrl(x.metadataUri) : '';
            return x;
          })
          .sort((x, y) => x.z - y.z);
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

          // get baseUri (passed as constructer atgument during the contract initialization.)
          const { output: baseUri } = await partsContract.query[
            'psp34Metadata::getAttribute'
          ](
            signer.address,
            {
              gasLimit: getGasLimit(contract.api),
              storageDepositLimit: null,
            },
            collectionId.toHuman(),
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

            const equipmentJson = JSON.parse(equipment.toString()).ok;
            // TODO use TypeChain or similar
            if (equipmentJson && equipmentJson.childNft) {
              const partTokenId = equipmentJson.childNft[1].u64;
              const metadadtaJsonUri = `${sanitizeIpfsUrl(
                baseUri.toHuman().toString()
              )}/${partTokenId}.json`;

              // fetch json throught IPFS gateway
              const metadataJson = await axios.get(metadadtaJsonUri);
              ePart.metadataUri = sanitizeIpfsUrl(metadataJson.data.image);
            }
          }
        }

        // Now we have all IPFS urls and we are ready to render parts.
        console.log(sortedParts);
        return sortedParts;
      }
    }
  } else {
    console.error('Can not fetch token assets.');
  }

  return [];
};

const getIpfsGatewayUrl = (ipfsUrl: string) => {
  const cid = ipfsUrl.replace('ipfs://', '');
  return `https://${cid}.ipfs.nftstorage.link`;
};

const hex2ascii = (hex: string): string => {
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

readNft(
  '5F4Aoy2nfGeRLZXF7mm4gk7ZhymXy4EaMRBKzjkNthpUJ8nk',
  '5FtKQKUiFD9oy8mLqeEnKVQmhThwNachxmZquCQRJHZA8tgQ'
);
