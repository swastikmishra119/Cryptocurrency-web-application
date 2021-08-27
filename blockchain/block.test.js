const hexToBinary = require('hex-to-binary');
const Block = require('./block');
const { GENESIS_DATA , MINE_RATE} = require('../config');
const cryptoHash = require('../util/crypto-hash');

describe('Block', () => {
const timestamp= 2000;
const lastHash='ui';
const Hash='lp';
const data =['blockchain', 'data'];
const nonce =1;
const difficulty =1;
const block = new Block({timestamp , lastHash , Hash , data , nonce , difficulty});

it('has a timestamp , lastHash , Hash and a data property' , () => {
    expect(block.timestamp).toEqual(timestamp);
    expect(block.lastHash).toEqual(lastHash);
    expect(block.Hash).toEqual(Hash);
    expect(block.data).toEqual(data);
    expect(block.nonce).toEqual(nonce);
    expect(block.difficulty).toEqual(difficulty);
});

describe('genesis()', () => 
{
    const genesisBlock = Block.genesis();

    it('returns a block instace' , () => 
    {
        expect(genesisBlock instanceof Block).toBe(true);
    });
    it('returns the genesis data' , () =>
    {
        expect(genesisBlock).toEqual(GENESIS_DATA);
    });
});
describe('mineBLock()', () =>
{
    const lastBlock =Block.genesis();
    const data = 'mined data';
    const minedBlock = Block.mineBlock(lastBlock , data);

    it('returns a block instance', () => {
        expect(minedBlock instanceof Block).toBe(true);
    });

    it('sets the lasthash to be the hash of the last block', () => {
        expect(minedBlock.lastHash).toEqual(lastBlock.Hash);
    });

    it('sets the data', () =>{
        expect(minedBlock.data).toEqual(data);
    });
    it('sets the timestamp', () =>{
        expect(minedBlock.timestamp).not.toEqual(undefined);
    });
    it('creates a sha 256 hash based on the proper inputs', () => {
        expect(minedBlock.Hash).toEqual(cryptoHash
            (minedBlock.timestamp, 
             minedBlock.nonce, 
             minedBlock.difficulty, 
             lastBlock.Hash , 
             data ));
    });
    it('sets a hash that matches the difficulty criteria', () => {
        expect(hexToBinary(minedBlock.Hash).substring(0 , minedBlock.difficulty)).toEqual('0'.repeat(minedBlock.difficulty));
    });
});
   describe('adjustDifficulty()' , () => {
       it('raises the difficulty for a quickly mined block' , () => {
           expect(Block.adjustDifficulty({originalBlock : block , timestamp : block.timestamp + MINE_RATE -100})).toEqual(block.difficulty +1);
       });
       it('lowers the difficulty of slowly mined block' , () => {
           expect(Block.adjustDifficulty({originalBlock : block , timestamp : block.timestamp + MINE_RATE + 100})).toEqual(block.difficulty-1);
       });
   });   
});
