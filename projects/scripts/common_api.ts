import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import type { KeyringPair } from '@polkadot/keyring/types';
import { Abi, ContractPromise } from '@polkadot/api-contract';
import { WeightV2, DispatchError } from '@polkadot/types/interfaces';
import { ISubmittableResult } from '@polkadot/types/types';
import { rmrkAbi } from '../abi/rmrk';

// const WSS_ENDPOINT = "wss://shibuya-rpc.dwellir.com";
// const CONTRACT_ADDRESS = "Whc3ikvddB9u4cgHHYA3eZWSiPuciWSxgiY4xZQjvbv9SeT";

const WSS_ENDPOINT = 'ws://localhost:9944';
// The two below can be fetched from a chain by queryng const system.blockWeights: FrameSystemLimitsBlockWeights.
const PROOF_SIZE = 5_242_880;
const REF_TIME = 500_000_000_000;

let api: ApiPromise;

export const getApi = async (): Promise<ApiPromise> => {
  if (!api) {
    const provider = new WsProvider(WSS_ENDPOINT);
    const apiPromise = new ApiPromise({ provider });
    await apiPromise.isReady;

    api = apiPromise;
  }

  return api;
};

export const getContract = async (
  address: string
): Promise<ContractPromise> => {
  const api = await getApi();
  const abi = new Abi(rmrkAbi, api.registry.getChainProperties());

  return new ContractPromise(api, abi, address);
};

export const getGasLimit = (contract: ContractPromise): WeightV2 => {
  return contract.api.registry.createType('WeightV2', {
    REF_TIME,
    PROOF_SIZE,
  }) as WeightV2;
};

export const getSigner = (uri: string): KeyringPair => {
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri(uri);

  return alice;
};

export const executeCallWithValue = async (
  contract: ContractPromise,
  call: string,
  signer: KeyringPair,
  value = null,
  ...params: unknown[]
): Promise<boolean> => {
  const txResult = await contract.query[call](
    signer.address,
    {
      gasLimit: getGasLimit(contract),
      storageDepositLimit: null,
      value
    },
    ...params
  );
  console.log(`Call: ${call}, output: ${JSON.stringify(txResult.output.toHuman())}`);
  console.log(`Call: ${call}, result: ${JSON.stringify(txResult.result.toHuman())}`);

  return new Promise((resolve) => {
    contract.tx[call](
      {
        gasLimit: getGasLimit(contract),
        storageDepositLimit: null,
        value,
      },
      ...params
    ).signAndSend(signer, (result: ISubmittableResult) => {
      if (result.isFinalized && !result.dispatchError) {
        resolve(true);
      } else if (result.isFinalized && result.dispatchError) {
        console.error(getErrorMessage(result.dispatchError));
        resolve(false);
      } else if (result.isError) {
        resolve(false);
      }
    });
  });
};

export const executeCall = async (
  contract: ContractPromise,
  call: string,
  signer: KeyringPair,
  ...params: unknown[]
): Promise<boolean> => {
  return await executeCallWithValue(contract, call, signer, null, ...params);
};

const getErrorMessage = (dispatchError: DispatchError): string => {
  let message = '';
  if (dispatchError.isModule) {
    try {
      const mod = dispatchError.asModule;
      const error = dispatchError.registry.findMetaError(mod);

      message = `${error.section}.${error.name}`;
    } catch (error) {
      // swallow
      console.error(error);
    }
  } else if (dispatchError.isToken) {
    message = `${dispatchError.type}.${dispatchError.asToken.type}`;
  }

  return message;
}
