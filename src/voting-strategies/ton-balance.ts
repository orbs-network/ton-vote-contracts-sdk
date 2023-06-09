import { Address, TonClient4 } from "ton";
import _ from "lodash";
import { ProposalMetadata } from "../interfaces";


export async function getSingleVoterPower(clientV4: TonClient4, voter: string, proposalMetadata: ProposalMetadata): Promise<string> {

  return (
    await clientV4.getAccountLite(
      proposalMetadata.mcSnapshotBlock,
      Address.parse(voter)
    )
  ).account.balance.coins;
}
