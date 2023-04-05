import { Address } from "ton-core";

export interface MetadataArgs {
    about   : string;
    avatar  : string;
    github  : string;
    hide    : boolean;
    name    : string;
    terms   : string;
    twitter : string;
    website : string;
}

export interface ProposalMetadata {

    id?: bigint;
    owner?: Address;
    mcSnapshotBlock?: number;
    proposalStartTime: bigint;
    proposalEndTime: bigint;
    proposalSnapshotTime: bigint;
    proposalType: bigint;
    votingPowerStrategy: bigint;
}

export interface Votes {
    [key: string]: {timestamp: number, vote: string, hash: string};
}


export interface VotingPower {
    [key: string]: string;
}

export interface ProposalResult {
    yes: number,
    no: number,
    abstain: number,
    totalWeight: string
}