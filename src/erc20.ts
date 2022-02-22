import { Interface } from 'ethers/lib/utils';
import abiErc20 from './json/erc20.json';

export const Erc20Interface = new Interface(abiErc20);
