import {
  executeCall,
  executeCallWithValue,
  getContract,
  getSigner,
} from './common_api';
import {
  ALICE_URI,
  BOB_URI,
  CHUNKY_ADDRESSS,
  CHUNKY_PARTS_ADDRESS,
} from './consts';

/**
 * Builds muti asset equipable Chunky NFT. Based on:
 * https://github.com/rmrk-team/evm-sample-contracts/tree/master/contracts/MergedEquippable
 *
 */
export const buildToken = async (
  chunkyAddress = CHUNKY_ADDRESSS,
  chunkyPartsAddress = CHUNKY_PARTS_ADDRESS
) => {
  const chunky = await getContract(chunkyAddress);
  const chunkyParts = await getContract(chunkyPartsAddress);
  const alice = getSigner(ALICE_URI);
  const bob = getSigner(BOB_URI);
  const pricePerMint = BigInt(1_000_000_000_000_000_000);

  // *************************************** Mint chunky as Bob
  console.log('Minting Chunky as Bob');
  const TOKENS_TO_MINT = 1;
  console.log(
    await executeCallWithValue(
      chunky,
      'minting::mint',
      bob,
      pricePerMint,
      bob.address,
      TOKENS_TO_MINT
    )
  );

  // *************************************** Mint two chunky parts as Bob
  console.log('Minting Two Chunky Parts as Bob');
  console.log(
    await executeCallWithValue(
      chunkyParts,
      'minting::mint',
      bob,
      pricePerMint * BigInt(2),
      bob.address,
      TOKENS_TO_MINT * 2
    )
  );

  // *************************************** Add assets to Chunky as contract deployer (Alice)
  console.log('Adding assets to Chunky');
  const assetDefaultId = 1;
  const assetComposedId = 2;
  const equippableGroupId = '0';

  console.log(
    await executeCall(
      chunky,
      'multiAsset::addAssetEntry',
      alice,
      assetDefaultId,
      equippableGroupId,
      [
        'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Preview.png',
      ],
      []
    )
  );

  console.log(
    await executeCall(
      chunky,
      'multiAsset::addAssetEntry',
      alice,
      assetComposedId,
      equippableGroupId,
      [
        'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Preview.png',
      ],
      [0, 5, 10, 12, 13]
    )
  );

  // *************************************** Add all assets to token 1 (id) as deployer
  console.log('Add all assets to token 1 (id) as deployer');
  const tokenId = { u64: 1 };

  console.log(
    await executeCall(
      chunky,
      'multiAsset::addAssetToToken',
      alice,
      tokenId,
      assetDefaultId,
      null
    )
  );

  console.log(
    await executeCall(
      chunky,
      'multiAsset::addAssetToToken',
      alice,
      tokenId,
      assetComposedId,
      null
    )
  );

  // *************************************** Bob accepts both assets
  console.log('Accept assets by Bob');

  console.log(
    await executeCall(
      chunky,
      'multiAsset::acceptAsset',
      bob,
      tokenId,
      assetDefaultId
    )
  );

  console.log(
    await executeCall(
      chunky,
      'multiAsset::acceptAsset',
      bob,
      tokenId,
      assetComposedId
    )
  );

  // *************************************** Add assets to parts as deployer
  console.log('Deployer adds assets to chunky parts');
  const equippableRefIdLeftHand = 1;
  const equippableRefIdRightHand = 2;
  const boneLeftId = 1;
  const boneRightId = 2;

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      boneLeftId,
      equippableRefIdLeftHand,
      [
        'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_bone_left.svg',
      ],
      []
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetEntry',
      alice,
      boneRightId,
      equippableRefIdRightHand,
      [
        'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Items/Chunky_bone_left.svg',
      ],
      []
    )
  );

  // *************************************** Set equipable group parents
  // Valid hand item slots are 12 and 13 (zero based)
  console.log('Set equipable group parents');

  console.log(
    await executeCall(
      chunkyParts,
      'equippable::setValidParentForEquippableGroup',
      bob,
      equippableRefIdLeftHand,
      chunky.address,
      12 // slot
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'equippable::setValidParentForEquippableGroup',
      bob,
      equippableRefIdRightHand,
      chunky.address,
      13 // slot
    )
  );

  // *************************************** add asset 1 (bone) to left hand and asset 2 (bone) to right hand
  console.log(
    'Adding asset 1 (bone) to left hand and asset 2 (bone) to right hand'
  );
  const tokenId_2 = { u64: 2 };

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId,
      boneLeftId,
      null
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'multiAsset::addAssetToToken',
      bob,
      tokenId_2,
      boneRightId,
      null
    )
  );

  // *************************************** Bob approves chunky contract chunky parts (for bones for nesting on Chunky)
  console.log('Approving chunky parts');

  console.log(
    await executeCall(
      chunkyParts,
      'psp34::approve',
      bob,
      chunky.address,
      tokenId,
      true
    )
  );

  console.log(
    await executeCall(
      chunkyParts,
      'psp34::approve',
      bob,
      chunky.address,
      tokenId_2,
      true
    )
  );

  // *************************************** Bob adds 2 bones to chunky
  console.log('Adding bones to Chunky');

  console.log(
    await executeCall(chunky, 'nesting::addChild', bob, tokenId, [
      chunkyParts.address,
      tokenId,
    ])
  );

  console.log(
    await executeCall(chunky, 'nesting::addChild', bob, tokenId, [
      chunkyParts.address,
      tokenId_2,
    ])
  );

  // *************************************** Bob equips bones.

  console.log('Equipping bones');
  console.log(
    await executeCall(
      chunky,
      'equippable::equip',
      bob,
      tokenId,
      assetComposedId,
      12, // slot
      [chunkyParts.address, tokenId],
      boneLeftId
    )
  );

  // console.log(
  //   await executeCall(
  //     chunky,
  //     'equippable::equip',
  //     bob,
  //     tokenId,
  //     assetComposedId,
  //     13, // slot
  //     [chunkyParts.address, tokenId_2],
  //     boneRightId
  //   )
  // );
};
