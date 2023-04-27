import { min } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { TonClient, TonClient4, Address } from "ton";
import { MetadataArgs, ProposalMetadata, VotingSystem, VotingSystemType } from "./interfaces";


export async function getRegistry(client : TonClient): Promise<string> {  
    let registryContract = client.open(await Registry.fromInit());
    return registryContract.address.toString();
}

export async function getDaos(client : TonClient, nextId: null | number = null, batchSize=10, order: 'desc' | 'asc' ='desc'): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    if (order == 'desc') return getDaosDesc(client, nextId, batchSize);
    return getDaosAsc(client, nextId, batchSize);
}

// TODO: FIXME
async function getDaosDesc(client : TonClient, startId: null | number = null, batchSize=100): Promise<{endDaoId: number, daoAddresses: string[]}> {  

  let registryContract = client.open(await Registry.fromInit());
  let daoAddresses: string[] = [];

  if (startId == null) {
    startId = Number(await registryContract.getNextDaoId())-1;
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

async function getDaosAsc(client : TonClient, startId: null | number = null, batchSize=100): Promise<{endDaoId: number, daoAddresses: string[]}> {  

    let registryContract = client.open(await Registry.fromInit());
    let daoAddresses: string[] = [];
  
    if (startId == null) {
      startId = 0;
    }
  
    const endDaoId = Math.min(Number(await registryContract.getNextDaoId()), startId + batchSize);

    let batchCount = Math.ceil((endDaoId - startId) / batchSize);
    
    for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
      let batchStart = startId + batchIndex * batchSize;
      let batchEnd = Math.min(startId + (batchIndex + 1) * batchSize, endDaoId);
    
      let promises = [];
    
      for (let id = batchStart; id < batchEnd; id++) {
        promises.push(registryContract.getDaoAddress(BigInt(id)).then(daoAddr => daoAddresses.push(daoAddr.toString())));
      }
    
      await Promise.all(promises);
    }
          
    return {endDaoId, daoAddresses: daoAddresses};
}
  
export async function getDaoMetadata(client : TonClient, daoAddr: string): Promise<MetadataArgs> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));
    const metadataAddr = await daoContract.getMetadata();

    const metadataContract = client.open(Metadata.fromAddress(metadataAddr));
    
    const [about, avatar, github, hide, name, terms, website, telegram, jetton, nft] = await Promise.all([
        metadataContract.getAbout(),
        metadataContract.getAvatar(),
        metadataContract.getGithub(),
        metadataContract.getHide(),
        metadataContract.getName(),
        metadataContract.getTerms(),
        metadataContract.getWebsite(),
        metadataContract.getTelegram().catch(() => ''),
        metadataContract.getJetton().then(j => j.toString()).catch(() => ''),
        metadataContract.getNft().then(n => n.toString()).catch(() => ''),
    ]);
    
    return {about, avatar, github, hide, name, terms, telegram, website, jetton, nft};
}

export async function getDaoRoles(client : TonClient, daoAddr: string): Promise<{owner: string, proposalOwner: string}> {  

    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    const [owner, proposalOwner] = await Promise.all([
        daoContract.getOwner(),  
        daoContract.getProposalOwner()
    ].map(p => p.then(p => p.toString())));

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
        
        await Promise.all(batchPromises);
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

    for (let batchStart = startId; batchStart < endProposalId; batchStart += batchSize) {
    
        const batchEnd = Math.min(batchStart + batchSize, endProposalId);
        const batchPromises = [];
    
        for (let id = batchStart; id < batchEnd; id++) {
          batchPromises.push(proposalDeployer.getProposalAddr(BigInt(id)));
        }
    
        const batchResults = await Promise.all(batchPromises);
        proposalAddresses.push(...batchResults.map((addr) => addr.toString()));
    }

    return {endProposalId, proposalAddresses};
}

export function extractVotingSystem(votingSystemStr: string): VotingSystem {

    try {
        const votingSystem = JSON.parse(votingSystemStr);
        if (('choices' in votingSystem) || ('votingSystemType' in votingSystem)) {
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

export async function getProposalMetadata(client : TonClient, client4: TonClient4, proposalAddr: string): Promise<ProposalMetadata> {
    let proposal = client.open(Proposal.fromAddress(Address.parse(proposalAddr)));

    // const [id,  owner,  proposalStartTime,  proposalEndTime,  
    //     proposalSnapshotTime,  proposalType,  votingPowerStrategy,  
    //     title,  description,  jetton,  nft
    // ] = await Promise.all([
    //     proposal.getId().then((id) => Number(id)),
    //     proposal.getOwner().then((owner) => String(owner)),
    //     proposal.getProposalStartTime().then((start) => Number(start)),
    //     proposal.getProposalEndTime().then((end) => Number(end)),
    //     proposal.getProposalSnapshotTime().then((snapshot) => Number(snapshot)),
    //     proposal.getProposalType().then((type) => Number(type)),
    //     proposal.getVotingPowerStrategy().then((strategy) => Number(strategy)),
    //     proposal.getTitle(),
    //     proposal.getDescription(),
    //     proposal.getJetton().then((jetton) => String(jetton)),
    //     proposal.getNft().then((nft) => String(nft)),
    // ]);
      
    // const mcSnapshotBlock = await getBlockFromTime(client4, proposalSnapshotTime);

    const id = Number(await proposal.getId());
    const owner = (await proposal.getOwner()).toString();
    const proposalStartTime = Number(await proposal.getProposalStartTime());
    const proposalEndTime = Number(await proposal.getProposalEndTime());
    const proposalSnapshotTime = Number(await proposal.getProposalSnapshotTime());
    const votingSystem = extractVotingSystem(await proposal.getVotingSystem());
    const votingPowerStrategy = Number(await proposal.getVotingPowerStrategy());
    const mcSnapshotBlock = await getBlockFromTime(client4, Number(proposalSnapshotTime));
    
    const title = await proposal.getTitle();
    const description = await proposal.getDescription();    
    const jetton = (await proposal.getJetton()).toString();    
    const nft = (await proposal.getNft()).toString();    

    return {id, owner, mcSnapshotBlock, proposalStartTime, proposalEndTime, proposalSnapshotTime, 
        votingSystem, votingPowerStrategy, title, description, jetton, nft};
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
        metadataArgs.hide));        
    
    if (await client.isContractDeployed(metadataContract.address)) {
        return true;

    } else {
        return false;
    }
    
}
