import { Codec } from '@polkadot/types-codec/types';
import { ALICE_URI, CHUNKY_PARTS_ADDRESS } from './consts';
import { executeCall, getContract, getSigner } from './common_api';

const storageDepositLimit = null;
const ASSETS_CID = 'QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL';

export type PartType = 'None' | 'Slot' | 'Fixed';

export interface IBasePart {
  id?: string | number;
  partType: PartType;
  equippable?: string[] | '*';
  partUri?: string;
  metadataUri?: string;
  isEquippableByAll?: boolean;
  z?: number;
}

interface Id extends Codec {
  asBytes: Codec;
}

const fixedParts: IBasePart[] = [
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v1/Chunky_body_v1.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v2/Chunky_body_v2.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v3/Chunky_body_v3.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v4/Chunky_body_v4.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v1/Chunky_head_v1.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v2/Chunky_head_v2.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v3/Chunky_head_v3.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v4/Chunky_head_v4.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v1/Chunky_hand_v1.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v2/Chunky_hand_v2.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v3/Chunky_hand_v3.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    partUri: `ipfs://${ASSETS_CID}/v4/Chunky_hand_v4.svg`,
    z: 3,
  },
];

const getSlotParts = (equippable: string[] | '*' = []): IBasePart[] => {
  return [
    {
      partType: 'Slot',
      equippable,
      z: 1,
    },
    {
      partType: 'Slot',
      equippable,
      z: 2,
    },
  ];
};

export const createCatalog = async (contractAddress = CHUNKY_PARTS_ADDRESS): Promise<void> => {
  const contract = await getContract(contractAddress);
  const alice = getSigner(ALICE_URI);
  const allParts = [...fixedParts, ...getSlotParts([contractAddress])];

  console.log('Adding base parts');
  await executeCall(contract, 'base::addPartList', alice, allParts);
};
