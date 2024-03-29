import { 
    Cell,
    Slice, 
    Address, 
    Builder, 
    beginCell, 
    ComputeError, 
    TupleItem, 
    TupleReader, 
    Dictionary, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    Contract, 
    ContractABI, 
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from 'ton-core';

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    let sc_0 = slice;
    let _code = sc_0.loadRef();
    let _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function storeTupleStateInit(source: StateInit) {
    let builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounced: boolean;
    sender: Address;
    value: bigint;
    raw: Cell;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounced);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw);
    };
}

export function loadContext(slice: Slice) {
    let sc_0 = slice;
    let _bounced = sc_0.loadBit();
    let _sender = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _raw = sc_0.loadRef();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function storeTupleContext(source: Context) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounced);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw);
    return builder.build();
}

function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    bounce: boolean;
    to: Address;
    value: bigint;
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounce);
        b_0.storeAddress(src.to);
        b_0.storeInt(src.value, 257);
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
    };
}

export function loadSendParameters(slice: Slice) {
    let sc_0 = slice;
    let _bounce = sc_0.loadBit();
    let _to = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _mode = sc_0.loadIntBig(257);
    let _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function storeTupleSendParameters(source: SendParameters) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounce);
    builder.writeAddress(source.to);
    builder.writeNumber(source.value);
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function storeTupleDeploy(source: Deploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function storeTupleDeployOk(source: DeployOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function storeTupleFactoryDeploy(source: FactoryDeploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwner = {
    $$type: 'ChangeOwner';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwner(src: ChangeOwner) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2174598809, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwner(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2174598809) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadTupleChangeOwner(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

function storeTupleChangeOwner(source: ChangeOwner) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

function dictValueParserChangeOwner(): DictionaryValue<ChangeOwner> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeChangeOwner(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwner(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwnerOk = {
    $$type: 'ChangeOwnerOk';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwnerOk(src: ChangeOwnerOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(846932810, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwnerOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 846932810) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

function loadTupleChangeOwnerOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

function storeTupleChangeOwnerOk(source: ChangeOwnerOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

function dictValueParserChangeOwnerOk(): DictionaryValue<ChangeOwnerOk> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeChangeOwnerOk(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwnerOk(src.loadRef().beginParse());
        }
    }
}

export type DeployAndInitProposal = {
    $$type: 'DeployAndInitProposal';
    body: Params;
}

export function storeDeployAndInitProposal(src: DeployAndInitProposal) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1496883659, 32);
        b_0.store(storeParams(src.body));
    };
}

export function loadDeployAndInitProposal(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1496883659) { throw Error('Invalid prefix'); }
    let _body = loadParams(sc_0);
    return { $$type: 'DeployAndInitProposal' as const, body: _body };
}

function loadTupleDeployAndInitProposal(source: TupleReader) {
    const _body = loadTupleParams(source.readTuple());
    return { $$type: 'DeployAndInitProposal' as const, body: _body };
}

function storeTupleDeployAndInitProposal(source: DeployAndInitProposal) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleParams(source.body));
    return builder.build();
}

function dictValueParserDeployAndInitProposal(): DictionaryValue<DeployAndInitProposal> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeDeployAndInitProposal(src)).endCell());
        },
        parse: (src) => {
            return loadDeployAndInitProposal(src.loadRef().beginParse());
        }
    }
}

export type SendProposalInit = {
    $$type: 'SendProposalInit';
    body: Params;
}

export function storeSendProposalInit(src: SendProposalInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2746622614, 32);
        b_0.store(storeParams(src.body));
    };
}

export function loadSendProposalInit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2746622614) { throw Error('Invalid prefix'); }
    let _body = loadParams(sc_0);
    return { $$type: 'SendProposalInit' as const, body: _body };
}

function loadTupleSendProposalInit(source: TupleReader) {
    const _body = loadTupleParams(source.readTuple());
    return { $$type: 'SendProposalInit' as const, body: _body };
}

function storeTupleSendProposalInit(source: SendProposalInit) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleParams(source.body));
    return builder.build();
}

function dictValueParserSendProposalInit(): DictionaryValue<SendProposalInit> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeSendProposalInit(src)).endCell());
        },
        parse: (src) => {
            return loadSendProposalInit(src.loadRef().beginParse());
        }
    }
}

export type SendUpdateProposal = {
    $$type: 'SendUpdateProposal';
    proposalAddress: Address;
    updateParams: Params;
}

export function storeSendUpdateProposal(src: SendUpdateProposal) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2568858687, 32);
        b_0.storeAddress(src.proposalAddress);
        b_0.store(storeParams(src.updateParams));
    };
}

export function loadSendUpdateProposal(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2568858687) { throw Error('Invalid prefix'); }
    let _proposalAddress = sc_0.loadAddress();
    let _updateParams = loadParams(sc_0);
    return { $$type: 'SendUpdateProposal' as const, proposalAddress: _proposalAddress, updateParams: _updateParams };
}

function loadTupleSendUpdateProposal(source: TupleReader) {
    let _proposalAddress = source.readAddress();
    const _updateParams = loadTupleParams(source.readTuple());
    return { $$type: 'SendUpdateProposal' as const, proposalAddress: _proposalAddress, updateParams: _updateParams };
}

function storeTupleSendUpdateProposal(source: SendUpdateProposal) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.proposalAddress);
    builder.writeTuple(storeTupleParams(source.updateParams));
    return builder.build();
}

function dictValueParserSendUpdateProposal(): DictionaryValue<SendUpdateProposal> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeSendUpdateProposal(src)).endCell());
        },
        parse: (src) => {
            return loadSendUpdateProposal(src.loadRef().beginParse());
        }
    }
}

export type Params = {
    $$type: 'Params';
    proposalStartTime: bigint;
    proposalEndTime: bigint;
    proposalSnapshotTime: bigint;
    votingSystem: string;
    votingPowerStrategies: string;
    title: string;
    description: string;
    quorum: string;
    hide: boolean;
}

export function storeParams(src: Params) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(src.proposalStartTime, 64);
        b_0.storeUint(src.proposalEndTime, 64);
        b_0.storeUint(src.proposalSnapshotTime, 64);
        b_0.storeStringRefTail(src.votingSystem);
        b_0.storeStringRefTail(src.votingPowerStrategies);
        b_0.storeStringRefTail(src.title);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.description);
        b_1.storeStringRefTail(src.quorum);
        b_1.storeBit(src.hide);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadParams(slice: Slice) {
    let sc_0 = slice;
    let _proposalStartTime = sc_0.loadUintBig(64);
    let _proposalEndTime = sc_0.loadUintBig(64);
    let _proposalSnapshotTime = sc_0.loadUintBig(64);
    let _votingSystem = sc_0.loadStringRefTail();
    let _votingPowerStrategies = sc_0.loadStringRefTail();
    let _title = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _description = sc_1.loadStringRefTail();
    let _quorum = sc_1.loadStringRefTail();
    let _hide = sc_1.loadBit();
    return { $$type: 'Params' as const, proposalStartTime: _proposalStartTime, proposalEndTime: _proposalEndTime, proposalSnapshotTime: _proposalSnapshotTime, votingSystem: _votingSystem, votingPowerStrategies: _votingPowerStrategies, title: _title, description: _description, quorum: _quorum, hide: _hide };
}

function loadTupleParams(source: TupleReader) {
    let _proposalStartTime = source.readBigNumber();
    let _proposalEndTime = source.readBigNumber();
    let _proposalSnapshotTime = source.readBigNumber();
    let _votingSystem = source.readString();
    let _votingPowerStrategies = source.readString();
    let _title = source.readString();
    let _description = source.readString();
    let _quorum = source.readString();
    let _hide = source.readBoolean();
    return { $$type: 'Params' as const, proposalStartTime: _proposalStartTime, proposalEndTime: _proposalEndTime, proposalSnapshotTime: _proposalSnapshotTime, votingSystem: _votingSystem, votingPowerStrategies: _votingPowerStrategies, title: _title, description: _description, quorum: _quorum, hide: _hide };
}

function storeTupleParams(source: Params) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.proposalStartTime);
    builder.writeNumber(source.proposalEndTime);
    builder.writeNumber(source.proposalSnapshotTime);
    builder.writeString(source.votingSystem);
    builder.writeString(source.votingPowerStrategies);
    builder.writeString(source.title);
    builder.writeString(source.description);
    builder.writeString(source.quorum);
    builder.writeBoolean(source.hide);
    return builder.build();
}

function dictValueParserParams(): DictionaryValue<Params> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeParams(src)).endCell());
        },
        parse: (src) => {
            return loadParams(src.loadRef().beginParse());
        }
    }
}

export type ProposalInit = {
    $$type: 'ProposalInit';
    body: Params;
}

export function storeProposalInit(src: ProposalInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1008560988, 32);
        b_0.store(storeParams(src.body));
    };
}

export function loadProposalInit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1008560988) { throw Error('Invalid prefix'); }
    let _body = loadParams(sc_0);
    return { $$type: 'ProposalInit' as const, body: _body };
}

function loadTupleProposalInit(source: TupleReader) {
    const _body = loadTupleParams(source.readTuple());
    return { $$type: 'ProposalInit' as const, body: _body };
}

function storeTupleProposalInit(source: ProposalInit) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleParams(source.body));
    return builder.build();
}

function dictValueParserProposalInit(): DictionaryValue<ProposalInit> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeProposalInit(src)).endCell());
        },
        parse: (src) => {
            return loadProposalInit(src.loadRef().beginParse());
        }
    }
}

export type Vote = {
    $$type: 'Vote';
    comment: string;
}

export function storeVote(src: Vote) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2084703906, 32);
        b_0.storeStringRefTail(src.comment);
    };
}

export function loadVote(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2084703906) { throw Error('Invalid prefix'); }
    let _comment = sc_0.loadStringRefTail();
    return { $$type: 'Vote' as const, comment: _comment };
}

function loadTupleVote(source: TupleReader) {
    let _comment = source.readString();
    return { $$type: 'Vote' as const, comment: _comment };
}

function storeTupleVote(source: Vote) {
    let builder = new TupleBuilder();
    builder.writeString(source.comment);
    return builder.build();
}

function dictValueParserVote(): DictionaryValue<Vote> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeVote(src)).endCell());
        },
        parse: (src) => {
            return loadVote(src.loadRef().beginParse());
        }
    }
}

export type UpdateProposal = {
    $$type: 'UpdateProposal';
    updateParams: Params;
}

export function storeUpdateProposal(src: UpdateProposal) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(817223820, 32);
        b_0.store(storeParams(src.updateParams));
    };
}

export function loadUpdateProposal(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 817223820) { throw Error('Invalid prefix'); }
    let _updateParams = loadParams(sc_0);
    return { $$type: 'UpdateProposal' as const, updateParams: _updateParams };
}

function loadTupleUpdateProposal(source: TupleReader) {
    const _updateParams = loadTupleParams(source.readTuple());
    return { $$type: 'UpdateProposal' as const, updateParams: _updateParams };
}

function storeTupleUpdateProposal(source: UpdateProposal) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleParams(source.updateParams));
    return builder.build();
}

function dictValueParserUpdateProposal(): DictionaryValue<UpdateProposal> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeUpdateProposal(src)).endCell());
        },
        parse: (src) => {
            return loadUpdateProposal(src.loadRef().beginParse());
        }
    }
}

export type ProposalContractState = {
    $$type: 'ProposalContractState';
    proposalDeployer: Address;
    id: bigint;
    proposalStartTime: bigint;
    proposalEndTime: bigint;
    proposalSnapshotTime: bigint;
    votingSystem: string;
    votingPowerStrategies: string;
    title: string;
    description: string;
    quorum: string;
    hide: boolean;
}

export function storeProposalContractState(src: ProposalContractState) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.proposalDeployer);
        b_0.storeUint(src.id, 32);
        b_0.storeUint(src.proposalStartTime, 64);
        b_0.storeUint(src.proposalEndTime, 64);
        b_0.storeUint(src.proposalSnapshotTime, 64);
        b_0.storeStringRefTail(src.votingSystem);
        b_0.storeStringRefTail(src.votingPowerStrategies);
        b_0.storeStringRefTail(src.title);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.description);
        b_1.storeStringRefTail(src.quorum);
        b_1.storeBit(src.hide);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadProposalContractState(slice: Slice) {
    let sc_0 = slice;
    let _proposalDeployer = sc_0.loadAddress();
    let _id = sc_0.loadUintBig(32);
    let _proposalStartTime = sc_0.loadUintBig(64);
    let _proposalEndTime = sc_0.loadUintBig(64);
    let _proposalSnapshotTime = sc_0.loadUintBig(64);
    let _votingSystem = sc_0.loadStringRefTail();
    let _votingPowerStrategies = sc_0.loadStringRefTail();
    let _title = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _description = sc_1.loadStringRefTail();
    let _quorum = sc_1.loadStringRefTail();
    let _hide = sc_1.loadBit();
    return { $$type: 'ProposalContractState' as const, proposalDeployer: _proposalDeployer, id: _id, proposalStartTime: _proposalStartTime, proposalEndTime: _proposalEndTime, proposalSnapshotTime: _proposalSnapshotTime, votingSystem: _votingSystem, votingPowerStrategies: _votingPowerStrategies, title: _title, description: _description, quorum: _quorum, hide: _hide };
}

function loadTupleProposalContractState(source: TupleReader) {
    let _proposalDeployer = source.readAddress();
    let _id = source.readBigNumber();
    let _proposalStartTime = source.readBigNumber();
    let _proposalEndTime = source.readBigNumber();
    let _proposalSnapshotTime = source.readBigNumber();
    let _votingSystem = source.readString();
    let _votingPowerStrategies = source.readString();
    let _title = source.readString();
    let _description = source.readString();
    let _quorum = source.readString();
    let _hide = source.readBoolean();
    return { $$type: 'ProposalContractState' as const, proposalDeployer: _proposalDeployer, id: _id, proposalStartTime: _proposalStartTime, proposalEndTime: _proposalEndTime, proposalSnapshotTime: _proposalSnapshotTime, votingSystem: _votingSystem, votingPowerStrategies: _votingPowerStrategies, title: _title, description: _description, quorum: _quorum, hide: _hide };
}

function storeTupleProposalContractState(source: ProposalContractState) {
    let builder = new TupleBuilder();
    builder.writeAddress(source.proposalDeployer);
    builder.writeNumber(source.id);
    builder.writeNumber(source.proposalStartTime);
    builder.writeNumber(source.proposalEndTime);
    builder.writeNumber(source.proposalSnapshotTime);
    builder.writeString(source.votingSystem);
    builder.writeString(source.votingPowerStrategies);
    builder.writeString(source.title);
    builder.writeString(source.description);
    builder.writeString(source.quorum);
    builder.writeBoolean(source.hide);
    return builder.build();
}

function dictValueParserProposalContractState(): DictionaryValue<ProposalContractState> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeProposalContractState(src)).endCell());
        },
        parse: (src) => {
            return loadProposalContractState(src.loadRef().beginParse());
        }
    }
}

 type ProposalDeployer_init_args = {
    $$type: 'ProposalDeployer_init_args';
    dao: Address;
}

function initProposalDeployer_init_args(src: ProposalDeployer_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeAddress(src.dao);
    };
}

async function ProposalDeployer_init(dao: Address) {
    const __code = Cell.fromBase64('te6ccgECHwEABRgAART/APSkE/S88sgLAQIBYgIDAtTQAdDTAwFxsKMB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFRQUwNvBPhhAvhi2zxa2zzy4ILI+EMBzH8BygBZWSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFssfye1UHAQCASAODwSGAZIwf+BwIddJwh+VMCDXCx/eIIIQWTihy7qPFTDTHwGCEFk4ocu68uCB2zxsGds8f+AgghCZHaw/uuMCghCUapi2ugkFBgcE9oE0W/hCUsDHBfL0VBqQ2zxccFnIcAHLAXMBywFwAcsAEszMyfkAyHIBywFwAcsAEsoHy//J0CDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IhVVXBwUN+AQA/IVYCCEDwda1xQCssfCds8yRYVEEgQN1ByEEYQRds8ARMKDAgDxjDTHwGCEJkdrD+68uCB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHbPBCabBqCAMQm+EJS0McF8vRVUnBwUKmAQAnIVYCCEDC12IxQCssfCds8yRAkECNtbds8fwkKDAFYjqfTHwGCEJRqmLa68uCB0z8BMcgBghCv+Q9XWMsfyz/J+EIBcG3bPH/gMHALAAKkAFjTP9M/0z/UAdAB1AHQAdQB0AHUAdDUAdAB1AHQAdIAMBA5EDgQNxA2EDUQNABuUInLPxbLPxTLP8hQA88WyVjMyFjPFskBzMhYzxbJAczIyFADzxbJWMzIUAPPFslYzBLKAMkBzAE6bW0ibrOZWyBu8tCAbyIBkTLiECRwAwSAQlAj2zwMAcrIcQHKAVAHAcoAcAHKAlAFINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUAP6AnABymgjbrORf5MkbrPilzMzAXABygDjDSFus5x/AcoAASBu8tCAAcyVMXABygDiyQH7AA0AmH8BygDIcAHKAHABygAkbrOdfwHKAAQgbvLQgFAEzJY0A3ABygDiJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4nABygACfwHKAALJWMwCAW4QEQIBIBYXAhOz4LbPFjbPGwhgHBICEbMuds82zxsIYBwVAYbbPHBZyHABywFzAcsBcAHLABLMzMn5AMhyAcsBcAHLABLKB8v/ydAg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIEwEO+EP4KFjbPBQAogLQ9AQwbQGBMS4BgBD0D2+h8uCHAYExLiICgBD0F8gByPQAyQHMcAHKAEADWSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFoEBAc8AyQACIAC5u70YJwXOw9XSyuex6E7DnWSoUbZoJwndY1LStkfLMi068t/fFiOYJwIFXAG4BnY5TOWDquRyWyw4JwG9Sd75VFlvHHU9PeBVnDJoJwnZdOWrNOy3M6DpZtlGbopIAgEgGBkCASAaGwIRtF87Z5tnjYQwHB0AEbCvu1E0NIAAYAB1sm7jQ1aXBmczovL1FtWjgzeW5pN2dxM1oydXMyVEVVQUFDN0xkVTc1cVV1d2d5ZmhxM1N4eENZdzeCABwO1E0NQB+GPSAAGOJfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB0x9ZbBLg+CjXCwqDCbry4In6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdHbPB4AAiEAAnA=');
    const __system = Cell.fromBase64('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');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initProposalDeployer_init_args({ $$type: 'ProposalDeployer_init_args', dao })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const ProposalDeployer_errors: { [key: number]: { message: string } } = {
    2: { message: `Stack undeflow` },
    3: { message: `Stack overflow` },
    4: { message: `Integer overflow` },
    5: { message: `Integer out of expected range` },
    6: { message: `Invalid opcode` },
    7: { message: `Type check error` },
    8: { message: `Cell overflow` },
    9: { message: `Cell underflow` },
    10: { message: `Dictionary error` },
    13: { message: `Out of gas error` },
    32: { message: `Method ID not found` },
    34: { message: `Action is invalid or not supported` },
    37: { message: `Not enough TON` },
    38: { message: `Not enough extra-currencies` },
    128: { message: `Null reference exception` },
    129: { message: `Invalid serialization prefix` },
    130: { message: `Invalid incoming message` },
    131: { message: `Constraints error` },
    132: { message: `Access denied` },
    133: { message: `Contract stopped` },
    134: { message: `Invalid argument` },
    135: { message: `Code of a contract was not found` },
    136: { message: `Invalid address` },
    137: { message: `Masterchain support is not enabled for this contract` },
    2977: { message: `Already initialized` },
    4429: { message: `Invalid sender` },
    8923: { message: `Update proposals is possible only before start time` },
    13403: { message: `only dao can send create proposal message` },
    50214: { message: `only dao can send update proposal message` },
    52334: { message: `Incative proposal` },
    61278: { message: `Propsal was not initialized yet` },
}

const ProposalDeployer_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwner","header":2174598809,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwnerOk","header":846932810,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"DeployAndInitProposal","header":1496883659,"fields":[{"name":"body","type":{"kind":"simple","type":"Params","optional":false}}]},
    {"name":"SendProposalInit","header":2746622614,"fields":[{"name":"body","type":{"kind":"simple","type":"Params","optional":false}}]},
    {"name":"SendUpdateProposal","header":2568858687,"fields":[{"name":"proposalAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"updateParams","type":{"kind":"simple","type":"Params","optional":false}}]},
    {"name":"Params","header":null,"fields":[{"name":"proposalStartTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"proposalEndTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"proposalSnapshotTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"votingSystem","type":{"kind":"simple","type":"string","optional":false}},{"name":"votingPowerStrategies","type":{"kind":"simple","type":"string","optional":false}},{"name":"title","type":{"kind":"simple","type":"string","optional":false}},{"name":"description","type":{"kind":"simple","type":"string","optional":false}},{"name":"quorum","type":{"kind":"simple","type":"string","optional":false}},{"name":"hide","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"ProposalInit","header":1008560988,"fields":[{"name":"body","type":{"kind":"simple","type":"Params","optional":false}}]},
    {"name":"Vote","header":2084703906,"fields":[{"name":"comment","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"UpdateProposal","header":817223820,"fields":[{"name":"updateParams","type":{"kind":"simple","type":"Params","optional":false}}]},
    {"name":"ProposalContractState","header":null,"fields":[{"name":"proposalDeployer","type":{"kind":"simple","type":"address","optional":false}},{"name":"id","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"proposalStartTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"proposalEndTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"proposalSnapshotTime","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"votingSystem","type":{"kind":"simple","type":"string","optional":false}},{"name":"votingPowerStrategies","type":{"kind":"simple","type":"string","optional":false}},{"name":"title","type":{"kind":"simple","type":"string","optional":false}},{"name":"description","type":{"kind":"simple","type":"string","optional":false}},{"name":"quorum","type":{"kind":"simple","type":"string","optional":false}},{"name":"hide","type":{"kind":"simple","type":"bool","optional":false}}]},
]

const ProposalDeployer_getters: ABIGetter[] = [
    {"name":"dao","arguments":[],"returnType":{"kind":"simple","type":"address","optional":false}},
    {"name":"nextProposalId","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"proposalAddr","arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"address","optional":false}},
]

const ProposalDeployer_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"DeployAndInitProposal"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SendUpdateProposal"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class ProposalDeployer implements Contract {
    
    static async init(dao: Address) {
        return await ProposalDeployer_init(dao);
    }
    
    static async fromInit(dao: Address) {
        const init = await ProposalDeployer_init(dao);
        const address = contractAddress(0, init);
        return new ProposalDeployer(address, init);
    }
    
    static fromAddress(address: Address) {
        return new ProposalDeployer(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  ProposalDeployer_types,
        getters: ProposalDeployer_getters,
        receivers: ProposalDeployer_receivers,
        errors: ProposalDeployer_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: DeployAndInitProposal | SendUpdateProposal | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'DeployAndInitProposal') {
            body = beginCell().store(storeDeployAndInitProposal(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SendUpdateProposal') {
            body = beginCell().store(storeSendUpdateProposal(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getDao(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('dao', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }
    
    async getNextProposalId(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('nextProposalId', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getProposalAddr(provider: ContractProvider, index: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(index);
        let source = (await provider.get('proposalAddr', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }
    
}