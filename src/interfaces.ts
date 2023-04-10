import { Address } from "ton-core";

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
    twitter : string;
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
    votingPowerStrategy: number;
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