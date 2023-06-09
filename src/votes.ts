import { Address, TonClient, TonClient4, Cell, toNano } from "ton";
import BigNumber from "bignumber.js";
import { CUSTODIAN_ADDRESSES } from "./voting-strategies/custodian";
import _ from "lodash";
import { Transaction } from 'ton-core';
import { ProposalMetadata, ProposalResult, Votes, VotingPower, TxData, VotingPowerStrategy, VotingPowerStrategyType } from "./interfaces";
import {addressStringToTupleItem, bigintToBase64, cellToAddress, extractComment, intToTupleItem } from "./helpers";


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
    // console.log(txns);
    
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