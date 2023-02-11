import { cryptoWaitReady } from '@polkadot/util-crypto';
import { KeyringPair } from '@polkadot/keyring/types';
import { createCatalog } from './create_catalog';
import {
  deployChunkyContract,
  deployChunkyPartsContract,
} from './deploy_contracts';
import { getSigner } from './common_api';
import { ALICE_URI } from './consts';
import { buildToken } from './build_token';

const runAll = async (signer: KeyringPair): Promise<void> => {
  console.log('Deploying contracts');
  const chunkyAddress = await deployChunkyContract(signer);
  const partsAddress = await deployChunkyPartsContract(signer);

  console.log('Building parts catalog');
  await createCatalog(partsAddress);

  console.log('Building token');
  await buildToken(chunkyAddress, partsAddress);
};

const runCommand = async (): Promise<void> => {
  await cryptoWaitReady();
  const alice = getSigner(ALICE_URI);

  switch (process.argv[2]) {
    case 'deploy':
      await deployChunkyContract(alice);
      await deployChunkyPartsContract(alice);
      break;
    case 'catalog':
      // Since no Chunky parts address is provided method will pick up address from CHUNKY_PARTS_ADDRESS
      await createCatalog();
      break;
    case 'token':
      // Since no contracts addresses are provided method will pick up address from CHUNKY_ADDRESS, CHUNKY_PARTS_ADDRESS
      await buildToken();
      break;
    case 'all':
    default:
      await runAll(alice);
      break;
  }
};

runCommand();
