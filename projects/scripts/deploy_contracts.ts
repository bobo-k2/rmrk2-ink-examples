import { CodeSubmittableResult } from '@polkadot/api-contract/base';
import { CodePromise } from '@polkadot/api-contract';
import { KeyringPair } from '@polkadot/keyring/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getApi, getGasLimit, getSigner } from './common_api';
import { ALICE_URI } from './consts';
import Files from 'fs';

const deployRmrkContract = async (
  name: string,
  symbol: string,
  baseUri: string,
  maxSupply: BigInt,
  pricePerMint: BigInt,
  collectionMetadata: string,
  royaltyReceiver: string,
  royalty: number
): Promise<string | undefined> => {
  const api = await getApi();
  const alice = getSigner(ALICE_URI);
  const contract = JSON.parse(
    Files.readFileSync('../contract/rmrk_contract.contract').toString()
  );
  const code = new CodePromise(api, contract, contract.source.wasm);
  const tx = code.tx['new']!(
    { gasLimit: getGasLimit(api), storageDepositLimit: null },
    name,
    symbol,
    baseUri,
    maxSupply,
    pricePerMint,
    collectionMetadata,
    royaltyReceiver,
    royalty
  );
  return new Promise(async (resolve) => {
    await tx.signAndSend(alice, (result: CodeSubmittableResult<'promise'>) => {
      if (result.isFinalized && !result.dispatchError) {
        resolve(result.contract.address.toHuman());
      } else if (result.isFinalized && result.dispatchError) {
        resolve(undefined);
      } else if (result.isError) {
        resolve(undefined);
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
    'ipfs://base',
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
