import { Interface, Provider } from 'ethers';
import { BytesBuffer, evenHexString } from './bytes';
import abiErc20 from './json/erc20.json';
import abiErc721 from './json/erc721.json';
import { Multicast, Multicast__factory } from './typechain';
import { ERC20Interface } from './typechain/ERC20';
import { ERC721Interface } from './typechain/ERC721';

export const Erc20Interface = <ERC20Interface>new Interface(abiErc20);
export const Erc721Interface = <ERC721Interface>new Interface(abiErc721);

const deployedMulticast = new Map<BigInt, string>([
  [1n, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [97n, '0xF43041138eDfb1CA2E602b82989093F4C52C4D69'],
  [56n, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [250n, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
  [4002n, '0xC82ECc4572321aa9F051443C30a0a0fA792b3798'],
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
  blockNumber: BigInt;
  previousBlockHash: string;
  difficulty: BigInt;
  gaslimit: BigInt;
  timestamp: BigInt;
}

const instance = new Map<BigInt, MulticastCore>();

export class MulticastCore {
  public readonly chainId: BigInt = 0n;

  public readonly provider: Provider;

  private multicastInstance: Multicast;

  constructor(chainId: BigInt, provider: Provider) {
    this.chainId = chainId;
    this.provider = provider;
    if (deployedMulticast.has(chainId)) {
      this.multicastInstance = Multicast__factory.connect(deployedMulticast.get(chainId) || '', provider);
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
    const result = await this.multicastInstance.multicast.staticCall(buf.invoke());
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
    const result = await this.multicastInstance.cast.staticCall(buf.invoke());
    return result.map(({ success, result }: IMulticastResult) => ({ success, result }));
  }
}

export default MulticastCore;
