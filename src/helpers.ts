import {
  Address,
  Builder,
  Cell,
  OpenedContract,
  toNano
} from "ton";
import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV3R2, fromNano, beginCell, TupleItem , TupleBuilder, TupleItemInt } from "ton";
import fs from "fs";
import {execSync} from "child_process";
import seedrandom from 'seedrandom';
import BigNumber from "bignumber.js";

enum JETTON_OPS {
  ChangeAdmin = 3,
  ReplaceMetadata = 4,
  Mint = 21,
  InternalTransfer = 0x178d4519,
  Transfer = 0xf8a7ea5,
  Burn = 0x595f07bc,
}

const NFT_TRANSFER_OP = 0x5fcc3d14;
const MAX_RETRIES = 100;

export async function waitForContractToBeDeployed(client: TonClient, deployedContract: Address) {
  const seqnoStepInterval = 2500;
  let retval = false;
  console.log(`⏳ waiting for contract to be deployed at [${deployedContract.toString()}]`);
  for (var attempt = 0; attempt < 10; attempt++) {
    await sleep(seqnoStepInterval);
    if (await client.isContractDeployed(deployedContract)) {
      retval = true;
      break;
    }
  }
  console.log(`⌛️ waited for contract deployment ${((attempt + 1) * seqnoStepInterval) / 1000}s`);
  return retval;
}

export function sleep(time: number) {
  return new Promise((resolve) => {
    console.log(`💤 ${time / 1000}s ...`);

    setTimeout(resolve, time);
  });
}

export function randomSleep(minSleepTime: number = 0, maxSleepTime: number = 2000) {
  console.log(`random sleep minSleepTime: ${minSleepTime}, maxSleepTime: ${maxSleepTime}`);
  
  let time = minSleepTime + Math.random() * (maxSleepTime - minSleepTime);

  return new Promise((resolve) => {
    console.log(`💤 ${time / 1000}s ...`);

    setTimeout(resolve, time);
  });
}

export async function initWallet(client: TonClient, publicKey: Buffer, workchain = 0): Promise<OpenedContract<WalletContractV3R2>> {
  const wallet = client.open(WalletContractV3R2.create({ publicKey: publicKey, workchain }));

  if (!await client.isContractDeployed(wallet.address)) {
    throw ("wallet is not deployed");
  }

  const walletBalance = await wallet.getBalance();
    
  if (parseFloat(fromNano(walletBalance)) < 0.5) {
    throw `Insufficient Deployer [${wallet.address.toString()}] funds ${fromNano(walletBalance)}`;
  }

  console.log(
    `Init wallet ${wallet.address.toString()} | balance: ${fromNano(await wallet.getBalance())} | seqno: ${await wallet.getSeqno()}`
  );

  return wallet;
}

export async function initDeployKey(index = '') {
	const deployConfigJson = `./build/deploy.config.json`;
	const deployerWalletType = "org.ton.wallets.v3.r2";
	let deployerMnemonic;
	if (!fs.existsSync(deployConfigJson)) {
		console.log(`\n* Config file '${deployConfigJson}' not found, creating a new wallet for deploy..`);
		deployerMnemonic = (await mnemonicNew(24)).join(" ");
		const deployWalletJsonContent = {
		  created: new Date().toISOString(),
		  deployerWalletType,
		  deployerMnemonic,
	};
	fs.writeFileSync(deployConfigJson, JSON.stringify(deployWalletJsonContent, null, 2));
		console.log(` - Created new wallet in '${deployConfigJson}' - keep this file secret!`);
	} else {
		console.log(`\n* Config file '${deployConfigJson}' found and will be used for deployment!`);
		const deployConfigJsonContentRaw = fs.readFileSync(deployConfigJson, "utf-8");
		const deployConfigJsonContent = JSON.parse(deployConfigJsonContentRaw);
		if (!deployConfigJsonContent.deployerMnemonic) {
		  console.log(` - ERROR: '${deployConfigJson}' does not have the key 'deployerMnemonic'`);
		  process.exit(1);
		}
		deployerMnemonic = deployConfigJsonContent.deployerMnemonic;
	}
	return mnemonicToWalletKey(deployerMnemonic.split(" "), index);
}

export function compileFuncToB64(funcFiles: string[]): string {
    const funcPath = process.env.FUNC_PATH || "/usr/local/bin/func";
    try {
        execSync(`${funcPath} -o build/tmp.fif  -SPA ${funcFiles.join(" ")}`);
    } catch (e: any) {
        if (e.message.indexOf("error: `#include` is not a type identifier") > -1) {
            console.log(`
============================================================================================================
Please update your func compiler to support the latest func features
to set custom path to your func compiler please set  the env variable "export FUNC_PATH=/usr/local/bin/func"
============================================================================================================
`);
            process.exit(1);
        } else {
            console.log(e.message);
        }
    }

    const stdOut = execSync(`/usr/local/bin/fift -s build/_print-hex.fif`).toString();
    return stdOut.trim();
}

export function min(num1: bigint, num2: bigint) {
  return num1 < num2 ? num1 : num2;
}

export function max(num1: bigint, num2: bigint) {
  return num1 < num2 ? num2 : num1;
}

export async function waitForConditionChange<T>(func: (...args: any[]) => Promise<T>, args: any[], startVal: any, propertyNameInRes: undefined | string = undefined, sleepIntervalMilli: number = 3000, maxNumIntervals: number = 5): Promise<boolean> {

  let res: any;
  let count = 0;

  do {            
    await sleep(sleepIntervalMilli);
    res = await func(...args);
    if (propertyNameInRes) res = res[propertyNameInRes];
    count++;

  } while ((startVal  == res) && count < maxNumIntervals);

  if (startVal  == res) {
    return false;
  }

  return true;

}

export const randomInt = (min: number = 0, max: number = 2 ^ 32 - 1): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export async function getSeqno(client: TonClient, address: string): Promise<bigint | null> {

  let seqno = await client.runMethod(Address.parse(address), 'seqno');
  const stack = seqno.stack.pop();
  if (typeof stack === 'object' && stack.type == 'int') {
      return stack.value;
  }
  
  return null
}

export function addressStringToTupleItem(address: string): TupleItem[] {
  let tupleBuilder = new TupleBuilder();
  tupleBuilder.writeSlice(beginCell().storeAddress(Address.parse(address)).endCell());
  return tupleBuilder.build();
}

export function intToTupleItem(value: number): TupleItem[] {
  return [{'type': 'int', value: BigInt(value)}]
}

export function cellToAddress(cell :Cell): Address {
  return cell.beginParse().loadAddress();
}  

export function storeComment(msg: string) {
  return (builder: Builder) => {
      let b_0 = builder;
      b_0.storeUint(0, 32);
      b_0.storeStringTail(msg);
  };
}

export async function promiseAllWithRetry(promises: Promise<any>[], retries: number = MAX_RETRIES): Promise<any> {

  try {
    return await Promise.all(promises);
  
  } catch (err) {
  
    if (retries > 0) {
      console.log(`Retry attempt ${MAX_RETRIES - retries + 1} failed, retrying...`);
      let minSleepTime = (MAX_RETRIES - retries) * 2000; 
      // await randomSleep(minSleepTime, minSleepTime + 2000);
      await sleep(2000);
      await promiseAllWithRetry(promises, retries - 1);
    } else {
      console.error('All retry attempts failed.');
      throw err;
    }
  
  }
}

export async function executeMethodWithRetry<T extends {}, K extends keyof T>(instance: T, methodName: K, retries: number = MAX_RETRIES): Promise<any> {

  try {
    if (methodName in instance && typeof instance[methodName] === 'function') {
      return await (instance[methodName] as any)();
    } else {
      throw new Error(`No method named "${String(methodName)}" found`);
    }
  } catch (err) {
    if (retries > 0) {
      console.log(`Retry attempt ${MAX_RETRIES - retries + 1} failed, retrying...`);
      let minSleepTime = (MAX_RETRIES - retries) * 2000; 
      // await randomSleep(minSleepTime, minSleepTime + 2000);
      await sleep(2000);
      return await executeMethodWithRetry(instance, methodName, retries - 1);
    } else {
      console.error('All retry attempts failed.');
      throw err;
    }
  }
}

export function chooseRandomKeys(seed: string, obj: {[key: string]: any}, m: number): string[] {
  // Create a random generator with a given seed
  let rng = seedrandom(seed);
  let keys = Object.keys(obj);

  // Use the Fisher-Yates shuffle algorithm to shuffle the array
  for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)); // Use rng() instead of Math.random()
      [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  // Get the first m keys from the shuffled array
  return keys.slice(0, m);
}

export async function getBalance(client: TonClient, address: string): Promise<bigint> {
  return client.getBalance(Address.parse(address));
}

export function _transferJetton(to: Address, from: Address, jettonAmount: bigint) {
  return beginCell()
    .storeUint(JETTON_OPS.Transfer, 32)
    .storeUint(1, 64)
    .storeCoins(jettonAmount)
    .storeAddress(to)
    .storeAddress(from)
    .storeBit(false)
    .storeCoins(toNano('0.001'))
    .storeBit(false) // forward_payload in this slice, not separate cell
    .endCell();
}

export function _transferNft(to: Address) {
  return beginCell()
    .storeUint(NFT_TRANSFER_OP, 32)
    .storeUint(0, 64)
    .storeAddress(to)
    .storeAddress(null)    
    .storeBit(false)
    .storeCoins(toNano('0.005'))
    .storeBit(false) // forward_payload in this slice, not separate cell
    .endCell();
}

export function convertToNano(value: string, decimals: number): string {
  const nanoValue = new BigNumber(value).multipliedBy(new BigNumber(10).pow(new BigNumber(9 - decimals)));
  return nanoValue.toString();
}
