import { Address, TonClient4, toNano } from "ton";
import _ from "lodash";
import { ProposalMetadata, VotingPowerStrategyType } from "../interfaces";
import {cellToAddress, intToTupleItem } from "../helpers";
import { extractValueFromStrategy } from "./common";


export async function getAllNftHolders(clientV4: TonClient4, proposalMetadata: ProposalMetadata): Promise<{ [key: string]: number } > {

  let allNftItemsHolders: { [key: string]: number } = {};
  const nftAddress = extractValueFromStrategy(proposalMetadata.votingPowerStrategies, VotingPowerStrategyType.NftCcollection, 'nft-address');
  let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(nftAddress!), 'get_collection_data');

  if (!res.result.length) {
    console.log('nft collection not exists for proposal with metadata: ', proposalMetadata);
    return allNftItemsHolders;
  }
    
  if (res.result[0].type != 'int') {
    console.log('Error: could not extract next-item-value from nft collection (type error)');
    return allNftItemsHolders;
  }

  const nextItemIndex = Number(res.result[0].value);

  const batchSize = 100; // set the batch size
  const batches = Math.ceil(nextItemIndex / batchSize); // calculate the number of batches
  
  console.log(`fetching ${nextItemIndex} nft items (batche size = ${batchSize})`);
  
  for (let i = 0; i < batches; i++) {

    const batchStartIndex = i * batchSize;
    const batchEndIndex = Math.min((i + 1) * batchSize, nextItemIndex);
  
    await Promise.all(Array.from({ length: batchEndIndex - batchStartIndex }, (_, j) => {
      const index = batchStartIndex + j;
      return (async () => {
        let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(nftAddress!), 'get_nft_address_by_index', intToTupleItem(index));
        
        if (res.result[0].type != 'slice') {
          console.log(`unexpected result type from runMethod on get_nft_address_by_index on address: ${nftAddress} at block ${proposalMetadata.mcSnapshotBlock}`);
          return;
        }
    
        let nftItemAddress = cellToAddress(res.result[0].cell);
              
        res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, nftItemAddress, 'get_nft_data');
    
        if (res.result[3].type != 'slice') {
          console.log(`unexpected result type from runMethod on get_nft_data on address: ${nftAddress} at block ${proposalMetadata.mcSnapshotBlock}`);
          return;
        }

        const address = cellToAddress(res.result[3].cell).toString();
        if (allNftItemsHolders.hasOwnProperty(address)) {
          allNftItemsHolders[address] += 1;
        } else {
          allNftItemsHolders[address] = 1;
        }

      })();
    }));
  }
  
  return allNftItemsHolders;
}

export async function getSingleVoterPower(voter: string, allNftItemsHolders: { [key: string]: number }): Promise<string> {
  return (toNano(allNftItemsHolders[voter] || 0)).toString()
}
