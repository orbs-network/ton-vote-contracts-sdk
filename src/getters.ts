import { min } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { TonClient, TonClient4 } from "ton";
import { Address } from "ton-core";
import { MetadataArgs, ProposalMetadata } from "./interfaces";


export async function getRegistry(client : TonClient): Promise<Address> {  
    let registryContract = client.open(await Registry.fromInit());
    return registryContract.address;
}

export async function getDaos(client : TonClient, nextId: null | number = null, batchSize=10, order: 'desc' | 'asc' ='desc'): Promise<{endDaoId: number, daoAddresses: Address[]}> {  

    if (order == 'desc') return getDaosDesc(client, nextId, batchSize);
    return getDaosAsc(client, nextId, batchSize);
}

async function getDaosDesc(client : TonClient, startId: null | number = null, batchSize=10): Promise<{endDaoId: number, daoAddresses: Address[]}> {  

  let registryContract = client.open(await Registry.fromInit());
  let daoAddresses: Address[] = [];

  if (startId == null) {
    startId = Number(await registryContract.getNextDaoId())-1;
  }

  const endDaoId = Math.max(0, startId - batchSize + 1);

  for (let id = startId; id >= endDaoId; id--) {
    let daoAddr = await registryContract.getDaoAddress(BigInt(id));
    daoAddresses.push(daoAddr);
  }

  return {endDaoId: endDaoId-1, daoAddresses};
}

async function getDaosAsc(client : TonClient, startId: null | number = null, batchSize=10): Promise<{endDaoId: number, daoAddresses: Address[]}> {  

    let registryContract = client.open(await Registry.fromInit());
    let daoAddresses: Address[] = [];
  
    if (startId == null) {
      startId = 0;
    }
  
    const endDaoId = Math.min(Number(await registryContract.getNextDaoId()), startId + batchSize);
  
    for (let id = startId; id < endDaoId; id++) {
      let daoAddr = await registryContract.getDaoAddress(BigInt(id));
      daoAddresses.push(daoAddr);
    }
  
    return {endDaoId, daoAddresses: daoAddresses};
  }
  
export async function getDaoMetadata(client : TonClient, daoAddr: Address): Promise<MetadataArgs> {  

    let daoContract = client.open(Dao.fromAddress(daoAddr));
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

export async function getDaoRoles(client : TonClient, daoAddr: Address): Promise<{id: bigint, owner: Address, proposalOwner: Address}> {  

    let daoContract = client.open(Dao.fromAddress(daoAddr));

    const id = await daoContract.getDaoIndex();
    const owner = await daoContract.getOwner();
    const proposalOwner = await daoContract.getProposalOwner();

    return {id, owner, proposalOwner};
}

export async function getDaoProposals(client : TonClient, daoAddr: Address, nextId: number | null = null, batchSize=10, order: 'desc' | 'asc' = 'desc'): Promise<{endProposalId: number, proposalAddresses: Address[] | undefined}> {
    
    if (order == 'desc') return getDaoProposalsDesc(client, daoAddr, nextId, batchSize);
    return getDaoProposalsAsc(client, daoAddr, nextId, batchSize);
}

export async function getDaoProposalsDesc(client : TonClient, daoAddr: Address, startId: number | null = null, batchSize=10): Promise<{endProposalId: number, proposalAddresses: Address[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(daoAddr));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client.isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    let nextProposalId = Number(await proposalDeployer.getNextProposalId());

    if (startId == null) startId = nextProposalId - 1;

    const endProposalId = Math.max(0, startId - batchSize + 1);

    let proposalAddresses: Address[] = [];

    for (let id = startId; id >= endProposalId; id--) {
        let daoAddr = await proposalDeployer.getProposalAddr(BigInt(id));
        proposalAddresses.push(daoAddr);
    }

    return {endProposalId: endProposalId-1, proposalAddresses};
}

export async function getDaoProposalsAsc(client : TonClient, daoAddr: Address, startId: number | null = null, batchSize=10): Promise<{endProposalId: number, proposalAddresses: Address[] | undefined}> {
    let daoContract = client.open(Dao.fromAddress(daoAddr));
    let proposalDeployer = client.open(await ProposalDeployer.fromInit(daoContract.address));

    if (!(await client.isContractDeployed(proposalDeployer.address))) {
        return {endProposalId: -1, proposalAddresses: undefined}
    }

    if (startId == null) startId = 0;

    const endProposalId = Math.min(Number(await proposalDeployer.getNextProposalId()), startId + batchSize);

    let proposalAddresses: Address[] = [];

    for (let id = startId; id < endProposalId; id++) {
        let daoAddr = await proposalDeployer.getProposalAddr(BigInt(id));
        proposalAddresses.push(daoAddr);
    }

    return {endProposalId, proposalAddresses};
}


export async function getProposalInfo(client : TonClient, client4: TonClient4, proposalAddr: Address): Promise<ProposalMetadata> {
    let proposal = client.open(Proposal.fromAddress(proposalAddr));

    const id = await proposal.getId();
    const owner = await proposal.getOwner();
    const proposalStartTime = await proposal.getProposalStartTime();
    const proposalEndTime = await proposal.getProposalEndTime();
    const proposalSnapshotTime = await proposal.getProposalSnapshotTime();
    const proposalType = await proposal.getProposalType();
    const votingPowerStrategy = await proposal.getVotingPowerStrategy();

    const mcSnapshotBlock = await getBlockFromTime(client4, Number(proposalSnapshotTime));
    
    return {id, owner, mcSnapshotBlock, proposalStartTime, proposalEndTime, proposalSnapshotTime, proposalType, votingPowerStrategy};
}

async function getBlockFromTime(clientV4: TonClient4, utime: number): Promise<number> {

    let res = (await clientV4.getBlockByUtime(utime)).shards;
  
    for (let i = 0; i < res.length; i++) {
      if (res[i].workchain == -1) return res[i].seqno;
    }
  
    return -1;
}
  