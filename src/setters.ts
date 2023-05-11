import { waitForConditionChange, waitForContractToBeDeployed, getSeqno, storeComment } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer, storeCreateProposal } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { SendMode, TonClient } from "ton";
import { Address, Sender, toNano, beginCell, Cell } from "ton-core";
import { MetadataArgs, ProposalMetadata, ReleaseMode } from "./interfaces";


const ZERO_ADDR = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';


export async function newRegistry(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, admin: string): Promise<boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'Deploy', 
        queryId: 0n
    });
    
    if (!await waitForContractToBeDeployed(client, registryContract.address)) {
        console.error('failed to deploy registry contract');
        return false;        
    }

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetRegistryAdmin', 
        newAdmin: Address.parse(admin)
    });

    return await waitForConditionChange(registryContract.getAdmin, [], ZERO_ADDR);    
}

export async function newDao(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, metadataAddr: string, ownerAddr: string, proposalOwner: string): Promise<string | boolean> {  

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
                
        await registryContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'CreateDao', 
            owner: Address.parse(ownerAddr), 
            proposalOwner: Address.parse(proposalOwner), 
            metadata: Address.parse(metadataAddr)
        });

        return await waitForConditionChange(registryContract.getNextDaoId, [], nextDaoId) && daoContract.address.toString();
    }
    
}

export async function setCreateDaoFee(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, newCreateDaoFee: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    const createDaoFee = await registryContract.getCreateDaoFee();

    if (createDaoFee == toNano(newCreateDaoFee)) return true;

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetCreateDaoFee', 
        newCreateDaoFee: toNano(newCreateDaoFee)
    });

    return await waitForConditionChange(registryContract.getCreateDaoFee, [], createDaoFee);
}

export async function setRegistryAdmin(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, newRegistryAdmin: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    const registryAdmin = await registryContract.getAdmin();

    if (Address.parse(newRegistryAdmin).equals(registryAdmin)) {
        console.log('new registry admin address equals to the existing admin address');
        return true;
    }

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetRegistryAdmin', 
        newAdmin: Address.parse(newRegistryAdmin)
    });

    return await waitForConditionChange(registryContract.getAdmin, [], registryAdmin);
}

export async function setFwdMsgFee(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, daoIds: string[], newFwdMsgFee: string): Promise<boolean[]> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return [false];
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
    const newFwdMsgFeeNano = toNano(newFwdMsgFee);

    const promises = daoIds.map(async (daoId) => {
        let daoContract = client.open(await Dao.fromInit(registryContract.address, BigInt(daoId)));
        const fwdMsgFee = await daoContract.getFwdMsgFee();

        if (fwdMsgFee == newFwdMsgFeeNano) return true;

        await registryContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SendToDaoSetFwdMsgFee', 
            daoId: BigInt(daoId),
            newFwdMsgFee: newFwdMsgFeeNano
        });
      
        return waitForConditionChange(daoContract.getFwdMsgFee, [], fwdMsgFee);
      });
      
      return await Promise.all(promises);  
}

export async function newMetdata(sender: Sender, client : TonClient, fee: string, metadataArgs: MetadataArgs): Promise<string | boolean> {  

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
        await metadataContract.send(sender, { value: toNano(fee) }, { $$type: 'Deploy' as const, queryId: BigInt(0) });
    }

    return await waitForContractToBeDeployed(client, metadataContract.address) && metadataContract.address.toString();
}

export async function newProposal(sender: Sender, client : TonClient, fee: string, daoAddr: string, proposalMetadata: ProposalMetadata): Promise<string | boolean> {  

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

    await daoContract.send(sender, { value: toNano(fee) }, 
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

export async function daoSetOwner(sender: Sender, client : TonClient, daoAddr: string, fee: string, newOwner: string): Promise<string | boolean> {  

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
    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to set new owner");
        return false;
    }

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetOwner', newOwner: Address.parse(newOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getOwner, [], owner) && owner.toString();
}

export async function daoSetProposalOwner(sender: Sender, client : TonClient, fee: string, daoAddr: string, newProposalOwner: string): Promise<string | boolean> {  

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
    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to create proposal");
        return false;
    }

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetProposalOwner', newProposalOwner: Address.parse(newProposalOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getProposalOwner, [], proposalOwner) && newProposalOwner;
}

export async function setMetadata(sender: Sender, client : TonClient, fee: string, daoAddr: string, newMetadataAddr: string): Promise<string | boolean> {  

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
    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to set new new metadata");
        return false;
    }

    let metadtaAddr = await daoContract.getMetadata();

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetMetadata', newMetadata: Address.parse(newMetadataAddr)
        }
    );      
    
    return await waitForConditionChange(daoContract.getMetadata, [], metadtaAddr) && owner.toString();
}

export async function proposalSendMessage(sender: Sender, client: TonClient, fee: string, proposalAddr: string, msgBody: string) {
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
            value: 0n, to: Address.parse(proposalAddr), 
            body: beginCell().store(storeComment(msgBody)).endCell(),
            sendMode: SendMode.PAY_GAS_SEPARATELY, 
        }
    );

    await waitForConditionChange(getSeqno, [client, sender.address.toString()], seqno);
}
