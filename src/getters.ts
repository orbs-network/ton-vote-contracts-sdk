import { executeMethodWithRetry, min, promiseAllWithRetry } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { TonClient, TonClient4, Address } from "ton";
import { MetadataArgs, ProposalMetadata, VotingPowerStrategy, VotingSystem, VotingSystemType, VotingPowerStrategyType, ReleaseMode, DaoState, RegistryState } from "./interfaces";
import { Router } from "../contracts/output/ton-vote_Router";


export async function getRouter(client : TonClient): Promise<string> {  
    let routerContract = client.open(await Router.fromInit());
    return routerContract.address.toString();
}

export async function getRegistry(client : TonClient, releaseMode: ReleaseMode): Promise<string | undefined> {  
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    if (!(await client. isContractDeployed(registryContract.address))) {
        return; 
    }

    return registryContract.address.toString();
}

export async function getRegistryState(client : TonClient, releaseMode: ReleaseMode): Promise<RegistryState | undefined> {  
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    if (!(await client. isContractDeployed(registryContract.address))) {
        return; 
    }

    const registryState = await registryContract.getState();

    return {
        registryAddr: registryContract.address.toString(), 
        registryId: Number(registryState.registryId),
        nextDaoId: Number(registryState.nextDaoId),
        admin: registryState.admin.toString(),
        deployAndInitDaoFee: registryState.deployAndInitDaoFee.toString()
    };
}

export async function getDaos(client : TonClient, releaseMode: ReleaseMode, nextId: null | number = null, batchSize=100, order: 'desc' | 'asc' ='asc'): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    if (order == 'desc') return getDaosDesc(client, releaseMode, nextId, batchSize);
    return getDaosAsc(client, releaseMode, nextId, batchSize);
}

async function getDaosDesc(client : TonClient, releaseMode: ReleaseMode, startId: null | number = null, batchSize=100): Promise<{endDaoId: number, daoAddresses: string[]}> {  

  let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
  let daoAddresses: string[] = [];

  const nextDaoId = Number(await registryContract.getNextDaoId());

  if (nextDaoId == 0) {
    return {endDaoId: 0, daoAddresses: []}
  }

  if (startId == null) {
    startId = nextDaoId-1;
  }

  const endDaoId = Math.max(0, startId - batchSize + 1);

  for (let i = startId; i >= endDaoId; i -= batchSize) {
    const batchStart = Math.max(i - batchSize + 1, endDaoId);
    const batchEnd = i + 1;
    const promises = [];
    for (let id = batchStart; id < batchEnd; id++) {
      promises.push(registryContract.getDaoAddress(BigInt(id)));
    }
    const results = await Promise.all(promises);
    daoAddresses.push(...results.map(addr => addr.toString()));
  }
    
  return {endDaoId: endDaoId-1, daoAddresses};
}

async function getDaosAsc(client : TonClient, releaseMode: ReleaseMode, startId: null | number = null, batchSize=100): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
    let daoAddresses: string[] = [];
  
    const nextDaoId = Number(await registryContract.getNextDaoId());

    if (nextDaoId == 0) {
      return {endDaoId: 0, daoAddresses: []}
    }
  
    if (startId == null) {
      startId = 0;
    }
  
    const endDaoId = Math.min(nextDaoId, startId + batchSize);

    let batchCount = Math.ceil((endDaoId - startId) / batchSize);
    
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      let batchStart = startId + batchIndex * batchSize;
      let batchEnd = Math.min(startId + (batchIndex + 1) * batchSize, endDaoId);
    
      let promises = [];
    
      for (let id = batchStart; id < batchEnd; id++) {
        promises.push(registryContract.getDaoAddress(BigInt(id)).then(daoAddr => daoAddresses.push(daoAddr.toString())));
      }
    
      await promiseAllWithRetry(promises);
    }
          
    return {endDaoId, daoAddresses: daoAddresses};
}

export async function getDaoState(client : TonClient, daoAddr: string): Promise<DaoState> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    const daoState = await executeMethodWithRetry(daoContract, 'getState')
    
    return {
        registry: daoState.registry.toString(),
        owner: daoState.owner.toString(),
        proposalOwner: daoState.proposalOwner.toString(),
        metadata: daoState.metadata.toString(),
        daoIndex: Number(daoState.daoIndex),
        fwdMsgFee: Number(daoState.fwdMsgFee)
    }
}

export async function getDaoMetadata(client : TonClient, metadataAddr: string): Promise<MetadataArgs> {  

    const metadataContract = client.open(Metadata.fromAddress(Address.parse(metadataAddr)));    
    const metadata = await executeMethodWithRetry(metadataContract, 'getState');

    return {
        about: metadata.about, 
        avatar: metadata.avatar, 
        github: metadata.github, 
        hide: metadata.hide, 
        name: metadata.name, 
        terms: metadata.terms, 
        telegram: metadata.telegram, 
        website: metadata.website, 
        jetton: metadata.jetton.toString(), 
        nft: metadata.nft.toString(),
        dns: metadata.dns.toString()
    };
}

export async function getDaoProposals(client : TonClient, daoAddr: string, nextId: number | null = null, batchSize=100, order: 'desc' | 'asc' = 'asc'): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    
    if (order == 'desc') return getDaoProposalsDesc(client, daoAddr, nextId, batchSize);
    return getDaoProposalsAsc(client, daoAddr, nextId, batchSize);
}

async function getDaoProposalsDesc(client : TonClient, daoAddr: string, startId: number | null = null, batchSize=100): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client. isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    let nextProposalId = Number(await proposalDeployer.getNextProposalId());

    if (startId == null) startId = nextProposalId - 1;

    const endProposalId = Math.max(0, startId - batchSize + 1);

    let proposalAddresses: string[] = [];

    const numBatches = Math.ceil((startId - endProposalId + 1) / batchSize);
    
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {

        const batchStartId = startId - batchIndex * batchSize;
        const batchEndId = Math.max(batchStartId - batchSize, endProposalId - 1);
    
        const batchPromises: Promise<void>[] = [];
        for (let id = batchStartId; id > batchEndId; id--) {
            const daoAddrPromise = proposalDeployer.getProposalAddr(BigInt(id)).then((daoAddr) => {
            proposalAddresses.push(daoAddr.toString());
            });
            batchPromises.push(daoAddrPromise);
        }
        
        await promiseAllWithRetry(batchPromises);
    }

    return {endProposalId: endProposalId-1, proposalAddresses};
}

async function getDaoProposalsAsc(client : TonClient, daoAddr: string, startId: number | null = null, batchSize=100): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client.isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    if (startId == null) startId = 0;

    const endProposalId = Math.min(Number(await proposalDeployer.getNextProposalId()), startId + batchSize);

    let proposalAddresses: string[] = [];

    for (let batchStart = startId; batchStart < endProposalId; batchStart += batchSize) {
    
        const batchEnd = Math.min(batchStart + batchSize, endProposalId);
        const batchPromises = [];
    
        for (let id = batchStart; id < batchEnd; id++) {
          batchPromises.push(proposalDeployer.getProposalAddr(BigInt(id)));
        }
    
        const batchResults = await promiseAllWithRetry(batchPromises);
        proposalAddresses.push(...batchResults.map((addr: Address) => addr.toString()));
    }

    return {endProposalId, proposalAddresses};
}

export function extractVotingSystem(votingSystemStr: string): VotingSystem {

    try {        
        const votingSystem = JSON.parse(votingSystemStr);
        if (!('choices' in votingSystem) || !('votingSystemType' in votingSystem)) {
            return {
                choices: [],
                votingSystemType: VotingSystemType.UNDEFINED
            }
        }

        return votingSystem as VotingSystem;

    } catch(err) {
        console.log('failed to extract voting system from str: ', votingSystemStr);
        console.error(err);
        return {
            choices: [],
            votingSystemType: VotingSystemType.UNDEFINED
        }
    }

}

export function extractVotingPowerStrategies(votingPowerStrategiesStr: string): VotingPowerStrategy[] {

    try {        
        const votingPowerStrategies = JSON.parse(votingPowerStrategiesStr);
        if (!Array.isArray(votingPowerStrategies)) {
            console.log('failed to extract voting power strategies from str: ', votingPowerStrategiesStr);
            return [{
                type: VotingPowerStrategyType.UNDEFINED,
                arguments: []
            }]
        }
        for (let i = 0; i < votingPowerStrategies.length; i++) {
            if (!('type' in votingPowerStrategies[i]) || !('arguments' in votingPowerStrategies[i])) {
                console.log('failed to extract voting power strategies from str: ', votingPowerStrategiesStr);

                return [{
                    type: VotingPowerStrategyType.UNDEFINED,
                    arguments: []
                }]    
            }                
        }

        return votingPowerStrategies;

    } catch(err) {
        console.log('failed to extract voting power strategies from str: ', votingPowerStrategiesStr);
        // console.error(err);
        return [{
            type: VotingPowerStrategyType.UNDEFINED,
            arguments: []
        }]

    }

}

export async function getProposalMetadata(client : TonClient, client4: TonClient4, proposalAddr: string): Promise<ProposalMetadata> {
    let proposal = client.open(Proposal.fromAddress(Address.parse(proposalAddr)));
    const state = await executeMethodWithRetry(proposal, 'getState');

    const id = Number(state.id);
    const proposalDeployer = (state.proposalDeployer).toString();
    const proposalStartTime = Number(state.proposalStartTime);
    const proposalEndTime = Number(state.proposalEndTime);
    const proposalSnapshotTime = Number(state.proposalSnapshotTime);
    const quorum = state.quorum;
    const hide = state.hide;
    const votingSystem = extractVotingSystem(state.votingSystem);
    const votingPowerStrategies = extractVotingPowerStrategies(state.votingPowerStrategies);
    const mcSnapshotBlock = await getBlockFromTime(client4, proposalSnapshotTime);
    
    const title = state.title;
    const description = state.description;

    return {id, proposalDeployer, mcSnapshotBlock, proposalStartTime, proposalEndTime, proposalSnapshotTime, 
        votingSystem, votingPowerStrategies, title, description, quorum, hide};
}

async function getBlockFromTime(clientV4: TonClient4, utime: number): Promise<number> {

    let res;

    try {
        res = (await clientV4.getBlockByUtime(utime)).shards;

    } catch {
        console.log(`couldn't get block by utime ${utime}`);
        return -1;        
    }
  
    for (let i = 0; i < res.length; i++) {
      if (res[i].workchain == -1) return res[i].seqno;
    }
  
    return -1;
}

export async function metdataExists(client : TonClient, metadataArgs: MetadataArgs): Promise<boolean> {  
    
    let metadataContract = client.open(await Metadata.fromInit(
        metadataArgs.avatar, metadataArgs.name, metadataArgs.about, 
        metadataArgs.website, metadataArgs.terms, metadataArgs.telegram, 
        metadataArgs.github, Address.parse(metadataArgs.jetton), Address.parse(metadataArgs.nft),
        metadataArgs.hide, metadataArgs.dns));        
    
    if (await client.isContractDeployed(metadataContract.address)) {
        return true;

    } else {
        return false;
    }
    
}
