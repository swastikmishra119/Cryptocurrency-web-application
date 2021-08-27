const Block = require('./block');
const Transaction =require('../wallet/transaction');
const Wallet =require('../wallet');
const cryptoHash = require('../util/crypto-hash');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
    constructor()
    {
        this.chain=[Block.genesis()];
    }

    addBlock({data})
    {
        const newBlock = Block.mineBlock({
            lastBlock : this.chain[this.chain.length-1],
            data 
        });

        this.chain.push(newBlock);
    }

    replaceChain(chain ,vaildateTransactions , onSuccess)
    {
        if(chain.length <= this.chain.length)
        {
            return;
        }
        if(!Blockchain.isValidChain(chain))
        {
            return;
        }
        if(vaildateTransactions && !this.validTransactionData({chain})){
            console.error('the incoming chain has invalid data');
            return;
        }

        if (onSucess) onSuccess();
        console.log('replacing chain with', chain);
        this.chain=chain;
    }

    validTransactionData({chain}){
        for(let i=1 ; i<chain.length ;i++)
        {
            const block =chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;

            for(let transaction of block.data)
            {
                if(transaction.input.address === REWARD_INPUT.address)
                {
                    rewardTransactionCount =+ 1;

                    if(rewardTransactionCount > 1){
                        console.error('Miner rewards exceeds limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD){
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                }else{
                    if(!Transaction.validTransaction(transaction)){
                        console.error('invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain : this.chain,
                        address : transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance){
                        console.error('invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)){
                        console.error('An identical transacton apperas more than once in the block');
                        return false;
                    }else{
                        transactionSet.add(transaction);
                    }
                }
            }
        }

        return true;
    }

    static isValidChain(chain){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
        {
            return false;
        }

        for (let i=1 ; i<chain.length ; i++)
        {
            const block = chain[i];

            const actualLastHash = chain[i-1].hash;

            const {timestamp , lastHash , Hash ,data , nonce , difficulty} = block;

            const lastDifficulty = chain[i-1].difficulty;

            if (lastHash !== actualLastHash)
            {
                return false;
            }

            const validateHash = cryptoHash(timestamp , data , lastHash , nonce , difficulty);

            if(Hash !== validateHash)
            {
                return false;
            }
            if((lastDifficulty - difficulty) > 1 )
            {
            return false ;
            }
        }


        return true;

    }
}

module.exports = Blockchain ;