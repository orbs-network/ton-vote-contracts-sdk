import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient, TonClient4, Cell, toNano } from "ton";
import BigNumber from "bignumber.js";
import { CUSTODIAN_ADDRESSES } from "./custodian";
import _ from "lodash";
import { Transaction } from 'ton-core';
import { ProposalMetadata, ProposalResult, Votes, VotingPower, TxData, VotingPowerStrategy, VotingPowerStrategyType, VotingSystem } from "./interfaces";
import {addressStringToTupleItem, cellToAddress, chooseRandomKeys, intToTupleItem, randomSleep, sleep } from "./helpers";


// import * as fs from 'fs';

// const PROPOSAL_ABI = fs.readFileSync('./dist/contracts/output/ton-vote_Proposal.abi', 'utf-8');

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
  return new TonClient4({ endpoint, timeout: 15000 });
}

export async function getTransactions(
  client: TonClient,
  contractAddress: string,
  toLt?: string
): Promise<TxData> {
  const maxRetries = 5;

  let maxLt = new BigNumber(toLt ?? -1);
  let startPage = { fromLt: "0", hash: "" };
  let allTxns: Transaction[] = [];
  let paging = startPage;
  const limit = 500;

  outerLoop: while (true) {
    let attempt = 0;
    let success = false;

    while (!success && attempt < maxRetries) {
      try {
        console.log("Querying...");
        const txns = await client.getTransactions(Address.parse(contractAddress), {
          lt: paging.fromLt,
          to_lt: toLt,
          hash: paging.hash,
          limit: limit,
        });

        console.log(`Got ${txns.length}, lt ${paging.fromLt}`);
        allTxns = [...allTxns, ...txns];

        txns.forEach((t) => {
          maxLt = BigNumber.max(new BigNumber(t.lt.toString()), maxLt);
        });

        if (txns.length == 0 || txns.length < limit) break outerLoop;

        paging.fromLt = (txns[txns.length - 2].prevTransactionLt).toString();
        paging.hash = bigintToBase64(txns[txns.length - 2].prevTransactionHash);

        success = true;

      } catch (error) {
        attempt++;
        console.log(`Attempt ${attempt} failed with error ${error}, retrying...`);
        let minSleepTime = (attempt-1) * 2000; 
        await randomSleep(minSleepTime, minSleepTime + 2000);
      }

    }
    if (!success) {
        throw new Error(`Max retries reached for requesting transactions.`);
    }
  }

  return { allTxns, maxLt: maxLt.toString() };
}

export function filterTxByTimestamp(transactions: Transaction[], lastLt: string) {
  const filteredTx = _.filter(transactions, function (transaction: Transaction) {
    return Number(transaction.lt) <= Number(lastLt);
  });

  return filteredTx;
}

// TODO: filter here if comment not yes no abstain
function extractComment(body: Cell | undefined): string | null {

  if (!body) return null;

  try {

    const vote = body.beginParse();
    if (vote.remainingBits < 32) return null;

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

    return null;
  } 
  catch (err) {
    console.log(`unexpected error while extracting comment: ${err}`);
    return null;    
  }

}

export function getAllVotes(transactions: Transaction[], proposalMetadata: ProposalMetadata): Votes {
  let allVotes: Votes = {};

  for (let i = transactions.length - 1; i >= 0; i--) {
    const txnBody = transactions[i]?.inMessage?.body;

    let vote = extractComment(txnBody);
    if (!vote) continue;

    let tx = transactions[i]?.inMessage?.info.src;
    if (!tx) continue;
    let txSrc = tx.toString();

    if (
      transactions[i].now < proposalMetadata.proposalStartTime ||
      transactions[i].now > proposalMetadata.proposalEndTime || CUSTODIAN_ADDRESSES.includes(txSrc)
    )
      continue;

    allVotes[txSrc] = {
      timestamp: transactions[i].now,
      vote: vote.toLowerCase(),
      hash: transactions[i].prevTransactionHash.toString()
    };

  }

  return allVotes;
}

function extractValueFromStrategy(votingPowerStrategies: VotingPowerStrategy[], nameFilter: string): string | undefined {

  const strategy = votingPowerStrategies.find((strategy) => strategy.arguments.some((arg) => arg.name === nameFilter));

  if (!strategy) return;

  return strategy.arguments.find((arg) => arg.name === nameFilter)?.value;
} 

export async function getAllNftHolders(clientV4: TonClient4, proposalMetadata: ProposalMetadata): Promise<{ [key: string]: string[] }> {
  let allNftItemsHolders: { [key: string]: string[] } = {};
  let nftAddress = extractValueFromStrategy(proposalMetadata.votingPowerStrategies, 'nft-address');
  const maxRetries = 5;

  if (!nftAddress) return allNftItemsHolders;

  let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(nftAddress!), 'get_collection_data');

  if (res.exitCode) {
    console.log(`nft collection not exists for nftAddress ${nftAddress}, propsal metadata: `, proposalMetadata);
    return allNftItemsHolders;
  }
    
  if (res.result[0].type != 'int') {
    console.log('Error: could not extract next-item-value from nft collection (type error)');
    return allNftItemsHolders;
  }

  const nextItemIndex = Number(res.result[0].value);

  const batchSize = 100;
  const batches = Math.ceil(nextItemIndex / batchSize);
  
  if (batches > 500) {
    console.log(`nft collection is too big to process`);
    return allNftItemsHolders;    
  }

  console.log(`fetching ${nextItemIndex} nft items (batche size = ${batchSize})`);
  
  for (let i = 0; i < batches; i++) {

    const batchStartIndex = i * batchSize;
    const batchEndIndex = Math.min((i + 1) * batchSize, nextItemIndex);

    console.log(`fetching batch #${i} ...`);
    const promises = Array.from({ length: batchEndIndex - batchStartIndex }, (_, j) => {
      const index = batchStartIndex + j;
      
      return (async () => {
        let attempt = 0;
        let success = false;
        while (!success && attempt < maxRetries) {
          try {
            let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(nftAddress!), 'get_nft_address_by_index', intToTupleItem(index));
        
            if (res.result[0].type != 'slice') {
              console.log(`unexpected result type from runMethod on get_nft_address_by_index on address: ${nftAddress} at block ${proposalMetadata.mcSnapshotBlock}`);
              return;
            }
        
            let nftItemAddress = cellToAddress(res.result[0].cell);
                  
            res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, nftItemAddress, 'get_nft_data');
        
            if (!res || !res.result || !res.result[3]) {
              console.log(`could not extract result from nft ${nftItemAddress} at block ${proposalMetadata.mcSnapshotBlock}`);
              return;
            }
    
            if (res.result[3].type != 'slice') {
              console.log(`unexpected result type from runMethod on get_nft_data on address: ${nftAddress} at block ${proposalMetadata.mcSnapshotBlock}`);
              return;
            }
    
            const address = cellToAddress(res.result[3].cell).toString();

            if (!allNftItemsHolders[address]) allNftItemsHolders[address] = [];
            allNftItemsHolders[address].push(nftItemAddress.toString());

            success = true;

          } catch (error) {
            attempt++;
            console.log(`attempt ${attempt} failed with error ${error} (nftAddress ${nftAddress}), retrying...`);
            await sleep(attempt * 100);
          }
        }
      })();
    });

    const results = await Promise.allSettled(promises);

    results.forEach(result => {
      if (result.status === 'rejected') {
        throw new Error(`One of the promises was rejected while fetching NFT holders for nft collection ${nftAddress} : ${result.reason}`);
      }
    });
  }

  return allNftItemsHolders;
}

export async function getAllNftHoldersFromCollectionAddr(clientV4: TonClient4, collectionAddr: string, mcBlockNum: number = -1): Promise<{ [key: string]: string[] }> {
  let allNftItemsHolders: { [key: string]: string[] } = {};
  const maxRetries = 5;

  if (mcBlockNum == -1) mcBlockNum = (await clientV4.getLastBlock()).last.seqno
  
  let res = await clientV4.runMethod(mcBlockNum, Address.parse(collectionAddr!), 'get_collection_data');

  if (res.exitCode) {
    console.log(`nft collection not exists for nft collection at address ${collectionAddr}`);
    return allNftItemsHolders;
  }
    
  if (res.result[0].type != 'int') {
    console.log('Error: could not extract next-item-value from nft collection (type error)');
    return allNftItemsHolders;
  }

  const nextItemIndex = Number(res.result[0].value);

  const batchSize = 100;
  const batches = Math.ceil(nextItemIndex / batchSize);
  
  if (batches > 500) {
    console.log(`nft collection is too big to process`);
    return allNftItemsHolders;    
  }

  console.log(`fetching ${nextItemIndex} nft items (batche size = ${batchSize})`);
  
  for (let i = 0; i < batches; i++) {

    const batchStartIndex = i * batchSize;
    const batchEndIndex = Math.min((i + 1) * batchSize, nextItemIndex);

    console.log(`fetching batch #${i} ...`);
    const promises = Array.from({ length: batchEndIndex - batchStartIndex }, (_, j) => {
      const index = batchStartIndex + j;
      
      return (async () => {
        let attempt = 0;
        let success = false;
        while (!success && attempt < maxRetries) {
          try {
            let res = await clientV4.runMethod(mcBlockNum, Address.parse(collectionAddr!), 'get_nft_address_by_index', intToTupleItem(index));
        
            if (res.result[0].type != 'slice') {
              console.log(`unexpected result type from runMethod on get_nft_address_by_index on address: ${collectionAddr}} at block ${mcBlockNum}`);
              return;
            }
        
            let nftItemAddress = cellToAddress(res.result[0].cell);
                  
            res = await clientV4.runMethod(mcBlockNum, nftItemAddress, 'get_nft_data');
        
            if (!res || !res.result || !res.result[3]) {
              console.log(`could not extract result from nft ${nftItemAddress} at block ${mcBlockNum}`);
              return;
            }
    
            if (res.result[3].type != 'slice') {
              console.log(`unexpected result type from runMethod on get_nft_data on address: ${collectionAddr} at block ${mcBlockNum}`);
              return;
            }
    
            const address = cellToAddress(res.result[3].cell).toString();

            if (!allNftItemsHolders[address]) allNftItemsHolders[address] = [];
            allNftItemsHolders[address].push(nftItemAddress.toString());

            success = true;

          } catch (error) {
            attempt++;
            console.log(`attempt ${attempt} failed with error ${error}, retrying...`);
            sleep(10);
          }
        }
      })();
    });

    const results = await Promise.allSettled(promises);

    results.forEach(result => {
      if (result.status === 'rejected') {
        throw new Error(`One of the promises was rejected while fetching NFT holders for nft collection ${collectionAddr} : ${result.reason}`);
      }
    });
  }

  return allNftItemsHolders;
}

export async function getSingleVoterPower(
  clientV4: TonClient4,
  voter: string,
  proposalMetadata: ProposalMetadata,
  strategy: VotingPowerStrategyType,
  allNftItemsHolders: { [key: string]: string[] },
  operatingValidatorBalance: {[key: string]: any} = {}
): Promise<string> {
  
  switch (Number(strategy)) {
    
    case VotingPowerStrategyType.TonBalance:
      return (
        await clientV4.getAccountLite(
          proposalMetadata.mcSnapshotBlock,
          Address.parse(voter)
        )
      ).account.balance.coins;

    case VotingPowerStrategyType.TonBalanceWithValidators:
      let validatorStakingBalance = '0';
      // if the voter is the controller of the validator staking address we add the staking validator balance 
      // to the total weight
      if (voter in operatingValidatorBalance) {
        validatorStakingBalance = toNano(operatingValidatorBalance[voter].total).toString();
      }

      // the final voting power will be the operating validator wallet + staking validator wallet
      return BigNumber((
        await clientV4.getAccountLite(
          proposalMetadata.mcSnapshotBlock,
          Address.parse(voter)
        )
      ).account.balance.coins).plus(validatorStakingBalance).toString();
        
    case VotingPowerStrategyType.TonBalance_1Wallet1Vote:
      return '1';
    
    case VotingPowerStrategyType.JettonBalance:
    case VotingPowerStrategyType.JettonBalance_1Wallet1Vote: {
    
      try {
        const jettonAddress = extractValueFromStrategy(
          proposalMetadata.votingPowerStrategies,
          'jetton-address'
        );

        if (!jettonAddress) return '0';

        let res = await clientV4.runMethod(
          proposalMetadata.mcSnapshotBlock,
          Address.parse(jettonAddress!),
          'get_wallet_address',
          addressStringToTupleItem(voter)
        );

        if (res.result[0].type != 'slice') {
          return '0';
        }

        const jettonWalletAddress = cellToAddress(res.result[0].cell);

        res = await clientV4.runMethod(
          proposalMetadata.mcSnapshotBlock,
          jettonWalletAddress,
          'get_wallet_data'
        );

        if (res.result[0].type != 'int') {
          return '0';
        }

        if (strategy === VotingPowerStrategyType.JettonBalance) {
          return res.result[0].value.toString();
        } else {
          return String(Number(res.result[0].value > 0));
        }
      } catch {
        return '0';
      }
    }
    
    case VotingPowerStrategyType.NftCcollection:
      return toNano(voter in allNftItemsHolders? allNftItemsHolders[voter].length: 0).toString();
    
    case VotingPowerStrategyType.NftCcollection_1Wallet1Vote:
      return voter in allNftItemsHolders ? '1' : '0';
    
    default:
      return '0';
  }

}

export async function getVotingPower(
  clientV4: TonClient4,
  proposalMetadata: ProposalMetadata,
  transactions: Transaction[],
  votingPower: VotingPower = {},
  strategy: VotingPowerStrategyType =  VotingPowerStrategyType.TonBalance,
  nftItemsHolders: { [key: string]: string[] } = {},
  operatingValidatorBalance: {[key: string]: any} = {}
): Promise<VotingPower> {
  let voters = Object.keys(getAllVotes(transactions, proposalMetadata));

  let newVoters = [...new Set([...voters, ...Object.keys(votingPower)])];

  if (!newVoters) return votingPower;

  if (!proposalMetadata.mcSnapshotBlock) return votingPower;
  
  const batchSize = 20;

  const totalBatches = Math.ceil(newVoters.length / batchSize);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * batchSize;
    const endIndex = startIndex + batchSize;
    const batchVoters = newVoters.slice(startIndex, endIndex);
  
    const voterPromises = batchVoters.map((voter) =>
      getSingleVoterPower(clientV4, voter, proposalMetadata, strategy, nftItemsHolders, operatingValidatorBalance)
    );
  
    const votingPowerArray = await Promise.all(voterPromises);
  
    for (let i = 0; i < batchVoters.length; i++) {
      const voter = batchVoters[i];
      const votingPowerValue = votingPowerArray[i];
      votingPower[voter] = votingPowerValue;
    }
  }
  
  return votingPower;
}

export function calcProposalResult(votes: Votes, votingPower: VotingPower, votingSystem: VotingSystem): ProposalResult {

  let sumVotes: Record<string, BigNumber> = {};
  const lowerCaseChoices = votingSystem.choices.map(choice => choice.toLowerCase());

  for (const choice of lowerCaseChoices) {
      sumVotes[choice] = new BigNumber(0);
  }

  for (let [voter, vote] of Object.entries(votes)) {
    if (!(voter in votingPower)) {
      console.log(`voter ${voter} not found in votingPower`);
      continue;
    }

      const _vote = vote.vote.toLocaleLowerCase();
      
      if (!lowerCaseChoices.includes(_vote)) {
        console.log(`vote ${_vote} from voter at address ${voter} was not found in list of choices ${lowerCaseChoices}, ignoring vote...`);
        continue;
      }

      sumVotes[_vote] = new BigNumber(votingPower[voter]).plus(sumVotes[_vote]);
  }

  const totalWeights = lowerCaseChoices.reduce((total, choice) => {
    return total.plus(sumVotes[choice] || new BigNumber(0));
  }, new BigNumber(0));

  const proposalResult: ProposalResult = {};

  for (const choice of lowerCaseChoices) {
      const choicePct = sumVotes[choice]
          .div(totalWeights)
          .multipliedBy(100)
          .decimalPlaces(4)
          .toNumber();
  
      proposalResult[choice] = choicePct;
  }
  
  proposalResult.totalWeights = totalWeights.toString();
  return proposalResult;

}

export function getCurrentResults(transactions: Transaction[], votingPower: VotingPower, proposalMetadata: ProposalMetadata): ProposalResult {
  let votes = getAllVotes(transactions, proposalMetadata);
  return calcProposalResult(votes, votingPower, proposalMetadata.votingSystem);
}


function bigintToBase64(bn: BigInt) {
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

// function getproposalCommentOp() {
//   const commentData = JSON.parse(PROPOSAL_ABI).types.find((o: {name: string}) => o.name == 'Comment');
//   return Number(commentData.header);    
// }

export async function chooseRandomVoters(client4: TonClient4, voters: Votes, m: number) {

  let lastBlock = await client4.getLastBlock();
  return chooseRandomKeys(lastBlock.last.rootHash, voters, m);

}
