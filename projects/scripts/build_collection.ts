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

  // Create catalog.
  // const catalog = await createCatalog(
  //   contractAddress,
  //   configuration.numberOfEquippableSlots,
  //   basePath,
  //   configuration.collectionImagesUri
  // );
  const { catalog } = await buildCatalog(basePath);

  // Write metadata.
  if (!configuration.baseUri) {
    writeTokenMetadata(basePath, catalog, configuration);
    return;
  }

  // Create contract instance.
  const contract = await getContract(contractAddress);
  calls.push(await getCall(contract, 'base::addPartList', signer, catalog));

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

  // Execute mintMany and addPartList calls
  console.log(
    `Executing  mintMany and addPartList calls. Number of calls ${calls.length}`
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
        (i + 1).toString(), // Asset id
        '0', // Equippable group id
        catalog[i].partUri, // Asset uri
        [i, ...equippableSlots]
      )
    );
  }

  // Execute add asset entry calls
  console.log(`Executing addAssetEntry calls. Number of calls ${calls.length}`);
  await executeCalls(calls, signer);
  console.log('Batch call executed.');
  calls = [];

  // Add assets to a token
  for (let i = 0; i < configuration.maxSupply; i++) {
    calls.push(
      await getCall(
        contract,
        'multiAsset::addAssetToToken',
        signer,
        { u64: i + 1 }, // Token Id
        ((i % assetsCount) + 1).toString(), // Asset Id
        null
      )
    );
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
    for (let i = 0; i < configuration.maxSupply; i++) {
      calls.push(
        await getCall(
          parentContract,
          'nesting::addChild',
          signer,
          { u64: i + 1 }, // Parent token Id
          [contractAddress, { u64: shuffledTokenIds[i] }]
        )
      );
    }

    console.log('Executing addChild batch');
    await executeCalls(calls, signer);
    console.log('Batch call executed.');
  }

  console.log('Script completed');
  return contractAddress;
};

// /**
//  * Creates a NFT catalog from a directory structure.
//  * Catalog files are organized in subfolders under imagesPath folder.
//  * Files that belongs to the same layer should be stored in the same folder. Folder name should be something like z_something,
//  * where z is z index.
//  * @param contractAddress NFT contract address
//  * @param numberOfSlots Number of equippable slots to create
//  * @param assetsPath Path to the folder with images organized in subfolders.
//  * @param imagesUri CID of imagesPath folder deployed on IPFS.
//  * @returns IBasePart[]
//  */
// export const createCatalog = async (
//   contractAddress: string,
//   numberOfSlots: number,
//   basePath: string,
//   imagesUri: string
// ): Promise<IBasePart[]> => {
//   const result: IBasePart[] = [];
//   const fixedParts: number[] = [];
//   const assetsPath = `${basePath}assets`;

//   console.log('Creating a catalog');
//   // Create fixed parts.
//   // TODO see how to exclude hidden files (e.g. .DS_Store)
//   const folders = fs
//     .readdirSync(assetsPath, { withFileTypes: true })
//     .filter((x) => x.isDirectory() && x.name !== '.DS_Store')
//     .map((x) => x.name);

//   for (let folder of folders) {
//     const z = parseInt(folder.split('_')[0]);
//     fixedParts.push(z);
//     const files = await fs.promises.readdir(`${assetsPath}/${folder}`);
//     for (let file of files.filter((x) => x !== '.DS_Store')) {
//       result.push({
//         partType: 'Fixed',
//         partUri: `${imagesUri}/${folder}/${file}`,
//         z,
//       });
//     }
//   }

//   // Create slots. Assumption, slots z order fills holes between fixed parts z indices.
//   let slotsAdded = 0;
//   for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
//     if (slotsAdded >= numberOfSlots) {
//       break;
//     }

//     if (fixedParts.indexOf(i) === -1) {
//       result.push({
//         partType: 'Slot',
//         equippable: [contractAddress],
//         z: i,
//       });
//       slotsAdded++;
//     }
//   }

//   return result;
// };

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
  const baseAddress = await buildCollection('../collections/starduster/');
  // Child contracts
  await buildCollection('../collections/starduster-eyes/', baseAddress);
  await buildCollection('../collections/starduster-mouths/', baseAddress);
  await buildCollection('../collections/starduster-headwear/', baseAddress);
  await buildCollection('../collections/starduster-farts/', baseAddress);

  console.log('\nBase contract address ', baseAddress);
  process.exit(0);
};

run();
