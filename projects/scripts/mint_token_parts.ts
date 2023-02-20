import { ALICE_URI, BOB_URI, PRICE_PER_MINT } from './consts';
import {
  executeCall,
  executeCallWithValue,
  getContract,
  getSigner,
} from './common_api';

export enum PartIds {
  BonePreview = 1,
  BoneLeft = 2,
  BoneRight = 3,
  FlagPreview = 4,
  FlagLeft = 5,
  FlagRight = 6,
}

enum EquipGroups {
  Preview = 0,
  LeftHand = 1,
  RightHand = 2,
}

export const mintTokenParts = async (
  chunkyPartsAddress: string,
  chunkyAddress: string
): Promise<void> => {
  const chunkyParts = await getContract(chunkyPartsAddress);
  const bob = getSigner(BOB_URI);
  const alice = getSigner(ALICE_URI);

  console.log('Minting Chunky Parts as Bob');
  const PART_TOKENS_TO_MINT = 4;
  console.log(
    await executeCallWithValue(
      chunkyParts,
      'minting::mint',
      bob,
      PRICE_PER_MINT * BigInt(PART_TOKENS_TO_MINT),
      bob.address,
      PART_TOKENS_TO_MINT
    )
  );

  console.log('Adding assets to Chunky Parts contracts as deployer');
  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.BonePreview,
      EquipGroups.Preview,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_bone_thumb.png',
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.BoneLeft,
      EquipGroups.LeftHand,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_bone_left.svg',
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.BoneRight,
      EquipGroups.RightHand,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_bone_right.svg',
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.FlagPreview,
      EquipGroups.Preview,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_flag_thumb.png',
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.FlagLeft,
      EquipGroups.LeftHand,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_flag_left.svg',
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      PartIds.FlagRight,
      EquipGroups.RightHand,
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_flag_right.svg',
      []
    )
  );

  console.log('Adding assets to tokens');
  const tokenId1 = { u64: 1 };
  const tokenId2 = { u64: 2 };
  
  // Add bone assets to token 1
  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId1,
      PartIds.BonePreview,
      null
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId1,
      PartIds.BoneLeft,
      null
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId1,
      PartIds.BoneRight,
      null
    )
  );

  // Add bone assets to token 2
  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId2,
      PartIds.FlagPreview,
      null
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId2,
      PartIds.FlagLeft,
      null
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId2,
      PartIds.FlagRight,
      null
    )
  );

  // Set slots for equippable groups
  console.log('Set equippable group parents');

  console.log(
    await executeCall(
      chunkyParts,
      'equippable::setValidParentForEquippableGroup',
      bob,
      EquipGroups.LeftHand,
      chunkyAddress,
      12 // slot
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'equippable::setValidParentForEquippableGroup',
      bob,
      EquipGroups.RightHand,
      chunkyAddress,
      13 // slot
    )
  );
};
