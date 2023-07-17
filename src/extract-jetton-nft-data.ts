import {Address, Slice, TonClient, TupleReader, toNano} from "ton";
import {Sha256} from "@aws-crypto/sha256-js";
import axios from "axios";
import {parseDict} from "ton-core/dist/dict/parseDict";
import {bitsToPaddedBuffer} from "ton-core/dist/boc/utils/paddedBits";
import { SendTransactionRequest, TonConnectUI } from "@tonconnect/ui-react";
import { waitForConditionChange, getSeqno, _transferJetton, _transferNft } from "./helpers";


type JettonMetaDataKeys =
    | "name"
    | "description"
    | "image"
    | "symbol"
    | "image_data"
    | "decimals";

const jettonOnChainMetadataSpec: {
    [key in JettonMetaDataKeys]: "utf8" | "ascii" | undefined;
} = {
    name: "utf8",
    description: "utf8",
    image: "ascii",
    decimals: "utf8",
    symbol: "utf8",
    image_data: undefined,
};

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;

const sha256 = (str: string) => {
    const sha = new Sha256();
    sha.update(str);
    return Buffer.from(sha.digestSync());
};

async function readContent(res: { gas_used: number; stack: TupleReader }) {
    const contentCell = res.stack.readCell()
    const contentSlice = contentCell.beginParse()

    switch (contentSlice.loadUint(8)) {
        case ONCHAIN_CONTENT_PREFIX:
            return {
                persistenceType: "onchain",
                ...parseJettonOnchainMetadata(contentSlice),
            };
        case OFFCHAIN_CONTENT_PREFIX:
            const {metadata, isIpfs} = await parseJettonOffchainMetadata(contentSlice);
            return {
                persistenceType: isIpfs ? "offchain_ipfs" : "offchain_private_domain",
                metadata,
            };
        default:
            throw new Error("Unexpected jetton metadata content prefix");
    }
}

export async function readNftMetadata(client: TonClient, address: string) {

    try {
        const nftCollectionAddress = Address.parse(address);
        const res = await client.runMethod(nftCollectionAddress, "get_collection_data");
        res.stack.skip(1);
    
        return await readContent(res); 

    } catch (err) {
        console.log(`failed to fetch nft metadata at address ${address}`);
        return {};        
    }
}

export async function readJettonMetadata(client: TonClient, address: string) {

    try {
        const jettonMinterAddress = Address.parse(address);
        const res = await client.runMethod( jettonMinterAddress, 'get_jetton_data');
        res.stack.skip(3);
    
        return await readContent(res);    
    } catch (err) {
        console.log(`failed to fetch jetton metadata`);
        return {};        
    }
}

export async function readJettonOrNftMetadata(client: TonClient, address: string) {

    const nftMetadata = await readNftMetadata(client, address);
    if (Object.keys(nftMetadata).length != 0) {
        (nftMetadata as any).type = 'NFT';
        return nftMetadata;
    };

    const jettonMetadata = await readJettonMetadata(client, address);
    if (Object.keys(jettonMetadata).length != 0) {
        (jettonMetadata as any).type = 'Jetton';
        return jettonMetadata;    
    }

    return {};
}

function parseJettonOnchainMetadata(contentSlice: Slice) : {
    metadata: { [s in JettonMetaDataKeys]?: string };
    isJettonDeployerFaultyOnChainData: boolean;
} {

    const toKey = (str: string) => BigInt(`0x${str}`)
    const KEYLEN = 256;

    let isJettonDeployerFaultyOnChainData = false;

    const dict = parseDict(contentSlice.loadRef().beginParse(), KEYLEN, (s) => {
        let buffer = Buffer.from("");

        const sliceToVal = (s: Slice, v: Buffer, isFirst: boolean) => {
            s.asCell().beginParse();
            if (isFirst && s.loadUint(8) !== SNAKE_PREFIX)
                throw new Error("Only snake format is supported");

            const bits = s.remainingBits
            const bytes = bitsToPaddedBuffer(s.loadBits(bits))
            v = Buffer.concat([v, bytes]);
            if (s.remainingRefs === 1) {
                v = sliceToVal(s.loadRef().beginParse(), v, false);
            }

            return v;
        };

        if (s.remainingRefs === 0) {
            isJettonDeployerFaultyOnChainData = true;
            return sliceToVal(s, buffer, true);
        }

        return sliceToVal(s.loadRef().beginParse(), buffer, true);
    })

    const res: { [s in JettonMetaDataKeys]?: string } = {};

    Object.keys(jettonOnChainMetadataSpec).forEach((k) => {
        const val = dict
            .get(toKey(sha256(k).toString("hex")))
            ?.toString(jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);
        if (val) res[k as JettonMetaDataKeys] = val;
    });
    return {
        metadata: res,
        isJettonDeployerFaultyOnChainData,
    };
}

async function parseJettonOffchainMetadata(contentSlice: Slice): Promise<{
    metadata: { [s in JettonMetaDataKeys]?: string };
    isIpfs: boolean;
}> {
    const bits = contentSlice.remainingBits
    const bytes = bitsToPaddedBuffer(contentSlice.loadBits(bits))
    const jsonURI = bytes
        .toString("ascii")
        .replace("ipfs://", "https://ipfs.io/ipfs/");

    return {
        metadata: (await axios.get(jsonURI)).data,
        isIpfs: /(^|\/)ipfs[.:]/.test(jsonURI),
    };
}


export async function transferJettons(
    client: TonClient,
    tonConnection: TonConnectUI,
    amount: bigint,
    jettonWalletAddress: string,
    toAddress: string
  ) {
    
    const fromAddress = tonConnection.account!.address;
    const seqno = await getSeqno(client, fromAddress.toString());
  
    const tx: SendTransactionRequest = {
      validUntil: Date.now() + 5 * 60 * 1000,
      messages: [
        {
          address: jettonWalletAddress,
          amount: toNano(0.05).toString(),
          stateInit: undefined,
          payload: _transferJetton(Address.parse(toAddress), Address.parse(fromAddress), amount)
            .toBoc()
            .toString("base64"),
        },
      ],
    };
  
    await tonConnection.sendTransaction(tx);
  
    await waitForConditionChange(getSeqno, [client, fromAddress.toString()], seqno);
}

export async function transferNft(
    client: TonClient,
    tonConnection: TonConnectUI,
    nftItemAddress: string,
    toAddress: string
  ) {
    
    const fromAddress = tonConnection.account!.address;
    const seqno = await getSeqno(client, fromAddress.toString());
  
    const tx: SendTransactionRequest = {
      validUntil: Date.now() + 5 * 60 * 1000,
      messages: [
        {
          address: nftItemAddress,
          amount: toNano(0.05).toString(),
          stateInit: undefined,
          payload: _transferNft(Address.parse(toAddress))
            .toBoc()
            .toString("base64"),
        },
      ],
    };
  
    await tonConnection.sendTransaction(tx);
  
    await waitForConditionChange(getSeqno, [client, fromAddress.toString()], seqno);
}
