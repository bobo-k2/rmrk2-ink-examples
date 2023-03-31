import { CodeSubmittableResult } from '@polkadot/api-contract/base';
import { CodePromise } from '@polkadot/api-contract';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { WeightV2 } from '@polkadot/types/interfaces';
import { getApi, getSigner } from './common_api';
import { ALICE_URI } from './secret'; // Send as deploy contract call parameter
import Files from 'fs';

export const deployRmrkContract = async (
  name: string,
  symbol: string,
  baseUri: string,
  maxSupply: BigInt,
  pricePerMint: BigInt,
  collectionMetadata: string,
  royaltyReceiver: string,
  royalty: number
): Promise<string | undefined> => {
  console.log(`Deploying smart contract for ${name}`)
  const api = await getApi();
  const alice = getSigner(ALICE_URI);
  const contract = JSON.parse(
    Files.readFileSync('../contract/rmrk_contract.contract').toString()
  );
  const code = new CodePromise(api, contract, contract.source.wasm);
  
  // TODO see how to get gas estimation for CodePromise.
  const tx = code.tx['new']!(
    { gasLimit: api.registry.createType('WeightV2', {
      refTime: 2_000_000_000,
      proofSize: 50_000,
    }) as WeightV2, storageDepositLimit: null },
    name,
    symbol,
    baseUri,
    maxSupply,
    pricePerMint,
    collectionMetadata,
    royaltyReceiver,
    royalty
  );
  return new Promise(async (resolve, reject) => {
    await tx.signAndSend(alice, (result: CodeSubmittableResult<'promise'>) => {
      if (result.isFinalized && !result.dispatchError) {
        resolve(result.contract.address.toHuman());
      } else if (result.isFinalized && result.dispatchError) {
        reject(result.dispatchError.toHuman());
      } else if (result.isError) {
        reject(result.toHuman());
      }
    });
  });
};

export const deployChunkyContract = async (deployer: KeyringPair): Promise<string> => {
  console.log('Deploying Chunky contract...');
  const contractAddress = await deployRmrkContract(
    'Chunky',
    'CHK',
    'ipfs://base',
    BigInt(100),
    BigInt(1_000_000_000_000_000_000),
    'ipfs://collection',
    deployer.address,
    1
  );
  
  console.log(`Chunky contract deployed at address ${contractAddress}`);
  return contractAddress;
};

export const deployChunkyPartsContract = async (deployer: KeyringPair): Promise<string> => {
  console.log('Deploying Chunky Parts contract...');
  const contractAddress = await deployRmrkContract(
    'Chunky Parts',
    'CHKP',
    'ipfs://bafybeiajqqqr7dbbtq4w3u5roepwdjhadt42gkt2krugqkyr4jp46ixala',
    BigInt(100),
    BigInt(1_000_000_000_000_000_000),
    'ipfs://collection',
    deployer.address,
    1
  );

  console.log(`Chunky Parts contract deployed at address ${contractAddress}`);
  return contractAddress;
};

const deployContracts = async (): Promise<void> => {
  await cryptoWaitReady();
  const alice = getSigner(ALICE_URI);
  console.log(`Deployed Chunky contract with address ${await deployChunkyContract(alice)}`);
  console.log(`Deployed Chunky parts contract with address ${await deployChunkyPartsContract(alice)}`);
}
