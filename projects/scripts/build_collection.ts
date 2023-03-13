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

// HOW TO BUILD
// 1. Deploy NFT images to IPFS and update collectionImagesUri in the collection configuration.json
// 2. Deploy collection.json to IPFS and update collectionMetadataUri in the collection configuration.json.
// 3. Run build collection script (WARNING! baseUri configuration parameter should be empty).
// 4. Deploy metadata folder to IPFS and update baseUri baseUri in the collection configuration.json
// 5. Run build collection script once again just to update baseUri on the contract.

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import fs from 'fs';
import path from 'path';
import { IBasePart } from 'create_catalog';
import { CollectionConfiguration, Metadata } from 'base';
import { deployRmrkContract } from './deploy_contracts';
import { executeCalls, getCall, getContract, getSigner } from './common_api';
import { ALICE_URI } from './consts';

export const buildCollection = async (basePath: string, metadataOnly = true): Promise<void> => {
  let calls: SubmittableExtrinsic<'promise', ISubmittableResult>[] = [];

  await cryptoWaitReady();
  const signer = getSigner(ALICE_URI);

  // Load collection configuration.
  const configuration = loadConfiguration(basePath);
  console.debug(configuration);

  // If contract is already deployed just update metadata
  // if (configuration.contractAddress) {
  //   // update contract metadata here.
  //   return;
  // }

  // Deploy a new contract
  const contractAddress = await deployRmrkContract(
    configuration.name,
    configuration.symbol,
    configuration.baseUri,
    BigInt(configuration.maxSupply),
    BigInt(configuration.pricePerMint),
    configuration.collectionMetadataUri,
    configuration.royaltyReceiverAddress,
    configuration.royalty
  );
  const contract = await getContract(contractAddress);
  console.log(
    `Contract for collection ${configuration.name} has been deployed at address ${contractAddress}`
  );

  // Create catalog.
  const catalog = await createCatalog(
    contractAddress,
    configuration.numberOfEquippableSlots,
    basePath,
    configuration.collectionMetadataUri.replace('/collection.json', '')
  );
  calls.push(await getCall(contract, 'base::addPartList', signer, catalog));

  // Write metadata.
  writeTokenMetadata(basePath, catalog, configuration);

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

  // Create assets
  const assetsCount = catalog.length - configuration.numberOfEquippableSlots;
  const equippableSlots: number[] = [];
  for (let i = assetsCount; i < catalog.length; i++) {
    equippableSlots.push(i);
  }

  for (let i = 0; i < catalog.length - configuration.numberOfEquippableSlots; i++) {
    calls.push(
      await getCall(
        contract,
        'multiAsset::addAssetEntry',
        signer,
        (i + 1).toString(), // Asset id
        '0',                // Equippable group id
        catalog[i].partUri, // Asset uri
        [i, ...equippableSlots]
      )
    );
  }

  // Execute add asset entry calls
  await executeCalls(calls, signer);
  console.log('Batch call executed.');
  calls = []

  // Add assets to a token
  for (let i = 0; i < configuration.maxSupply; i++) {
    calls.push(
      await getCall(
        contract,
        'multiAsset::addAssetToToken',
        signer,
        { u64: i + 1 }, // Token Id
        (i % assetsCount + 1).toString(), // Asset Id
        null
      )
    );
  }

  // Execute all add asset to token calls
  await executeCalls(calls, signer);
  console.log('Batch call executed.');
};

/**
 * Creates a NFT catalog from a directory structure.
 * Catalog files are organized in subfolders under imagesPath folder.
 * Files that belongs to the same layer should be stored in the same folder. Folder name should be something like z_something,
 * where z is z index.
 * @param contractAddress NFT contract address
 * @param numberOfSlots Number of equippable slots to create
 * @param assetsPath Path to the folder with images organized in subfolders.
 * @param imagesUri CID of imagesPath folder deployed on IPFS.
 * @returns IBasePart[]
 */
export const createCatalog = async (
  contractAddress: string,
  numberOfSlots: number,
  basePath: string,
  imagesUri: string
): Promise<IBasePart[]> => {
  const result: IBasePart[] = [];
  const fixedPartsZ: number[] = [];
  const assetsPath = `${basePath}assets`;

  console.log('Creating a catalog');
  // Create fixed parts.
  // TODO see how to exclude hidden files (e.g. .DS_Store)
  const folders = fs
    .readdirSync(assetsPath, { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name !== '.DS_Store')
    .map((x) => x.name);

  for (let folder of folders) {
    const z = parseInt(folder.split('_')[0]);
    fixedPartsZ.push(z);
    const files = await fs.promises.readdir(`${assetsPath}/${folder}`);
    for (let file of files.filter((x) => x !== '.DS_Store')) {
      result.push({
        partType: 'Fixed',
        partUri: `${imagesUri}/${folder}/${file}`,
        z,
      });
    }
  }

  // Create slots. Assumption, slots z order fills holes between fixed parts z indices.
  let slotsAdded = 0;
  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
    if (fixedPartsZ.indexOf(i) === -1) {
      result.push({
        partType: 'Slot',
        equippable: [contractAddress],
        z: i,
      });
      slotsAdded++;
    }

    if (slotsAdded >= numberOfSlots) {
      break;
    }
  }

  return result;
};

const loadConfiguration = (assetsPath: string): CollectionConfiguration => {
  console.log(`Loading collection configuration from ${assetsPath}`)
  const config = JSON.parse(
    fs.readFileSync(`${assetsPath}configuration.json`, 'utf-8')
  );

  return <CollectionConfiguration>config;
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

buildCollection('../collections/starduster-eyes/');
