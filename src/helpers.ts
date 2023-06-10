import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV3R2, fromNano, beginCell, TupleItem , TupleBuilder, TonClient4, 
  Address, Builder, Cell, OpenedContract } from "ton";
import fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Transaction } from 'ton-core';
import _ from "lodash";

const PROPOSAL_VOTE_OP = 2084703906;


export async function getClientV2(customEndpoint?: string, apiKey?: string): Promise<TonClient> {

  if (customEndpoint) {
    return new TonClient({ endpoint: customEndpoint, apiKey });
  }
  const endpoint = await getHttpEndpoint();
  return new TonClient({ endpoint });
}

export async function getClientV4(customEndpoint?: string): Promise<TonClient4> {
  const endpoint = customEndpoint || "https://mainnet-v4.tonhubapi.com";
  return new TonClient4({ endpoint });
}

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

export function bigintToBase64(bn: BigInt) {
  var hex = bn.toString(16);
  if (hex.length % 2) { hex = '0' + hex; }

  var bin = [];
  var i = 0;
  var d;
  var b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }

  return btoa(bin.join(''));
}

export function filterTxByTimestamp(transactions: Transaction[], lastLt: string) {
  const filteredTx = _.filter(transactions, function (transaction: Transaction) {
    return Number(transaction.lt) <= Number(lastLt);
  });

  return filteredTx;
}

export function extractComment(body: Cell | undefined): string | null {

  if (!body) return null;
  if (body.bits.length < 32) return null;

  try {

    const vote = body?.beginParse();
    const op = parseInt(vote.loadBits(32).toString(), 16);

    if (op == 0) {
      const comment = vote.loadBits(vote.remainingBits).toString();
      return Buffer.from(comment, 'hex').toString('utf-8');

    }

    if (op == PROPOSAL_VOTE_OP) {
        const refVote = vote.loadRef().beginParse();
        const comment = refVote.loadBits(refVote.remainingBits).toString();
        return Buffer.from(comment, 'hex').toString('utf-8');
    }

  } catch (err) {
      console.error(`failed to extract comment: ${err}`);      
  }

  return null;
}