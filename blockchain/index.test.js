const Blockchain = require ('./index');
const Block = require ('./block');
const cryptoHash = require('../util/crypto-hash');
const Wallet =require('../wallet');
const Transaction =require('../wallet/transaction');

describe('Blockchain()', () => {

    let blockchain , newChain , originalChain;

    beforeEach( () => {
       blockchain = new Blockchain();
       newChain = new Blockchain();
       originalChain =blockchain.chain;
    });

    it('contains a chain array instance', () =>{
        expect(blockchain.chain instanceof Array).toBe(true);
    });
    it('starts with genesis block', () => {
        expect(blockchain.chain[0]).toEqual(genesis());
    });
    it('adds a new block to the chain ', () => {
        const newData = 'foo bar';
        blockchain.addBlock({data : newData});

        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    });
    describe('isValidChain', () => {
        describe('when the chain does not start with the genesis block' , () => {
            it('returns false' , () => {
                blockchain.chain[0] ={data : 'fake-genesis'};

                expect(isValidChain(blockchain.chain)).toBe(false);
            });
        });
        describe('when the chain starts with genesis block and has multiple blocks' , () => {
            beforeEach( () => {
                blockchain.addBlock({data : 'beer'});
                blockchain.addBlock({data : 'beets'});
                blockchain.addBlock({data : 'battlestar galactica'});
            });
            describe('and a lastHash preference has been changed',() => {
                it('returns false' ,() => {
                    
                    blockchain.chain[2].lastHash='broken-lastHash';
                    
                    expect(isValidChain(blockchain.chain)).toBe(false);
                });
            });
            describe('and a chain contains the block with the invalid field',() => {
                it('returns false',() => {
                    
                    blockchain.chain[2].data='some - evil -bad';

                    expect(isValidChain(blockchain.chain)).toBe(false);
                });

            describe('and the chain a contains a block with the jumped difficultu' , () => {
                it('returns false' , () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.Hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;

                    const hash = cryptoHash(timestamp , lastHash , difficulty ,nonce , data);

                    const badBlock = new Block({timestamp , lastHash , hash , nonce , difficulty , data});

                    blockchain.chain.push(badBlock);

                    expect(isValidChain(blockchain.chain).toEqual(false));
                });
            });

            describe('and the chain does not contain and invalid blocks',() => {
                it('returns true',() => {
                    
                    expect(isValidChain(blockchain.chain)).toBe(true);
                });
            });
            });
        });
        });
           describe('replaceChain()', () => {
              
            describe('when the chain is not longer',() => {
                  it('does not replace the chain',() => {
                       
                    newChain.chain[0]={ new : 'chain'};
                      
                    blockchain.replaceChain(newChain.chain);
                      
                    expect(blockchain.chain).toEqual(newChain.chain);
                  
                });
            });
                   
            describe('when the chain is longer',() => {
                       beforeEach( () => {
                        blockchain.addBlock({data : 'beer'});
                        blockchain.addBlock({data : 'beets'});
                        blockchain.addBlock({data : 'battlestar galactica'});
                       });
                       describe('and the chain is invalid',() => {
                           it('does not replaces the chain',() => {
                               newChain.chain[2].Hash ='some-fake-hash';

                               blockchain.replaceChain(newChain.chain);

                               expect(blockchain.chain).toEqual(originalChain);
                           });
                       });
                       describe('and the chain is valid',() => {
                           it('replaces the chain',() => {
                             blockchain.replaceChain(newChain.chain);

                             expect(blockchain.chain).toEqual(newChain.chain);
                           });
                       });
               });
               describe('and the `validTransactions` flag is true',() => {
                it('calls validTransactionData', () => {
                    const validTransactionDataMock =jest.fn();

                    blockchain.validTransactionsData = validTransactionDataMock;

                    newChain.addBlock({data : 'foo'});
                    blockchain.replaceChain(newChain.chain , true);

                    expect(validTransactionDataMock).toHaveBeenCalled();
                });
            });
           });

           describe('validTransactionData()',() => {
               let transation , rewardTransaction , wallet;

               beforeEach(() => {
                   wallet = new Wallet();
                   transation = wallet.createTransaction({ recipient : 'foo-address', amount : 65});
                   rewardTransaction = Transation.rewardTransaction({minerWallet : wallet});
               });

               describe('and the transaction data is valid',() =>{
                   it('returns true',() =>{
                       newChain.addBlock({data :[transation ,rewardTransaction]});

                       expect(blockchain.validTransactionsData({chain :newChain.chain})).toBe(true);
                   });
               });

               describe('and the transaction data has multiple rewards',() => {
                   it('returns a false',() => {
                       newChain.addBlock({data : [transation , rewardTransaction ,rewardTransaction]});

                       expect(blockchain.validTransactionsData({chain :newChain.chain})).toBe(false);
                   });
               });

               describe('and the transaction data has atleast one malformed output',() => {
                   describe('and the transaction is not a reward transaction',() => {
                    it('returns a false',() => {
                        transation.outputMap[wallet.publicKey] = 999999;

                        newChain.addBlock({data : [transation , rewardTransaction]});

                        expect(blockchain.validTransactionsData({chain :newChain.chain})).toBe(false);
                    });
                   });

                   describe('and the transaction is a reward transaction',() => {
                    it('returns a false',() => {
                        rewardTransaction.outputMap[wallet.publicKey] = 999999;

                        newChain.addBlock({ data : [transation , rewardTransaction]});

                        expect(blockchain.validTransactionsData({chain : newChain.chain})).toBe(false);
                    });
                   });
               });

               describe('and the transaction data has atleast one malformed input',() => {
                it('returns a false',() => {
                    wallet.balance = 9000;

                    const evilOutputMap = {
                        [wallet.publicKey] : 8900,
                        fooRecipient :100
                    };

                    const evilTransaction = {
                        input : {
                            timestamp : Date.now(),
                            amount : wallet.balance,
                            address : wallet.publicKey,
                            signature : wallet.sign(evilOutputMap)
                        },
                        outputMap : evilOutputMap 
                    }
                    newChain.addBlock({data :[evilTransaction , rewardTransaction]});
                    expect(blockchain.validTransactionsData({chain : newChain.chain})).toBe(false);
                });
               });

               describe('and a block contains multiplt identical transactions',() => {
                it('returns a false',() => {
                    newChain.addBlock({
                        data : [transation , transation , transation , rewardTransaction]
                    });
                    expect(blockchain.validTransactionsData({chain : newChain.chain})).toBe(false);
                });
               });
           });
    });
