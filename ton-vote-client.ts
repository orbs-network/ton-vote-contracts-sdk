// ton.vote TypeScript API

class TonVote {
  constructor(config: Config);
  // read
  async getDaos(): DaoMetadata[];
  async getDao(daoId: string): DaoMetadata;
  async getActiveProposals(daoId: string): Proposal[];
  async getEndedProposals(daoId: string): EndedProposal[];
  async getProposal(proposalId: string): Proposal;
  async getProposalResult(proposalId: string): Result;
  async getRecentVotes(proposalId: string): Vote[];
  // write
  async registerDao(metadata: DaoMetadata): string; // TBD
  async submitProposal(proposal: Proposal);
  async submitVote(vote: Vote);
  // low level for proofs (unstable)
  async getValidators(): Validator[];
  async getAllDaosBlockUri(timestamp: number): BlockUri;
  async getAllDaosBlock(blockUri: BlockUri): AllDaosBlock;
  async getDaoActivityBlock(blockUri: BlockUri): DaoActivityBlock;
}

interface Config {
  network?: "mainnet" | "testnet";
}

interface DaoMetadata {
  daoId: string;
  tokens: Token[];
  name: string;
  logoUri: string;
  tonDomain: string;
  website: string;
  telegram: string;
}

interface Token {
  type: "jetton" | "nft";
  contractAddress: string;
}

interface Proposal {
  daoId: string;
  proposalId: string;
  strategyId: string;
  timestamp: number;
  duration: number;
  description: string;
  choices: Choice[];
  choiceFormat: "single" | "multiple" | "ranked" | "weighted";
  snapshotLogicalTime: number;
  snapshotStateRoot: string;
  proposerPublicKey: string;
  proposerSignature: string;
}

interface Choice {
  choiceId: string;
  description: string;
}

interface Selection {
  choiceId: string;
  weight: number;
}

interface Balance {
  token: Token;
  balance: string;
  properties?: { [field: string]: string }[];
}

interface Vote {
  daoId: string;
  proposalId: string;
  timestamp: number;
  selection: Selection[];
  balances: Balance[];
  balanceMerkleProofs: string[];
  voterPublicKey: string;
  voterSignature: string;
}

interface Result {
  daoId: string;
  proposalId: string;
  timestamp: number;
  percentage: { [choiceId: string]: number };
  validatorSignatures: { [validatorPublicKey: string]: string };
}

interface EndedProposal {
  proposal: Proposal;
  result: Result;
}

interface Validator {
  address: string;
  publicKey: string;
}

// unstable

interface BlockUri {
  type: "ipfs" | "tonstorage";
  uri: string;
}

interface AllDaosBlock {
  blockUri: BlockUri;
  timestamp: number;
  latestActivityBlockUri: { [daoId: string]: BlockUri };
}

interface DaoActivityBlock {
  blockUri: BlockUri;
  timestamp: number;
  daoId: string;
  proposals: Proposal[];
  votes: Vote[];
  results: Result[];
}
