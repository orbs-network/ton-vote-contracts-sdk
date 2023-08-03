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

export async function listProposals(client4: TonClient4, block: number) {
    
    let res = await client4.runMethod(block, Address.parse(CONFIG_ADDR), 'list_proposals');
 
    let proposals: any = {};

    for (const r of res.result) {

        if (!('items' in r)) continue;
        
        for (const l of r.items) {
            if (!('items' in l)) continue;

            // @ts-ignore
            let phash = l.items[0].value;
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

            proposals[phash] = {
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
    
    return proposals;    
}

export async function proposalResults(client4: TonClient4, block: number, phash: string) {

    let config34 = await getConfig34(client4, block);
    let proposals = await listProposals(client4, block);
    
    if (phash in proposals) {
        return {...proposals[phash], ...config34}
    }

    if (!config34) return {};

    let prevCycleLastBlock = await client4.getBlockByUtime(config34.utime_since)
    console.log({prevCycleLastBlock});    
    console.log(prevCycleLastBlock.shards);

    const prevCycleProposals = await listProposals(client4, prevCycleLastBlock.shards[0].seqno - 1);

    let config11 = await getConfig11(client4, block);
    
    //@ts-ignore
    if (phash in prevCycleProposals && prevCycleLastBlock[phash].losses == config11?.max_losses! - 1) {
        proposals[phash].losses += 1;
    } else {
        console.log(proposals);
        
        // proposals[phash].wins += 1;
    }
    
    return proposals[phash]

}
