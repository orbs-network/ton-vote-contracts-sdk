import { initWallet, initDeployKey, sleep, randomInt} from "../src/helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer, storeCreateProposal } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { internal, TonClient, toNano, beginCell, WalletContractV3R2, Cell, Sender, fromNano} from "ton";
import {Address, SenderArguments} from "ton-core";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { expect } from "chai";
import * as getters from '../src/getters'; 
import * as setters from '../src/setters';
import {MetadataArgs} from '../src/interfaces'; 


const BLOCK_TIME = 10000;
const DEPLOYER_MIN_TON = 1;
const SEND_MSG_VALUE = .1;

const OP_NEW_DAO = 0x1;


describe("e2e test suite", () => {
  let balance: number;
  let newBalance: number;
  let res: any;
//   let registryContract: Registry;
//   let daoContract: Dao;
  let proposalDeployerContract: ProposalDeployer;
  let deployWallet: WalletContractV3R2;
  let deployWalletKey: any;
  let payload: Cell;
  let client: TonClient;
  let daoSettings: Cell;
  let sender: Sender;
  
  before(async () => {
    const endpoint = await getHttpEndpoint({network: "testnet"});
    client = new TonClient({ endpoint });

    deployWalletKey = await initDeployKey("");
    let deployWallet = await initWallet(client, deployWalletKey.publicKey);

    sender = {
        address: deployWallet.address,
        async send(args: SenderArguments) {

            const transfer = deployWallet.createTransfer({
                seqno: await deployWallet.getSeqno(),
                sendMode: args.sendMode,
                secretKey: deployWalletKey.secretKey,
                messages: [internal({
                    to: args.to,
                    value: args.value,                    
                    body: args.body,
                    init: args.init
                })]
            });

            return client.sendExternalMessage(deployWallet, transfer);
        }
    }
    
    console.log(`deployer contract address: ${deployWallet.address.toString()}`);

    balance = parseFloat(fromNano((await deployWallet.getBalance())));
    if (balance < DEPLOYER_MIN_TON) {
      throw `Deploy wallet balance is too small (${balance}), please send at least ${DEPLOYER_MIN_TON} coins to ${deployWallet.address.toString()}`;
    }
  
  });

  it("Get Registry contract", async () => {
    let registryContract = await getters.getRegistry(client);
    expect(registryContract.toString()).to.eq('EQBQbWJNIJdljLd04__-a4pkDSZy83HgDKl1AtPTPq5t2Zox');
  });

  it("Get Daos", async () => {
    let daos = await getters.getDaos(client);
    console.log(daos);
    
    // expect(registryContract.toString()).to.eq('EQBQbWJNIJdljLd04__-a4pkDSZy83HgDKl1AtPTPq5t2Zox');
  });

  it.only("New metadata", async () => {
    let n = randomInt();
    let metadataArgs: MetadataArgs = {
      about   : `about-${n}`,
      avatar  : `avatar-${n}`,
      github  : `github-${n}`,
      hide    : randomInt(0, 1) == 0 ? false : true,
      name    : `name-${n}`,
      terms   : `terms-${n}`,
      twitter : `twitter-${n}`,
      website : `website-${n}`,
    }

    console.log(metadataArgs);
    
    let metadataAddress = await setters.newMetdata(sender, client, metadataArgs);
    console.log(metadataAddress);

    expect(metadataAddress).to.not.be.false;

    // @ts-ignore
    // Metadata.fromAddress(metadataAddress);
  });
  
});

