const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA , MINE_RATE }=require('../config');
const cryptoHash = require('../util/crypto-hash');
class Block
{
    constructor ({timestamp , lastHash , Hash , data , nonce , difficulty})
    {
        this.timestamp= timestamp;
        this.lastHash=lastHash;
        this.Hash=Hash;
        this.data=data;
        this.nonce=nonce;
        this.difficulty=difficulty;
    }

    static genesis() {
        return new this(GENESIS_DATA);
    }

    static mineBlock(lastBlock , data)
    {
        let Hash , timestamp ;
        const lastHash = lastBlock.Hash;
        const { difficulty} = lastBlock;
        let nonce =0;

        do {
            nonce++;
            timestamp=Date.now();
            Hash=cryptoHash(timestamp , lastHash , data , difficulty ,nonce);
        }while(hexToBinary(Hash).substring( 0 , difficulty) !== '0'.repeat(difficulty));

        return new this({
            timestamp,
            lastHash,
            data,
            difficulty,
            nonce,
            Hash : cryptoHash(timestamp , lastHash , data, difficulty , nonce)
        });
    }
    static adjustDifficulty ({originalBlock , timestamp})
    {
        const {difficulty} = originalBlock;
       
        const difference = timestamp - originalBlock.timestamp;
        if(difference > MINE_RATE) return difficulty - 1;

        
        return difficulty + 1;
    }
}


module.exports = Block;