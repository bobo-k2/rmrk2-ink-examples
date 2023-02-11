import { cryptoWaitReady } from '@polkadot/util-crypto';
import { createCatalog } from "./create_catalog";
import { deployChunkyContract, deployChunkyPartsContract } from "./deploy_contracts";
import { getSigner } from "./common_api"
import { ALICE_URI } from "./consts"

const runAll = async (): Promise<void> => {
  await cryptoWaitReady();
  const alice = getSigner(ALICE_URI);

  console.log('Deploying contracts');
  const chunkyAddress = await deployChunkyContract(alice);
  const partsAddress = await deployChunkyPartsContract(alice);
  console.log(`Contracts deployed, chunky: ${chunkyAddress}, parts: ${partsAddress}`);

  console.log('Building parts catalog');
  await createCatalog(partsAddress);
}

runAll();