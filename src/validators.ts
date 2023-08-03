import { Address, TonClient, TonClient4, Cell, TupleItem } from "ton";
import {parseDict} from "ton-core/dist/dict/parseDict";


const CONFIG_ADDR = 'Ef9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVbxn';
const ELECTOR_ADDR = 'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF';

// information about requirements for proposals to be considered as pass or fail
export async function getConfig11(client4: TonClient4, block: number, critical: number = 0) {

    let res = await client4.getConfig(block, [11]);
    // console.log(config_res);

    let config11 = parseDict(Cell.fromBoc(Buffer.from(res.config.cell, 'base64'))[0].beginParse(), 32, (slice) => {
        // console.log(slice);
        slice = slice.loadRef().beginParse();
        let prefix0 = slice.loadBits(8);

        if (critical) slice.loadRef().beginParse();
        slice = slice.loadRef().beginParse();

        return {
            prefix0: Number(prefix0),
            prefix1: Number(slice.loadBits(8)), 
            min_tot_rounds: Number(slice.loadBits(8)), 
            max_tot_rounds: Number(slice.loadBits(8)), 
            min_wins: Number(slice.loadBits(8)), 
            max_losses: Number(slice.loadBits(8)), 
            min_store_sec: parseInt(slice.loadBits(32).toString(), 16),
            max_store_sec: Number(slice.loadBits(32)), 
            bit_price: Number(slice.loadBits(32)), 
            cell_price: parseInt(slice.loadBits(32).toString(), 16)
        }
        
    });

    return config11.get(11n);
}

// information about validators in current validation cycle
export async function getConfig34(client4: TonClient4, block: number) {

    let res = await client4.getConfig(block, [34]);
    
    let config34 = parseDict(Cell.fromBoc(Buffer.from(res.config.cell, 'base64'))[0].beginParse(), 32, (slice) => {
        slice = slice.loadRef().beginParse();
        let start_bits = slice.loadBits(8);
        let utime_since = slice.loadUint(32);
        let utime_until = slice.loadUint(32);
        let total_validators = slice.loadUint(16);
        let main_validators = slice.loadUint(16);
        let total_weight = slice.loadUint(64);
        slice = slice.loadRef().beginParse();
        slice = slice.loadRef().beginParse();
        
        return {start_bits, utime_since, utime_until, total_validators, main_validators, total_weight};                
    });

    return config34.get(34n)
}

function votersTupleToArr(votersTuple: TupleItem) {

    if (votersTuple.type != 'tuple') return {}
    
    let votersArr: string[] = [];
    
    while (true) {
        
        let nextItem = votersTuple.items[0]
        if (nextItem.type == 'null') break;

        if (nextItem.type == 'int') votersArr.push(`${nextItem.value}`);

        if (votersTuple.items.length <= 1) break;
        if (votersTuple.items[1].type != 'tuple') break;
        votersTuple = votersTuple.items[1];
    }

    return votersArr;
}

export async function listProposal(client4: TonClient4, block: number, phash: string) {
    
    let res = await client4.runMethod(block, Address.parse(CONFIG_ADDR), 'list_proposals');
 
    let proposal: any = {};

    for (const r of res.result) {

        if (!('items' in r)) continue;
        
        for (const l of r.items) {
            if (!('items' in l)) continue;

            // @ts-ignore
            if (l.items[0].value != phash) continue;

            // @ts-ignore
            let unpacked_proposal = l.items[1].items;

            let expires = unpacked_proposal[0].value;
            let critical = unpacked_proposal[1].value;

            let param_id = unpacked_proposal[2].items[0].value;
            let param_val = unpacked_proposal[2].items[1].cell;
            let param_hash = unpacked_proposal[2].items[2].value;

            let vset_id = unpacked_proposal[3].value;
            
            let voters_list = votersTupleToArr(unpacked_proposal[4]);

            let weight_remaining = unpacked_proposal[5].value;
            let rounds_remaining = unpacked_proposal[6].value;

            let wins = unpacked_proposal[7].value;
            let losses = unpacked_proposal[8].value;

            proposal = {
                block,
                expires,
                critical,
                param_id,
                param_val,
                param_hash,
                vset_id,
                voters_list,
                weight_remaining,
                rounds_remaining,
                wins,
                losses
            };
        }
        
    }
    
    return proposal;    
}

async function findLastNonEmptyProposalsInRange(client4: TonClient4, block: number, range: number, phash: string): Promise<any> {
    let proposal = await listProposal(client4, block, phash);

    if (Object.keys(proposal).length !== 0) {
        return proposal;
    }

    console.log(`starting binary search for phash ${phash} on block ${block}`);
    
    let right = block - 1;
    let left = block - range;
    let mid: number;

    while (left <= right) {
        mid = Math.floor((left + right) / 2);

        let proposals = await listProposal(client4, mid, phash);

        if (Object.keys(proposals).length === 0) {
            right = mid - 1;
        } else {
           left = mid + 1;
        }
    }

    if (right >= block - range) {
        return await listProposal(client4, right, phash);
    } 
    
    return {};
}

export async function proposalResults(client4: TonClient4, phash: string, block: number = -1) {

    if (block == -1) block = (await client4.getLastBlock()).last.seqno;

    let config34 = await getConfig34(client4, block);
    if (!config34) return {};

    let proposal = await findLastNonEmptyProposalsInRange(client4, block, config34.utime_until - config34.utime_since, phash);

    if (!Object.keys(proposal).length) {
        return {}
    }

    if (proposal.block == block) {
        return {...proposal, config34} // still ongoing
    }

    // we didn't find the proposal on the given block, two scenarios are possible:
    // 1. proposal passed and deleted (after validator submitted the last vote)
    // 2. proposal did not pass and deleted (random ticktok)
    // we need to understand which of the 2 scenarios happened.
    // we will go to the end of last cycle and check if losses == max_losses -1 if this is the scenario we considered it as failed
    // there is still a possible race condition where random ticktok happened after the last validator voted on the new cycle
    // this is a rare case which can be handled by analyses of the config-code transactions. 
    let prevCycleEndBlock = await client4.getBlockByUtime(config34.utime_since - 1)

    const prevCycleProposals = await listProposal(client4, prevCycleEndBlock.shards[0].seqno, phash);

    let config11 = await getConfig11(client4, block);
        
    // we found the proposal in the previous cycle and the last cycle ended with losses = max_loss-1
    // in this case the previous cycle is considered another loss and to proposal was deleted by the tick to action
    // the proposal did not pass
    //@ts-ignore
    if (prevCycleProposals && (prevCycleProposals.losses == config11?.max_losses! - 1)) {
        proposal.losses += 1n;
    }
    else {
        proposal.wins += 1n;
    }

    return proposal;
}
