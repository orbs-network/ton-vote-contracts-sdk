import { min } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { TonClient, TonClient4, Address } from "ton";
import { MetadataArgs, ProposalMetadata } from "./interfaces";


export async function getRegistry(client : TonClient): Promise<string> {  
    let registryContract = client.open(await Registry.fromInit());
    return registryContract.address.toString();
}

export async function getDaos(client : TonClient, nextId: null | number = null, batchSize=10, order: 'desc' | 'asc' ='desc'): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    if (order == 'desc') return getDaosDesc(client, nextId, batchSize);
    return getDaosAsc(client, nextId, batchSize);
}

async function getDaosDesc(client : TonClient, startId: null | number = null, batchSize=10): Promise<{endDaoId: number, daoAddresses: string[]}> {  

  let registryContract = client.open(await Registry.fromInit());
  let daoAddresses: string[] = [];

  if (startId == null) {
    startId = Number(await registryContract.getNextDaoId())-1;
  }

  const endDaoId = Math.max(0, startId - batchSize + 1);

  for (let id = startId; id >= endDaoId; id--) {
    let daoAddr = await registryContract.getDaoAddress(BigInt(id));
    daoAddresses.push(daoAddr.toString());
  }

  return {endDaoId: endDaoId-1, daoAddresses};
}

async function getDaosAsc(client : TonClient, startId: null | number = null, batchSize=10): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    let registryContract = client.open(await Registry.fromInit());
    let daoAddresses: string[] = [];
  
    if (startId == null) {
      startId = 0;
    }
  
    const endDaoId = Math.min(Number(await registryContract.getNextDaoId()), startId + batchSize);
  
    for (let id = startId; id < endDaoId; id++) {
      let daoAddr = await registryContract.getDaoAddress(BigInt(id));
      daoAddresses.push(daoAddr.toString());
    }
  
    return {endDaoId, daoAddresses: daoAddresses};
  }
  
export async function getDaoMetadata(client : TonClient, daoAddr: string): Promise<MetadataArgs> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    const metadataAddr = await daoContract.getMetadata();

    const metadataContract = client.open(Metadata.fromAddress(metadataAddr));
    
    const about   = await metadataContract.getAbout();
    const avatar  = await metadataContract.getAvatar();
    const github  = await metadataContract.getGithub();
    const hide    = await metadataContract.getHide();
    const name    = await metadataContract.getName();
    const terms   = await metadataContract.getTerms();
    const twitter = await metadataContract.getTwitter();
    const website = await metadataContract.getWebsite();

    return {about, avatar, github, hide, name, terms, twitter, website};
}

export async function getDaoRoles(client : TonClient, daoAddr: string): Promise<{owner: string, proposalOwner: string}> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    const owner = (await daoContract.getOwner()).toString();
    const proposalOwner = (await daoContract.getProposalOwner()).toString();

    return {owner, proposalOwner};
}

export async function getDaoIndex(client : TonClient, daoAddr: string): Promise<number> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    const id = Number(await daoContract.getDaoIndex());
    return id;
}

export async function getDaoProposals(client : TonClient, daoAddr: string, nextId: number | null = null, batchSize=10, order: 'desc' | 'asc' = 'desc'): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    
    if (order == 'desc') return getDaoProposalsDesc(client, daoAddr, nextId, batchSize);
    return getDaoProposalsAsc(client, daoAddr, nextId, batchSize);
}

async function getDaoProposalsDesc(client : TonClient, daoAddr: string, startId: number | null = null, batchSize=10): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client.isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    let nextProposalId = Number(await proposalDeployer.getNextProposalId());

    if (startId == null) startId = nextProposalId - 1;

    const endProposalId = Math.max(0, startId - batchSize + 1);

    let proposalAddresses: string[] = [];

    for (let id = startId; id >= endProposalId; id--) {
        let daoAddr = await proposalDeployer.getProposalAddr(BigInt(id));
        proposalAddresses.push(daoAddr.toString());
    }

    return {endProposalId: endProposalId-1, proposalAddresses};
}

async function getDaoProposalsAsc(client : TonClient, daoAddr: string, startId: number | null = null, batchSize=10): Promise<{endProposalId: number, proposalAddresses: string[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client.isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    if (startId == null) startId = 0;

    const endProposalId = Math.min(Number(await proposalDeployer.getNextProposalId()), startId + batchSize);

    let proposalAddresses: string[] = [];

    for (let id = startId; id < endProposalId; id++) {
        let daoAddr = await proposalDeployer.getProposalAddr(BigInt(id));
        proposalAddresses.push(daoAddr.toString());
    }

    return {endProposalId, proposalAddresses};
}


export async function getProposalInfo(client : TonClient, client4: TonClient4, proposalAddr: string): Promise<ProposalMetadata> {
    let proposal = client.open(Proposal.fromAddress(Address.parse(proposalAddr)));

    const id = Number(await proposal.getId());
    const owner = (await proposal.getOwner()).toString();
    const proposalStartTime = Number(await proposal.getProposalStartTime());
    const proposalEndTime = Number(await proposal.getProposalEndTime());
    const proposalSnapshotTime = Number(await proposal.getProposalSnapshotTime());
    const proposalType = Number(await proposal.getProposalType());
    const votingPowerStrategy = Number(await proposal.getVotingPowerStrategy());

    const mcSnapshotBlock = await getBlockFromTime(client4, Number(proposalSnapshotTime));
    
    return {id, owner, mcSnapshotBlock, proposalStartTime, proposalEndTime, proposalSnapshotTime, proposalType, votingPowerStrategy};
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
  