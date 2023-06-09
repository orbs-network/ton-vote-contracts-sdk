import { TonClient4 } from "ton";
import _ from "lodash";
import { Transaction } from 'ton-core';
import { ProposalMetadata, VotingPower, VotingPowerStrategyType } from "../interfaces";
import { getAllVotes } from "../votes";


export async function getVotingPower(
  clientV4: TonClient4,
  proposalMetadata: ProposalMetadata,
  transactions: Transaction[],
  votingPower: VotingPower = {},
  strategy: VotingPowerStrategyType =  VotingPowerStrategyType.TonBalance,
  nftItemsHolders: { [key: string]: number } = {}
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
