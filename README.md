# Ton.vote Contracts SDK
[TON.Vote](https://github.com/orbs-network/ton-vote) is a completely decentralized, on-chain DAO governance platform designed exclusively for the TON ecosystem.

This is an SDK for the Ton.vote [contracts](https://github.com/orbs-network/ton-vote-contracts). Anyone can use this SDK to interact with TON.vote contracts using typescript to create, update or fetch data from the chain.

To interact with the contracts you will need a JSON RPC client and a wallet (to send transactions). 
You can use this SDK to get a JSON RPC client which uses [TON-Access](https://github.com/orbs-network/ton-access) as a decentralized RPC. 

# Getters
The getter functions in this SDK are used to retrieve data from existing contracts. These functions allow users to fetch information about DAOs, proposals and other data stored in the contracts, providing a convenient way to interact with the TON.vote ecosystem.

## getRegistry
Returns the contract registry. This is the contracts entrypoint used to register new daos.

## getDaos
This function retrieves the list of all registered DAOs from the TON blockchain using the provided TonClient. The list of DAOs can be returned in ascending or descending order, sorted by their creation time.

If you're using this SDK from a server, it might be more convenient to retrieve DAOs in ascending order. This way, you can fetch only the newest DAOs during each interval by using the `endDaoId` returned by the function in the previous call. The function will then return all DAOs created from the provided `endDaoId`.

On the other hand, fetching DAOs in descending order might be useful if you need the list sorted from oldest to newest. However, appending new DAOs to the list can be more complicated.

The DAOs are fetched in batches, with a default `batchSize` of 100 DAOs per batch. The function returns a Promise with the `endDaoId` that will be used for the next call and `daoAddresses`, which is a list of all DAO addresses.

## getDaoMetadata
This function retrieves the metadata associated with the provided DAO address, `daoAddr`. The DAO metadata consists of information such as the logo, title, and social links. 

## getDaoRoles
There are two types of administrators for every DAO:

1. DAO space owner: This owner has the highest level of permissions and can change owners, update DAO metadata, or create new proposals.

2. Proposal publisher: This administrator can create new proposals, but cannot change the DAO metadata or affect roles.

These administrators are set when the DAO is created and can be retrieved using this function.

## getDaoIndex
When sending a create transaction to the registry contract a new dao is created with a decidated `daoId`. The `daoId` is a unique and increased in ascending order by the registry contract. This function can be used to retrieve the `daoId` at a given address `daoAddr`

## getDaoProposals
This function retrieves all the proposal addresses for a given DAO. The proposals can be returned in ascending or descending order based on their creation time. By default, the proposals are returned in ascending order, which is more convenient to retrieve new proposals. The function can be used to access the proposals using the `nextId` returned by the function in the previous call. When used in conjunction with the `nextId`, the function will return all proposals created after the provided `nextId`.

The proposals are fetched in batches using the provided TonClient and batchSize, which has a default value of 100 proposals per batch. The function returns a Promise with the endProposalId that will be used for the next call and proposalAddresses, which is a list of all the proposal addresses.

## getProposalMetadata
This function retrieves the metadata for a given proposal, including its ID, start and end times, voting system, and more. It uses both Ton Client V2 and V4, with V4 used to fetch the state at a specified old block (snapshot block), which is provided when creating the proposal. The function returns a Promise containing the `ProposalMetadata`.

# Setters
In order to send transaction to the chain you will need to contruct a `Sender` object which will use your wallet to send transactions. 

This is an example of creating a Sender object from our [UI](https://github.com/orbs-network/ton-vote) app:
```
export const useGetSender = () => {
  const { address } = useConnection();

  return useCallback((): Sender => {
    if (!address) {
      throw new Error("Not connected");
    }

    const init = (init: any) => {
      const result = init
        ? beginCell()
            .store(storeStateInit(init))
            .endCell()
            .toBoc({ idx: false })
            .toString("base64")
        : undefined;

      return result;
    };

    return {
      address: Address.parse(address!),
      async send(args: SenderArguments) {
        await TON_CONNECTOR.sendTransaction({
          validUntil: Date.now() + 5 * 60 * 1000,
          messages: [
            {
              address: args.to.toString(),
              amount: args.value.toString(),
              stateInit: init(args.init),
              payload: args.body
                ? args.body.toBoc().toString("base64")
                : undefined,
            },
          ],
        });
      },
    };
  }, [address]);
};
```

## newMetdata
The dao metadata is stored in a seperate contract which should facilitates future changes and upgrades of the metadata. 
Before creating a new dao, metadata contract should be deployed to the chain. 
This function receives `Sender`, `TonClient`, `MetadataArgs` and returns a Promise with the metadta address as a string on success or boolean on failure. 

## newDao
This function is used to create a new DAO. Anyone can create a Dao, however, to prevent DDoS attacks on the system, there is a small fee associated with creating a new DAO.

To create a new Dao, you need to provide several parameters: `Sender`, which represents the account sending the transaction.`TonClient`, which provides access to the TON network. `metadataAddr` which is the address of the metadata contract create by `newMetadata`, `ownerAddr` which is the address of the DAO space owner with full permissions to manage the DAO, and `proposalOwner`which is the address of the proposal publisher who can create new proposals without affecting the DAO metadata or roles.

The function returns a Promise with the dao address as a string on success or boolean on failure. 

## newProposal
Create a new proposal for a specific dao with a given `ProposalMetadata`. The propsoal contract stores all the propsal metadata. In case of major changes to the metadata, the proposal contract will be upgraded and the client should reflect these changes but it will not effect the dao contract. Ton.vote [contracts](https://github.com/orbs-network/ton-vote-contracts) describes the contracts architecture.

The function returns a Promise with the proposal address as a string on success or boolean on failure. 

## daoSetOwner
Used to update the dao owner. Only the daoOwner can use this method.
The function receive `Sender` which should be the daoOwner, `TonClient`, `daoAddr` which is the address of the dao to be updated and a string `newOwner` which is the new owner of the dao.

The function returns a Promise with the new owner address as a string on success or boolean on failure. 

## daoSetProposalOwner
Used to update the dao proposal owner which is used to create new proposals. Only the daoOwner can call this method.
The function receive `Sender` which should be the daoOwner, `TonClient`, `daoAddr` which is the address of the dao to be updated and a string `newProposalOwner` which is the new proposal owner.

The function returns a Promise with the new proposal owner address as a string on success or boolean on failure. 

## proposalSendMessage
This function allows a voter to cast their vote on a proposal by sending a message to the proposal contract. The function requires several parameters, including `Sender`, which represents the voter's wallet address, `TonClient`, `proposalAddr`, which is the address of the proposal to be voted on, `msgValue`, which is the value to be sent with the message and will be deducted from the voter's wallet (this serves as the vote fee as all votes are currently on-chain), and `msgBody`, which represents the comment or vote to be sent to the contract. For example, a `msgBody` of "yes" would represent a "yes" vote on the proposal.

The function returns a boolean indicating whether the transaction was successful or not.