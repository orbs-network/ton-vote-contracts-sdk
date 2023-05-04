import { Transaction } from "ton";

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

export enum VotingSystemType {
    UNDEFINED = -1,
    CHOOSE_EXACTLY_ONE = 0
}

export interface VotingSystem {
    choices: string[],
    votingSystemType: VotingSystemType
}

export enum VotingPowerStrategyType {
    UNDEFINED = -1,
    TonBalance = 0, 
    JettonBalance = 1, 
    NftCcollection = 2
};

/*
examples: 
{name: 'blacklist', type: 'string', list: true, value: 'EQBeHRBlsDK-2ZGlmRb7D_WwOY0gObuXrkRb-RC_TWI2Awll, EQBXOjSadD0rTzWTESeHroy33SlcbqBkYSCmA02dEgMIcv0G'}
{name: 'jetton-address', type: 'string', list: false, value: 'EQBeHRBlsDK-2ZGlmRb7D_WwOY0gObuXrkRb-RC_TWI2Awll'}
{name: 'ids', type: 'number', list: true, value: '0, 1, 2'}
*/
export interface VotingPowerStrategyArg {
    name: string, 
    type: string, // the type of the arg (e.g.: number)
    list: boolean, // could be a list, list should be seperated with commas
    value: string // value of the args
}

export interface VotingPowerStrategy {
    type: VotingPowerStrategyType,
    arguments: VotingPowerStrategyArg[]
}

export interface ProposalMetadata {

    id: number;
    owner: string;
    mcSnapshotBlock: number;
    proposalStartTime: number;
    proposalEndTime: number;
    proposalSnapshotTime: number;
    votingSystem: VotingSystem;
    votingPowerStrategies: VotingPowerStrategy[];
    title: string;
    description: string;
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