import BigNumber from "bignumber.js";
import _ from "lodash";
import { Transaction } from 'ton-core';
import { ProposalMetadata, ProposalResult, Votes, VotingPower } from "./interfaces";
import { getAllVotes } from "./votes";

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
