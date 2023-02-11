import { Codec } from '@polkadot/types-codec/types';
import { ALICE_URI, CHUNKY_PARTS_ADDRESS } from './consts';
import { getContract, getGasLimit, getSigner } from './common_api';

const storageDepositLimit = null;
const ASSETS_CID = 'QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL';

interface IBasePart {
  partType: 'None' | 'Slot' | 'Fixed';
  equippable?: string[] | '*';
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
    metadataUri: `ipfs://${ASSETS_CID}/v1/Chunky_body_v1.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v2/Chunky_body_v2.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v3/Chunky_body_v3.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v4/Chunky_body_v4.svg`,
    z: 0,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v1/Chunky_head_v1.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v2/Chunky_head_v2.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v3/Chunky_head_v3.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v4/Chunky_head_v4.svg`,
    z: 4,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v1/Chunky_hand_v1.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v2/Chunky_hand_v2.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v3/Chunky_hand_v3.svg`,
    z: 3,
  },
  {
    partType: 'Fixed',
    metadataUri: `ipfs://${ASSETS_CID}/v4/Chunky_hand_v4.svg`,
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

const createCatalog = async (): Promise<void> => {
  const contract = await getContract(CHUNKY_PARTS_ADDRESS);
  const gasLimit = getGasLimit(contract);

  const signer = getSigner(ALICE_URI);

  // Collection Id
  const { output: collectionIdOutput } = await contract.query[
    'psp34::collectionId'
  ](signer.address, {
    gasLimit,
    storageDepositLimit,
  });
  const collectionId = (<Id>collectionIdOutput).asBytes.toHex();

  // addPartList try run (not needed, because max gas has been sent)
  const { result } = await contract.query['base::addPartList'](
    signer.address,
    {
      gasLimit,
      storageDepositLimit,
    },
    fixedParts
  );

  if (result.isOk) {
    const allParts = [...fixedParts, ...getSlotParts([CHUNKY_PARTS_ADDRESS])];
    await contract.tx['base::addPartList'](
      {
        gasLimit,
        storageDepositLimit,
      },
      allParts
    ).signAndSend(signer, (result) => {
      console.log(
        `Status: ${result.status.toHuman()}, is error: ${result.isError}`
      );
    });
  } else {
    console.error(
      `base::addPartList try run failed with error: ${result.asErr}`
    );
  }
};

createCatalog();
