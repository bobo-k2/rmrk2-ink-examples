// inputs
//  - root path with containing images and metadata (rootPath)
//  - number of tokens to mint
//  - number of equippable slots
//  - contract address
//  - deployed images cid (the same images from images path)
// ... specified in configuration.json
// outputs
//  - json metadata
//  - deployed contract
//  - tokens minted and assets created

// HOW TO BUILD COLLECTION
// 1. Deploy assets folder (deploy folder, not files) to IPFS and update collectionImagesUri in the collection configuration.json
// 2. Deploy collection.json to IPFS and update collectionMetadataUri in the collection configuration.json.
// 3. Run build collection script (WARNING! baseUri configuration parameter should be empty).
//    This step will generate NFTs metadata only
// 4. Deploy metadata folder (deploy folder, not files) to IPFS and update baseUri baseUri in the collection configuration.json
// 5. Run build collection script once again to deploy contract and create collection.

// How to allow equipping to base (i.e. there are 2 RMRK contracts, one with base parts and another with equippables)
// 1. On base call base::addEquippableAddresses for all equippable slots
// 2. Call psp34::approve on child to approve base.
// 3.??????  On child contract call equippable::setValidParentForEqquippableGroup
// 4. Add child to base. On base call nesting::addChild
// 5. Call equippable::equip on base

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import fs from 'fs';
import path from 'path';
import { IBasePart } from 'create_catalog';
import { CollectionConfiguration, Metadata } from 'base';
import { deployRmrkContract } from './deploy_contracts';
import {
  executeCall,
  executeCalls,
  getCall,
  getContract,
  getSigner,
} from './common_api';
import { ALICE_URI } from './secret';
import { loadConfiguration } from './build_common';
import { buildCatalog } from './build_catalog';

/**
 * Builds a RMRK NFT collection.
 * @param basePath Path to the folder with deployment configuration, assets and metadata.
 * @param parentContractAddress Parent contract address.
 * Provide this parameter if you want to automatically add tokens from the collection to parent NFT.
 * Assumption: Random child token will be added to random parent. Numbers of parent and child tokens are the same.
 * @returns collection contract address
 */
export const buildCollection = async (
  basePath: string,
  parentContractAddress: string = undefined
): Promise<string> => {
  const MAX_CALL_SIZE = 50; // Max length of array passed to a contract call.
  let calls: SubmittableExtrinsic<'promise', ISubmittableResult>[] = [];

  await cryptoWaitReady();
  const signer = getSigner(ALICE_URI);

  // Load collection configuration.
  const configuration = loadConfiguration(basePath);
  console.debug(configuration);

  let contractAddress = configuration.contractAddress;
  // Deploy a new RMRK contract
  if (configuration.baseUri && !configuration.contractAddress) {
    contractAddress = await deployRmrkContract(
      signer,
      configuration.name,
      configuration.symbol,
      configuration.baseUri,
      BigInt(configuration.maxSupply),
      BigInt(configuration.pricePerMint),
      configuration.collectionMetadataUri,
      configuration.royaltyReceiverAddress,
      configuration.royalty
    );

    console.log(
      `Contract for collection ${configuration.name} has been deployed at address ${contractAddress}`
    );
  }

  // Build catalog. A lot of magic happens inside.
  const { contractAddress: catalogAddress, catalog } = await buildCatalog(basePath);

  // Write toke metadata. Each token has one json file with metadata.
  if (!configuration.baseUri) {
    writeTokenMetadata(basePath, catalog, configuration);
    return;
  }

  // Get RMRK contract instance.
  const contract = await getContract(contractAddress);

  // Mint tokens
  calls.push(
    await getCall(
      contract,
      'minting::mintMany',
      signer,
      signer.address,
      configuration.maxSupply
    )
  );

  // Execute mintMany call.
  console.log(
    `Executing  mintMany. Number of calls ${calls.length}`
  );
  await executeCalls(calls, signer);
  console.log('Batch call executed.');
  calls = [];

  // Create assets
  const assetsCount = catalog.length - configuration.numberOfEquippableSlots;
  const equippableSlots: number[] = [];
  for (let i = assetsCount; i < catalog.length; i++) {
    equippableSlots.push(i);
  }

  for (let i = 0; i < assetsCount; i++) {
    calls.push(
      await getCall(
        contract,
        'multiAsset::addAssetEntry',
        signer,
        catalogAddress, // Catalog address
        (i + 1).toString(), // Asset id
        '0', // Equippable group id
        catalog[i].partUri, // Asset uri
        [i, ...equippableSlots] // Fixed and equippable slots
      )
    );
  }

  // Execute add asset entry calls
  console.log(`Executing addAssetEntry calls. Number of calls ${calls.length}`);
  await executeCalls(calls, signer);
  console.log('Batch call executed.');
  calls = [];

  for (let i = 0; i < assetsCount; i++) {
    let tokens = [];
    for (let j = i; j < configuration.maxSupply; j += assetsCount) {
      tokens.push({ u64: j + 1 });

      if (
        tokens.length === MAX_CALL_SIZE ||
        j + assetsCount >= configuration.maxSupply
      ) {
        calls.push(
          await getCall(
            contract,
            'batchCalls::addAssetToManyTokens',
            signer,
            tokens, // Token Ids array
            (i + 1).toString() // Asset Id
          )
        );

        tokens = [];
      }
    }
  }

  // Execute all add asset to token calls
  console.log('Executing addAssetToToken');
  await executeCalls(calls, signer);
  console.log('Batch call executed.');

  // Add child tokens
  if (parentContractAddress) {
    calls = [];
    // Generate array from 1 to maxSupply and shuffle members.
    const shuffledTokenIds = Array.from(
      { length: configuration.maxSupply },
      (_, index) => index + 1
    ).sort(() => Math.random() - 0.5);

    // Approve parent
    await executeCall(
      contract,
      'psp34::approve',
      signer,
      parentContractAddress,
      null, //Calling approve without providing token id allows contract owner to add child, TODO check the contract code.
      true
    );

    const parentContract = await getContract(parentContractAddress);
    let tokenPairs = [];
    for (let i = 0; i < configuration.maxSupply; i++) {
      tokenPairs.push([{ u64: i + 1 }, { u64: shuffledTokenIds[i] }]);

      if (
        tokenPairs.length === 2 ||
        i + 1 >= configuration.maxSupply
      ) {
        calls.push(
          await getCall(
            parentContract,
            'batchCalls::addManyChildren',
            signer,
            contractAddress,
            tokenPairs
          )
        );

        tokenPairs = [];
      }
    }

    console.log('Executing addChild batch');
    await executeCalls(calls, signer);
    console.log('Batch call executed.');
  }

  console.log('Script completed');
  return contractAddress;
};

const writeTokenMetadata = (
  basePath: string,
  parts: IBasePart[],
  configuration: CollectionConfiguration
): void => {
  const fixedPartsCount = parts.filter((x) => x.partType === 'Fixed').length;
  const metadataPath = `${basePath}metadata/`;

  // We will reuse base parts. Every fixedPartsCount th token will have the same base part.
  for (let i = 0; i < configuration.maxSupply; i++) {
    const part = parts[i % fixedPartsCount];

    const meta = {
      name: `${configuration.name} #${i + 1}`,
      description: 'A great one',
      image: part.partUri,
      properties: {
        type: {
          type: 'string',
          value: path.parse(part.partUri).name,
        },
      },
    } as Metadata;

    fs.writeFileSync(
      `${metadataPath}${i + 1}.json`,
      JSON.stringify(meta, null, 4),
      'utf-8'
    );
  }

  console.log('Tokens metadata have been created.');
};

const run = async (): Promise<void> => {
  // Base contract
  const baseAddress = 'YYqUMH4vE1raeXwtorAZakaQFVjKZWimnkAevgJ6kd5CLmm'; // await buildCollection('../collections/starduster/');
  // Child contracts
  await buildCollection('../collections/starduster-eyes/', baseAddress);
  // await buildCollection('../collections/starduster-mouths/', baseAddress);
  // await buildCollection('../collections/starduster-headwear/', baseAddress);
  // await buildCollection('../collections/starduster-farts/', baseAddress);

  console.log('\nBase contract address ', baseAddress);
  process.exit(0);
};

run();
