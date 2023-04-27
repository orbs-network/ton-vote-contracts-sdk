import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient, TonClient4, Cell, toNano } from "ton";
import BigNumber from "bignumber.js";
import { CUSTODIAN_ADDRESSES } from "./custodian";
import _ from "lodash";
import { Transaction } from 'ton-core';
import { ProposalMetadata, ProposalResult, Votes, VotingPower, TxData } from "./interfaces";
import {VotingPowerStrategy} from "./voting-strategies";
import {addressStringToTupleItem, cellToAddress, intToTupleItem } from "./helpers";


// import * as fs from 'fs';

// const PROPOSAL_ABI = fs.readFileSync('./dist/contracts/output/ton-vote_Proposal.abi', 'utf-8');

const PROPOSAL_VOTE_OP = 880812829;

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

export async function getTransactions(
  client: TonClient,
  contractAddress: string,
  toLt?: string
): Promise<TxData> {

  let maxLt = new BigNumber(toLt ?? -1);
  let startPage = { fromLt: "0", hash: "" };
  let allTxns: Transaction[] = [];
  let paging = startPage;
  const limit = 10;

  while (true) {
    console.log("Querying...");
    const txns = await client.getTransactions(Address.parse(contractAddress), {
      lt: paging.fromLt,
      to_lt: toLt,
      hash: paging.hash,
      limit: limit,
    });  

    console.log(`Got ${txns.length}, lt ${paging.fromLt}`);
    console.log(txns);
    
    allTxns = [...allTxns, ...txns];

    txns.forEach((t) => {
      maxLt = BigNumber.max(new BigNumber(t.lt.toString()), maxLt);
    });

    if (txns.length == 0 || txns.length < limit) break;

    paging.fromLt = (txns[txns.length - 2].prevTransactionLt).toString();
    paging.hash = bigintToBase64(txns[txns.length - 2].prevTransactionHash);

    // console.log('new paging: ', paging);        
  }

  return { allTxns, maxLt: maxLt.toString() };
}

export function filterTxByTimestamp(transactions: Transaction[], lastLt: string) {
  const filteredTx = _.filter(transactions, function (transaction: Transaction) {
    return Number(transaction.lt) <= Number(lastLt);
  });

  return filteredTx;
}

function extractComment(body: Cell | undefined): string | null {

  if (!body) return null;

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

  return null;

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

    vote = vote.toLowerCase();
    allVotes[txSrc] = {
      timestamp: transactions[i].now,
      vote: "",
      hash: transactions[i].prevTransactionHash.toString()
    };

    if (["y", "yes"].includes(vote)) {
      allVotes[txSrc].vote = "Yes";
    } else if (["n", "no"].includes(vote)) {
      allVotes[txSrc].vote = "No";
    } else if (["a", "abstain"].includes(vote)) {
      allVotes[txSrc].vote = "Abstain";
    }
  }

  return allVotes;
}

export async function getAllNftHolders(clientV4: TonClient4, proposalMetadata: ProposalMetadata): Promise<Set<string>> {

  let allNftItemsHolders = new Set<string>();

  let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(proposalMetadata.nft!), 'get_collection_data');

  if (!res.result.length) {
    console.log('nft collection not exists for proposal with metadata: ', proposalMetadata);
    return allNftItemsHolders;
  }
    
  if (res.result[0].type != 'int') {
    console.log('Error: could not extract next-item-value from nft collection (type error)');
    return allNftItemsHolders;
  }

  const nextItemIndex = Number(res.result[0].value);

  const batchSize = 100; // set the batch size
  const batches = Math.ceil(nextItemIndex / batchSize); // calculate the number of batches
  
  console.log(`fetching ${nextItemIndex} nft items (batche size = ${batchSize})`);
  
  for (let i = 0; i < batches; i++) {

    const batchStartIndex = i * batchSize;
    const batchEndIndex = Math.min((i + 1) * batchSize, nextItemIndex);
  
    await Promise.all(Array.from({ length: batchEndIndex - batchStartIndex }, (_, j) => {
      const index = batchStartIndex + j;
      return (async () => {
        let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(proposalMetadata.nft!), 'get_nft_address_by_index', intToTupleItem(index));
        
        if (res.result[0].type != 'slice') {
          console.log(`unexpected result type from runMethod on get_nft_address_by_index on address: ${proposalMetadata.nft} at block ${proposalMetadata.mcSnapshotBlock}`);
          return;
        }
    
        let nftItemAddress = cellToAddress(res.result[0].cell);
              
        res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, nftItemAddress, 'get_nft_data');
    
        if (res.result[3].type != 'slice') {
          console.log(`unexpected result type from runMethod on get_nft_data on address: ${proposalMetadata.nft} at block ${proposalMetadata.mcSnapshotBlock}`);
          return;
        }
        
        allNftItemsHolders.add(cellToAddress(res.result[3].cell).toString());
      })();
    }));
  }
  
  return allNftItemsHolders;
}

export async function getSingleVoterPower(clientV4: TonClient4, voter: string, proposalMetadata: ProposalMetadata, strategy: VotingPowerStrategy, allNftItemsHolders: Set<string>): Promise<string> {

  if (strategy == VotingPowerStrategy.TonBalance) {
    return (
      await clientV4.getAccountLite(
        proposalMetadata.mcSnapshotBlock,
        Address.parse(voter)
      )
    ).account.balance.coins;
  }

  else if (strategy == VotingPowerStrategy.JettonBalance) {

    try {

      let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(proposalMetadata.jetton!), 'get_wallet_address', addressStringToTupleItem(voter));
      
      if (res.result[0].type != 'slice') {
          return '0';
      }
      
      const jettonWalletAddress = cellToAddress(res.result[0].cell);

      res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, jettonWalletAddress, 'get_wallet_data');
          
      if (res.result[0].type != 'int') {
          return '0';
      }
          
      return res.result[0].value.toString();

    } catch {

      return '0'
    }

  }

  else if (strategy == VotingPowerStrategy.NftCcollection) {
    
    if (allNftItemsHolders.has(voter)) {
      return toNano('1').toString();
    }

    return '0';
  }

  return '0';

}

export async function getVotingPower(
  clientV4: TonClient4,
  proposalMetadata: ProposalMetadata,
  transactions: Transaction[],
  votingPower: VotingPower = {},
  strategy: VotingPowerStrategy =  VotingPowerStrategy.TonBalance,
  nftItemsHolders: Set<string> = new Set() 
): Promise<VotingPower> {
  let voters = Object.keys(getAllVotes(transactions, proposalMetadata));

  let newVoters = [...new Set([...voters, ...Object.keys(votingPower)])];

  if (!newVoters) return votingPower;

  if (!proposalMetadata.mcSnapshotBlock) return votingPower;

  console.log(`strategy: ${strategy}, nftItemsHolders: ${nftItemsHolders}`);
  
  for (const voter of newVoters) {
    votingPower[voter] = await getSingleVoterPower(clientV4, voter, proposalMetadata, strategy, nftItemsHolders);
  }

  return votingPower;
}

export function calcProposalResult(votes: Votes, votingPower: VotingPower): ProposalResult {
  let sumVotes = {
    yes: new BigNumber(0),
    no: new BigNumber(0),
    abstain: new BigNumber(0),
  };

  for (const [voter, vote] of Object.entries(votes)) {
    if (!(voter in votingPower))
      throw new Error(`voter ${voter} not found in votingPower`);

      const _vote = vote.vote; 
    if (_vote === "Yes") {
      sumVotes.yes = new BigNumber(votingPower[voter]).plus(sumVotes.yes);
    } else if (_vote === "No") {
      sumVotes.no = new BigNumber(votingPower[voter]).plus(sumVotes.no);
    } else if (_vote === "Abstain") {
      sumVotes.abstain = new BigNumber(votingPower[voter]).plus(
        sumVotes.abstain
      );
    }
  }

  const totalWeights = sumVotes.yes.plus(sumVotes.no).plus(sumVotes.abstain);
  const yesPct = sumVotes.yes
    .div(totalWeights)
    .decimalPlaces(4)
    .multipliedBy(100)
    .toNumber();
  const noPct = sumVotes.no
    .div(totalWeights)
    .decimalPlaces(4)
    .multipliedBy(100)
    .toNumber();
  const abstainPct = sumVotes.abstain
    .div(totalWeights)
    .decimalPlaces(4)
    .multipliedBy(100)
    .toNumber();

    return {
    yes: yesPct,
    no: noPct,
    abstain: abstainPct,
    totalWeight: totalWeights.toString(),
  };
}

export function getCurrentResults(transactions: Transaction[], votingPower: VotingPower, proposalMetadata: ProposalMetadata): ProposalResult {
  let votes = getAllVotes(transactions, proposalMetadata);
  return calcProposalResult(votes, votingPower);
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
