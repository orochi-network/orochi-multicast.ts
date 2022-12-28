import { Provider } from '@ethersproject/abstract-provider';
import { BigNumber, Contract } from 'ethers';
import { Multicast, ERC20Interface, ERC721Interface } from '../typechain';
import abiMulticast from './json/multicast.json';
import { Interface } from 'ethers/lib/utils';
import abiErc20 from './json/erc20.json';
import abiErc721 from './json/erc721.json';
import { BytesBuffer, evenHexString } from './bytes';

export const Erc20Interface = <ERC20Interface>new Interface(abiErc20);
export const Erc721Interface = <ERC721Interface>new Interface(abiErc721);

const deployedMulticast = new Map<number, string>([
  [1, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [97, '0xF43041138eDfb1CA2E602b82989093F4C52C4D69'],
  [56, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [250, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [4002, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
]);

export interface ICorePayload {
  address: string;
  data: string;
}

export interface IMulticastResult {
  success: boolean;
  result: string;
}

export interface IBlockchainState {
  blockNumber: BigNumber;
  previousBlockHash: string;
  difficulty: BigNumber;
  gaslimit: BigNumber;
  timestamp: BigNumber;
}

const instance = new Map<number, MulticastCore>();

export class MulticastCore {
  public readonly chainId: number = 0;

  public readonly provider: Provider;

  private multicastInstance: Multicast;

  constructor(chainId: number, provider: Provider) {
    this.chainId = chainId;
    this.provider = provider;
    if (deployedMulticast.has(chainId)) {
      this.multicastInstance = <Multicast>new Contract(deployedMulticast.get(chainId) || '', abiMulticast, provider);
    } else {
      throw new Error('MulticastCore: This network was not supported');
    }
  }

  public static async asyncGetInstance(provider: Provider): Promise<MulticastCore> {
    const { chainId } = await provider.getNetwork();
    if (instance.has(chainId)) {
      return instance.get(chainId) as any;
    } else {
      const newInstance = new MulticastCore(chainId, provider);
      instance.set(chainId, newInstance);
      return newInstance as any;
    }
  }

  public async multicast(calls: ICorePayload[]): Promise<IMulticastResult[]> {
    const buf = new BytesBuffer();
    buf.writeUint16(calls.length);
    for (let i = 0; i < calls.length; i += 1) {
      const { address, data } = calls[i];
      buf.writeAddress(address);
      buf.writeUint16(BytesBuffer.from(data).length);
      buf.writeBytes(data);
    }
    const result = await this.multicastInstance.callStatic.multicast(buf.invoke());
    return result.map(({ success, result }: IMulticastResult) => ({ success, result }));
  }

  public async eth(addresses: string[]): Promise<{ [key: string]: string }> {
    const contractResult = (
      await this.multicastInstance.eth(
        `0x${addresses.map((e) => e.replace(/^0x/gi, '').trim().padStart(40, '0')).join('')}`,
      )
    ).replace(/^0x/gi, '');
    const result: { [key: string]: string } = {};
    for (let i = 0; i < addresses.length; i += 1) {
      const j = i * 64;
      result[addresses[i]] = `0x${evenHexString(contractResult.substring(j, j + 64).replace(/^0+/, ''))}`;
      result[addresses[i]] = result[addresses[i]] === '0x' ? '0x00' : result[addresses[i]];
    }
    return result;
  }

  public async state() {
    const state = await this.multicastInstance.state();
    return {
      blockNumber: state.blockNumber,
      previousBlockHash: state.previousBlockHash,
      difficulty: state.difficulty,
      gaslimit: state.gaslimit,
      timestamp: state.timestamp,
    };
  }

  public async cast(address: string, calls: string[]): Promise<IMulticastResult[]> {
    const buf = new BytesBuffer();
    buf.writeUint16(calls.length);
    buf.writeAddress(address);
    for (let i = 0; i < calls.length; i += 1) {
      const data = calls[i];
      buf.writeUint16(BytesBuffer.from(data).length);
      buf.writeBytes(data);
    }
    const result = await this.multicastInstance.callStatic.cast(buf.invoke());
    return result.map(({ success, result }: IMulticastResult) => ({ success, result }));
  }
}

export default MulticastCore;
