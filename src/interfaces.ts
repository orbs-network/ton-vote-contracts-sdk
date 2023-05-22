import { Transaction } from "ton";

export enum ReleaseMode {
    PRODUCTION = 0,
    DEVELOPMENT = 1
}

export interface TxData {
    allTxns: Transaction [], 
    maxLt: undefined | string
};


export interface DaoRoles {
    owner: string;
    proposalOwner: string;
}

export interface RegistryState {
    registryAddr: string,
    registryId: number,
    nextDaoId: number,
    admin: string,
    deployAndInitDaoFee: string
}

export interface DaoState {

    registry: string;
    owner: string;
    proposalOwner: string;
    metadata: string;
    daoIndex: number;
    fwdMsgFee: number;
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
{name: 'blacklist', value: 'EQBeHRBlsDK-2ZGlmRb7D_WwOY0gObuXrkRb-RC_TWI2Awll, EQBXOjSadD0rTzWTESeHroy33SlcbqBkYSCmA02dEgMIcv0G'}
{name: 'jetton-address', value: 'EQBeHRBlsDK-2ZGlmRb7D_WwOY0gObuXrkRb-RC_TWI2Awll'}
*/
export interface VotingPowerStrategyArg {
    name: string, 
    value: string
}

export interface VotingPowerStrategy {
    type: VotingPowerStrategyType,
    arguments: VotingPowerStrategyArg[]
}

/*

ton-balance:
{
    type: VotingPowerStrategyType.TonBalance,
    arguments: []
}

jetton: 
{
    type: VotingPowerStrategyType.JettonBalance,
    arguments: [{name: 'jetton-address', value: 'EQBXOjSadD0rTzWTESeHroy33SlcbqBkYSCmA02dEgMIcv0G'}]
}

nft: 
{
    type: VotingPowerStrategyType.NftCcollection,
    arguments: [{name: 'nft-address', value: 'EQBXOjSadD0rTzWTESeHroy33SlcbqBkYSCmA02dEgMIcv0G'}]
}

*/

export interface ProposalMetadata {

    id: number;
    proposalDeployer: string;
    mcSnapshotBlock: number;
    proposalStartTime: number;
    proposalEndTime: number;
    proposalSnapshotTime: number;
    votingSystem: VotingSystem;
    votingPowerStrategies: VotingPowerStrategy[];
    title: string;
    description: string;
    quorum: string;
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