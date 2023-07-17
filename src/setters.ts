import { waitForConditionChange, waitForContractToBeDeployed, getSeqno, _transfer } from "./helpers";
import { Registry } from '../contracts/output/ton-vote_Registry'; 
import { Router } from '../contracts/output/ton-vote_Router'; 
import { storeDeployAndInitProposal, storeSendUpdateProposal } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Dao } from '../contracts/output/ton-vote_Dao'; 
import { Metadata } from '../contracts/output/ton-vote_Metadata'; 
import { ProposalDeployer } from '../contracts/output/ton-vote_ProposalDeployer'; 
import { Proposal } from '../contracts/output/ton-vote_Proposal'; 
import { SendMode, TonClient } from "ton";
import { Address, Sender, toNano, beginCell, Cell } from "ton-core";
import { MetadataArgs, ProposalMetadata, ReleaseMode } from "./interfaces";
import { getRegistry } from "./getters";


const ZERO_ADDR = 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';


export async function newRouter(sender: Sender, client : TonClient, fee: string): Promise<boolean | string> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let routerContract = client.open(await Router.fromInit());

    await routerContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'Deploy', 
        queryId: 0n
    });
    
    if (!await waitForContractToBeDeployed(client, routerContract.address)) {
        console.error('failed to deploy router contract');
        return false;        
    }

    return routerContract.address.toString();
}

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

    return await waitForConditionChange(registryContract.getState, [], ZERO_ADDR, 'admin');
}

export async function createNewDaoOnProdAndDev(sender: Sender, client : TonClient, fee: string, metadataAddr: string, ownerAddr: string, proposalOwner: string, prodMsgValue: string, devMsgValue: string, 
    prodReleaseMode: ReleaseMode = ReleaseMode.PRODUCTION, devReleaseMode: ReleaseMode = ReleaseMode.DEVELOPMENT): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    const routerContract = client.open(await Router.fromInit());
    const prodRegistry = await getRegistry(client, prodReleaseMode);
    const devRegistry = await getRegistry(client, devReleaseMode);

    if (!prodRegistry || !devRegistry) return false;
    let prodRegistryContract = client.open(await Registry.fromInit(BigInt(prodReleaseMode)));

    const nextDaoId = await prodRegistryContract.getNextDaoId();
    let daoContract = client.open(await Dao.fromInit(prodRegistryContract.address, nextDaoId));

    await routerContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'RouteDeployAndInitDao',
        prodMsgValue: toNano(prodMsgValue),
        devMsgValue: toNano(devMsgValue), 
        prodRegistry: Address.parse(prodRegistry!),
        devRegistry: Address.parse(devRegistry!),
        owner: Address.parse(ownerAddr), 
        proposalOwner: Address.parse(proposalOwner), 
        metadata: Address.parse(metadataAddr)
    });

    return await waitForConditionChange(prodRegistryContract.getNextDaoId, [], nextDaoId) && daoContract.address.toString();       
}

export async function newDao(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, metadataAddr: string, ownerAddr: string, proposalOwner: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));
    const nextDaoId = await registryContract.getNextDaoId();

    let daoContract = client.open(await Dao.fromInit(registryContract.address, nextDaoId));
                    
    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'DeployAndInitDao', 
        owner: Address.parse(ownerAddr), 
        proposalOwner: Address.parse(proposalOwner), 
        metadata: Address.parse(metadataAddr)
    });

    return await waitForConditionChange(registryContract.getNextDaoId, [], nextDaoId) && daoContract.address.toString();   
}

export async function setDeployAndInitDaoFee(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, newDeployAndInitDaoFee: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    const deployAndInitDaoFee = (await registryContract.getState()).deployAndInitDaoFee;

    if (deployAndInitDaoFee == toNano(newDeployAndInitDaoFee)) return true;

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetDeployAndInitDaoFee', 
        newDeployAndInitDaoFee: toNano(newDeployAndInitDaoFee)
    });

    return await waitForConditionChange(registryContract.getState, [], deployAndInitDaoFee, 'deployAndInitDaoFee');
}

export async function setNewDaoFwdMsgFee(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, newDaosFwdMsgFee: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    const daosfwdMsgFee = (await registryContract.getState()).newDaosfwdMsgFee;

    if (daosfwdMsgFee == toNano(newDaosFwdMsgFee)) return true;

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetNewDaoFwdMsgFee', 
        newDaosfwdMsgFee: toNano(newDaosFwdMsgFee)
    });

    return await waitForConditionChange(registryContract.getState, [], daosfwdMsgFee, 'newDaosfwdMsgFee');
}

export async function setRegistryAdmin(sender: Sender, client : TonClient, releaseMode: ReleaseMode, fee: string, newRegistryAdmin: string): Promise<string | boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let registryContract = client.open(await Registry.fromInit(BigInt(releaseMode)));

    const registryAdmin = (await registryContract.getState()).admin;

    if (Address.parse(newRegistryAdmin).equals(registryAdmin)) {
        console.log('new registry admin address equals to the existing admin address');
        return true;
    }

    await registryContract.send(sender, { value: toNano(fee) }, 
    { 
        $$type: 'SetRegistryAdmin', 
        newAdmin: Address.parse(newRegistryAdmin)
    });

    return await waitForConditionChange(registryContract.getState, [], registryAdmin, 'admin');
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

        const fwdMsgFee = (await daoContract.getState()).fwdMsgFee;

        if (fwdMsgFee == newFwdMsgFeeNano) return true;

        await registryContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SendToDaoSetFwdMsgFee', 
            daoId: BigInt(daoId),
            newFwdMsgFee: newFwdMsgFeeNano
        });
      
        return waitForConditionChange(daoContract.getState, [], fwdMsgFee, 'fwdMsgFee');
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
        metadataArgs.hide, metadataArgs.dns));        
    
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

    const daoState = await daoContract.getState();
    const owner = daoState.owner;
    const proposalOwner = daoState.proposalOwner;

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
                body: beginCell().store(storeDeployAndInitProposal({
                    $$type: 'DeployAndInitProposal',
                    body: {
                        $$type: 'Params',
                        proposalStartTime: BigInt(proposalMetadata.proposalStartTime),
                        proposalEndTime: BigInt(proposalMetadata.proposalEndTime),
                        proposalSnapshotTime: BigInt(proposalMetadata.proposalSnapshotTime),
                        votingSystem: JSON.stringify(proposalMetadata.votingSystem),
                        votingPowerStrategies: JSON.stringify(proposalMetadata.votingPowerStrategies),
                        title: proposalMetadata.title,
                        description: proposalMetadata.description,
                        quorum: proposalMetadata.quorum,
                        hide: proposalMetadata.hide
                    }
                })).endCell(),
                code: code,
                data: data
            }
        }
    );      

    await waitForContractToBeDeployed(client, proposalDeployerContract.address);
    await waitForConditionChange(proposalDeployerContract.getNextProposalId, [], nextProposalId, 'nextProposalId');
    const proposalAddr = await proposalDeployerContract.getProposalAddr(nextProposalId);
    return proposalAddr.toString();
}

export async function updateProposal(sender: Sender, client : TonClient, fee: string, daoAddr: string, proposalAddr: string, updateParams: ProposalMetadata): Promise<boolean> {  

    if (!sender.address) {
        console.log(`sender address is not defined`);        
        return false;
    };
    
    let daoContract = client.open(Dao.fromAddress(Address.parse(daoAddr)));

    if (!(await client.isContractDeployed(daoContract.address))) {        
        console.log("Dao contract is not deployed");
        return false;
    }

    const daoState = await daoContract.getState();
    const owner = daoState.owner;
    const proposalOwner = daoState.proposalOwner;

    if ((proposalOwner.toString() != sender.address.toString()) && (owner.toString() != sender.address.toString())) {        
        console.log("Only proposalOwner or owner are allowed to update proposal");
        return false;
    }

    let proposalDeployerContract = client.open(await ProposalDeployer.fromInit(Address.parse(daoAddr)));
    if (!proposalDeployerContract.init) {
        console.log('proposalDeployer init is undefined');
        return false;
    }

    if (!(await client.isContractDeployed(proposalDeployerContract.address))) {
        console.log('Proposal deployer not deployed');        
        return false;
    }

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'FwdMsg', fwdMsg: {
                $$type: 'SendParameters', 
                bounce: true,
                to: proposalDeployerContract.address,
                value: toNano(0),
                mode: BigInt(64),
                body: beginCell().store(storeSendUpdateProposal({
                    $$type: 'SendUpdateProposal',
                    proposalAddress: Address.parse(proposalAddr),
                    updateParams: {
                        $$type: 'Params',
                        proposalStartTime: BigInt(updateParams.proposalStartTime),
                        proposalEndTime: BigInt(updateParams.proposalEndTime),
                        proposalSnapshotTime: BigInt(updateParams.proposalSnapshotTime),
                        votingSystem: JSON.stringify(updateParams.votingSystem),
                        votingPowerStrategies: JSON.stringify(updateParams.votingPowerStrategies),
                        title: updateParams.title,
                        description: updateParams.description,
                        quorum: updateParams.quorum,
                        hide: updateParams.hide
                    }
                })).endCell(),
                code: null,
                data: null
            }
        }
    );
    
    return true;
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

    const daoState = await daoContract.getState();
    const owner = daoState.owner;

    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to set new owner");
        return false;
    }

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetOwner', newOwner: Address.parse(newOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getState, [], owner, 'owner') && owner.toString();
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

    const daoState = await daoContract.getState();
    const owner = daoState.owner;
    const proposalOwner = daoState.proposalOwner;

    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to create proposal");
        return false;
    }

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetProposalOwner', newProposalOwner: Address.parse(newProposalOwner)
        }
    );      
    
    return await waitForConditionChange(daoContract.getState, [], proposalOwner, 'proposalOwner') && newProposalOwner;
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

    const daoState = await daoContract.getState();
    const owner = daoState.owner;
    if (owner.toString() != sender.address.toString()) {        
        console.log("Only owner is allowed to set new new metadata");
        return false;
    }

    let metadtaAddr = (await daoContract.getState()).metadata;

    await daoContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'SetMetadata', newMetadata: Address.parse(newMetadataAddr)
        }
    );      
    
    return await waitForConditionChange(daoContract.getState, [], metadtaAddr, 'metadata') && owner.toString();
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

    await proposalContract.send(sender, { value: toNano(fee) }, 
        { 
            $$type: 'Vote', comment: msgBody
        }
    );      

    await waitForConditionChange(getSeqno, [client, sender.address.toString()], seqno);
}
