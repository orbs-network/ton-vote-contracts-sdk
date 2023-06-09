import { Address, TonClient4 } from "ton";
import _ from "lodash";
import { ProposalMetadata, VotingPowerStrategyType } from "../interfaces";
import {addressStringToTupleItem, cellToAddress } from "../helpers";
import {extractValueFromStrategy} from "./common"


export async function getSingleVoterPower(clientV4: TonClient4, voter: string, proposalMetadata: ProposalMetadata): Promise<string> {

  const jettonAddress = extractValueFromStrategy(proposalMetadata.votingPowerStrategies, VotingPowerStrategyType.JettonBalance, 'jetton-address');

  try {

    let res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, Address.parse(jettonAddress!), 'get_wallet_address', addressStringToTupleItem(voter));
    
    if (res.result[0].type != 'slice') {
        return '0';
    }
    
    const jettonWalletAddress = cellToAddress(res.result[0].cell);

    res = await clientV4.runMethod(proposalMetadata.mcSnapshotBlock, jettonWalletAddress, 'get_wallet_data');
        
    if (res.result[0].type != 'int') {
        return '0';
    }
        
    return res.result[0].value.toString();

  } catch {

    return '0'
  }

}
