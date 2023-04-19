import { Transaction } from "ton";
import {VotingPowerStrategy} from "./voting-strategies";

export interface TxData {
    allTxns: Transaction [], 
    maxLt: undefined | string
};


export interface DaoRoles {
    owner: string;
    proposalOwner: string;
}

export interface MetadataArgs {
    about   : string;
    avatar  : string;
    github  : string;
    hide    : boolean;
    name    : string;
    terms   : string;
    telegram : string;
    jetton: string;
    nft: string;
    website : string;
}

export interface ProposalMetadata {

    id: number;
    owner: string;
    mcSnapshotBlock: number;
    proposalStartTime: number;
    proposalEndTime: number;
    proposalSnapshotTime: number;
    proposalType: number;
    votingPowerStrategy: VotingPowerStrategy;
    title: string;
    description: string;
    jetton: string | undefined;
    nft: string | undefined;
}

export interface Votes {
    [voter: string]: {timestamp: number, vote: string, hash: string};
}


export interface VotingPower {
    [voter: string]: string;
}

export interface ProposalResult {
    yes: number,
    no: number,
    abstain: number,
    totalWeight: string
}