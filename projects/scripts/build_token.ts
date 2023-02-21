import { mintTokenParts, PartIds } from './mint_token_parts';
import {
  executeCall,
  executeCallWithValue,
  getContract,
  getSigner,
} from './common_api';
import {
  ALICE_URI,
  BOB_URI,
  CHUNKY_ADDRESS,
  CHUNKY_PARTS_ADDRESS,
  PRICE_PER_MINT,
} from './consts';

/**
 * Builds multi asset equippable Chunky NFT. Based on:
 * https://github.com/rmrk-team/evm-sample-contracts/tree/master/contracts/MergedEquippable
 *
 */
export const buildToken = async (
  chunkyAddress = CHUNKY_ADDRESS,
  chunkyPartsAddress = CHUNKY_PARTS_ADDRESS
) => {
  const chunky = await getContract(chunkyAddress);
  const chunkyParts = await getContract(chunkyPartsAddress);
  const alice = getSigner(ALICE_URI);
  const bob = getSigner(BOB_URI);


  // *************************************** Mint chunky as Bob
  console.log('Minting Chunky as Bob');
  const TOKENS_TO_MINT = 1;
  console.log(
    await executeCallWithValue(
      chunky,
      'mintingLazy::mintMany',
      bob,
      PRICE_PER_MINT * BigInt(TOKENS_TO_MINT),
      // bob.address,
      TOKENS_TO_MINT
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
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Preview.png',
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
      'ipfs://QmYWZcsozjhM9CKJX4K83tMLN1G9QKW8TcGuVjdkLfwAaL/Chunky%20Preview.png',
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
  const tokenId_2 = { u64: 2 };
  await mintTokenParts(chunkyPartsAddress, chunkyAddress);

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
      PartIds.BoneLeft
    )
  );

  console.log(
    await executeCall(
      chunky,
      'equippable::equip',
      bob,
      tokenId,
      assetComposedId,
      13, // slot
      [chunkyParts.address, tokenId_2],
      PartIds.FlagRight
    )
  );
};
