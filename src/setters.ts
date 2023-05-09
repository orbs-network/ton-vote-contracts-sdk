import { waitForConditionChange, waitForContractToBeDeployed, getSeqno, storeComment } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer, storeCreateProposal } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { SendMode, TonClient } from "ton";
import { Address, Sender, toNano, beginCell, Cell } from "ton-core";
import { MetadataArgs, ProposalMetadata, ReleaseMode } from "./interfaces";


const REGISTRY_DEPLOY_VALUE = "0.25";
const DAO_DEPLOY_VALUE = "0.25"; 
const PROPOSAL_DEPLOY_VALUE = "0.25";
const SET_OWNER_DEPLOY_VALUE = "0.25";
const SET_METADATA_DEPLOY_VALUE = "0.25";
const SET_PROPOSAL_OWNER_DEPLOY_VALUE = "0.25";

const ZERO_ADDR = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';


export async function newRegistry(sender: Sender, client : TonClient, releaseMode: ReleaseMode, admin: string): Promise<boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    await registryContract.send(sender, { value: toNano(REGISTRY_DEPLOY_VALUE) }, 
    { 
        $$type: 'Deploy', 
        queryId: 0n
    });
    
    if (!await waitForContractToBeDeployed(client, registryContract.address)) {
        console.error('failed to deploy registry contract');
        return false;        
    }

    await registryContract.send(sender, { value: toNano(REGISTRY_DEPLOY_VALUE) }, 
    { 
        $$type: 'SetRegistryAdmin', 
        newAdmin: Address.parse(admin)
    });

    return await waitForConditionChange(registryContract.getAdmin, [], ZERO_ADDR);    
}

export async function newDao(sender: Sender, client : TonClient, releaseMode: ReleaseMode, metadataAddr: string, ownerAddr: string, proposalOwner: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
    const nextDaoId = await registryContract.getNextDaoId();

    let daoContract = client.open(await Dao.fromInit(registryContract.address, nextDaoId));
    
    if (await client.isContractDeployed(daoContract.address)) {
        
        console.log("Contract already deployed");
        return daoContract.address.toString();
    
    } else {
                
        await registryContract.send(sender, { value: toNano(DAO_DEPLOY_VALUE) }, 
        { 
            $$type: 'CreateDao', 
            owner: Address.parse(ownerAddr), 
            proposalOwner: Address.parse(proposalOwner), 
            metadata: Address.parse(metadataAddr)
        });

        return await waitForConditionChange(registryContract.getNextDaoId, [], nextDaoId) && daoContract.address.toString();
    }
    
}

export async function setDeployDaoCost(sender: Sender, client : TonClient, releaseMode: ReleaseMode, metadataAddr: string, ownerAddr: string, proposalOwner: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
    const nextDaoId = await registryContract.getNextDaoId();

    let daoContract = client.open(await Dao.fromInit(registryContract.address, nextDaoId));
    
    if (await client.isContractDeployed(daoContract.address)) {
        
        console.log("Contract already deployed");
        return daoContract.address.toString();
    
    } else {
                
        await registryContract.send(sender, { value: toNano(DAO_DEPLOY_VALUE) }, 
        { 
            $$type: 'CreateDao', 
            owner: Address.parse(ownerAddr), 
            proposalOwner: Address.parse(proposalOwner), 
            metadata: Address.parse(metadataAddr)
        });

        return await waitForConditionChange(registryContract.getNextDaoId, [], nextDaoId) && daoContract.address.toString();
    }
    
}

export async function newMetdata(sender: Sender, client : TonClient, metadataArgs: MetadataArgs): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);
        
        return false;
    };
    
    let metadataContract = client.open(await Metadata.fromInit(
        metadataArgs.avatar, metadataArgs.name, metadataArgs.about, 
        metadataArgs.website, metadataArgs.terms, metadataArgs.telegram, 
        metadataArgs.github, Address.parse(metadataArgs.jetton), Address.parse(metadataArgs.nft),
        metadataArgs.hide));        
    
    if (await client.isContractDeployed(metadataContract.address)) {
        console.log("Contract already deployed");
        return metadataContract.address.toString();

    } else {
        await metadataContract.send(sender, { value: toNano('0.25') }, { $$type: 'Deploy' as const, queryId: BigInt(0) });
    }

    return await waitForContractToBeDeployed(client, metadataContract.address) && metadataContract.address.toString();
}

export async function newProposal(sender: Sender, client : TonClient, daoAddr: string, proposalMetadata: ProposalMetadata): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    if (!(await client.isContractDeployed(daoContract.address))) {        
        console.log("Dao contract is not deployed");
        return false;
    }

    const proposalOwner = await daoContract.getProposalOwner();
    const owner = await daoContract.getOwner();

    if ((proposalOwner.toString() != sender.address.toString()) && (owner.toString() != sender.address.toString())) {        
        console.log("Only proposalOwner or owner are allowed to create proposal");
        return false;
    }

    let proposalDeployerContract = client.open(await ProposalDeployer.fromInit(Address.parse(daoAddr)));
    if (!proposalDeployerContract.init) {
        console.log('proposalDeployer init is undefined');
        return false;
    }

    let code: Cell | null = proposalDeployerContract.init.code;
    let data: Cell | null = proposalDeployerContract.init.data;
    let nextProposalId = BigInt(0);

    if (await client.isContractDeployed(proposalDeployerContract.address)) {
        code = null;
        data = null;
        nextProposalId = await proposalDeployerContract.getNextProposalId();
    }

    await daoContract.send(sender, { value: toNano(PROPOSAL_DEPLOY_VALUE) }, 
        { 
            $$type: 'FwdMsg', fwdMsg: {
                $$type: 'SendParameters', 
                bounce: true,
                to: proposalDeployerContract.address,
                value: toNano(0),
                mode: BigInt(64),
                body: beginCell().store(storeCreateProposal({
                    $$type: 'CreateProposal',
                    body: {
                        $$type: 'Params',
                        proposalStartTime: BigInt(proposalMetadata.proposalStartTime),
                        proposalEndTime: BigInt(proposalMetadata.proposalEndTime),
                        proposalSnapshotTime: BigInt(proposalMetadata.proposalSnapshotTime),
                        votingSystem: JSON.stringify(proposalMetadata.votingSystem),
                        votingPowerStrategies: JSON.stringify(proposalMetadata.votingPowerStrategies),
                        title: proposalMetadata.title,
                        description: proposalMetadata.description
                    }
                })).endCell(),
                code: code,
                data: data
            }
        }
    );      

    let proposalContract = await Proposal.fromInit(proposalDeployerContract.address, nextProposalId);

    await waitForContractToBeDeployed(client, proposalContract.address);
    
    return await waitForConditionChange(proposalDeployerContract.getNextProposalId, [], nextProposalId) && proposalContract.address.toString();
}

export async function daoSetOwner(sender: Sender, client : TonClient, daoAddr: string, newOwner: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    if (!(await client.isContractDeployed(daoContract.address))) {        
        console.log("Dao contract is not deployed");
        return false;
    }

    let owner = await daoContract.getOwner();
    if (( owner != sender.address)) {        
        console.log("Only owner is allowed to set new owner");
        return false;
    }

    await daoContract.send(sender, { value: toNano(SET_OWNER_DEPLOY_VALUE) }, 
        { 
            $$type: 'SetOwner', newOwner: Address.parse(newOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getOwner, [], owner) && owner.toString();
}

export async function daoSetProposalOwner(sender: Sender, client : TonClient, daoAddr: string, newProposalOwner: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    if (!(await client.isContractDeployed(daoContract.address))) {        
        console.log("Dao contract is not deployed");
        return false;
    }

    let proposalOwner = await daoContract.getProposalOwner();
    let owner = await daoContract.getOwner();
    if ((proposalOwner != sender.address) && (owner != sender.address)) {        
        console.log("Only proposalOwner or owner are allowed to create proposal");
        return false;
    }

    await daoContract.send(sender, { value: toNano(SET_PROPOSAL_OWNER_DEPLOY_VALUE) }, 
        { 
            $$type: 'SetProposalOwner', newProposalOwner: Address.parse(newProposalOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getProposalOwner, [], proposalOwner) && newProposalOwner;
}

export async function daoSetMetadata(sender: Sender, client : TonClient, daoAddr: string, newMetadataAddr: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    if (!(await client.isContractDeployed(daoContract.address))) {        
        console.log("Dao contract is not deployed");
        return false;
    }

    let owner = await daoContract.getOwner();
    if (( owner != sender.address)) {        
        console.log("Only owner is allowed to set new new metadata");
        return false;
    }

    let metadtaAddr = await daoContract.getMetadata();

    await daoContract.send(sender, { value: toNano(SET_METADATA_DEPLOY_VALUE) }, 
        { 
            $$type: 'SetMetadata', newMetadata: Address.parse(newMetadataAddr)
        }
    );      
    
    return await waitForConditionChange(daoContract.getMetadata, [], metadtaAddr) && owner.toString();
}

export async function proposalSendMessage(sender: Sender, client: TonClient, proposalAddr: string, msgValue: string, msgBody: string) {
    if (!sender.address) {
        console.log(`sender address is not defined`);
        return false;
    }
        
    let proposalContract = client.open(Proposal.fromAddress(Address.parse(proposalAddr)));
    if (!(await client.isContractDeployed(proposalContract.address))) {
        console.log("Proposal contract is not deployed");
        return false;
    }
    
    const seqno = await getSeqno(client, sender.address.toString());

    await sender.send(
        {
            value: toNano(msgValue), to: Address.parse(proposalAddr), 
            body: beginCell().store(storeComment(msgBody)).endCell(),
            sendMode: SendMode.CARRY_ALL_REMAINING_INCOMING_VALUE, 
        }
    );

    await waitForConditionChange(getSeqno, [client, sender.address.toString()], seqno);
}
