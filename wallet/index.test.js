const Wallet = require('./index');
const { verifySignature } =require('../util');
const Transaction = require('./transaction');
const Blockchain = require('../blockchain');
const { STARTING_BALANCE } = require('../config');
const { calculateBalance } = require('./index');

describe('Wallet' , () => {
    let wallet;

    beforeEach( () => {
        wallet = new Wallet();
    });

    it('has a `balance' , () => {
        expect(wallet).toHaveProperty('balance');
    });

    it('has a `publicKey` ' , () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe('signing data ', () => {
        const data ='foobar';

        it('verifies a signature', () => {
            expect(
                verifySignature ({
                    publicKey : wallet.publicKey,
                    data ,
                    signature : wallet.sign(data)
                })
            ).toBe(true);
        });
        
        it('does not verify an ivalid signature', () => {
            expect(
                verifySignature ({
                    publicKey : wallet.publicKey,
                    data ,
                    signature : new Wallet().sign(data)
                })
            ).toBe(false);
        });
    });

    describe('createTransaction()', () => {
        describe('and the amount exceeds the balance', () => {
            it('throws an error',() => {
                expect(() => wallet.createTransaction({amount : 999999 , recipient : 'foo-recipient'})).
                toThrow('amount exceeds balance');
            });
        });

        describe('and the amount is valid',() => {

            let transaction , amount , recipient;

            beforeEach(() => {
                amount =50;
                recipent = 'foo-recipent';
                transaction = wallet.createTransaction({ amount , recipient});
            });
            it('creates an instance of transaction',() => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it('matches the transaction input with wallet',() => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it('outputs the amount recipient',() => {
              expect(transaction.outputMap[recipient]).toEqual(amount);
            });

            
        });

        describe('a chain is passed', () => {
            it('calls`Wallet.caculateBalace`',() => {
                const calculateBalanceMock = jest.fn();

                const originalCalculateBalance = Wallet.calculateBalance;

                Wallet.calculateBalance = calculateBalanceMock ;

                wallet.createTransaction({
                    recipent : 'foo',
                    amount : 10,
                    chain : new Blockchain().chain
                });

                expect(calculateBalanceMock).toHaveBeenCalled();

                Wallet.calculateBalance = originalCalculateBalance;
            });
        });
    });

    describe('createBalance()', () => {
       let blockchain;

       beforeEach( () => {
           blockchain = new Blockchain();
       });

       describe('there are no outputs for the wallet', () => {
           it('returns the STARTING_BALANCE', () => {
               expect(
                   Wallet.calculateBalance({
                       chain : blockchain.chain,
                       address : wallet.publicKey
                   })
               ).toEqual(STARTING_BALANCE);
           });
       });

       describe('there are outputs for the wallet',() => {

        let transactionOne , transactionTwo ;

        beforeEach( () => {
            transactionOne = new Wallet().createTransaction({
                recipient : wallet.publicKey,
                amount : 50
            });

            transactionTwo = new Wallet().createTransaction({
                recipient : wallet.publicKey,
                amount : 60
            });

            blockchain.addBlock({ data : [ transactionOne , transactionTwo]});
        });
        it('adds the sum of all outputs to the wallet balance',() => {
            expect(
                Wallet.calculateBalance({
                    chain : blockchain.chain,
                    address : wallet.publicKey
                })
            ).toEqual(STARTING_BALANCE + transactionOne.outputMap[wallet.publicKey]+transactionTwo.outputMap[wallet.publicKey]);
       });

       describe('and the wallet has made a transaction',() => {
           let recentTrasanction;

           beforeEach(() => {
               recentTrasanction = wallet.createTransaction({
                   recipent : 'foo-address',
                   amount : 30
               });

               blockchain.addBlock({ data : [recentTrasanction]});
           });
           
           it('returns the output amount of the recent transaction',() =>{
               expect(
                   Wallet.calculateBalance({
                       chain : blockchain.chain,
                       address : wallet.publicKey
                   })
               ).toEqual(recentTrasanction.outputMap[wallet.publicKey])
           });

           describe('and there are outputs next to and after the transaction',() => {
               let sameBlockTransaction , nextBlockTransaction ;

               beforeEach(() => {
                       recentTrasanction = wallet.createTransaction({
                           recipient : 'later-foo-address',
                           amount :60
                       });

                       sameBlockTransaction =Transaction.rewardTransaction({minerWallet : wallet});

                       blockchain.addBlock({data : [recentTrasanction , sameBlockTransaction]});
        
                       nextBlockTransaction =new Wallet().createTransaction({
                           recipient : wallet.publicKey,
                           amount : 75
                       });

                       blockchain.addBlock({ data :nextBlockTransaction});
                   });

                   it('includes the output amounts in the returned balance' ,() => {
                       expect(
                           Wallet.calculateBalance({
                            chain : blockchain.chain,
                            address : wallet.publicKey
                           })
                       ).toEqual(
                           recentTrasanction.outputMap[wallet.publicKey]+
                           sameBlockTransaction.outputMap[wallet.publicKey]+
                           nextBlockTransaction.outputMap[wallet.publicKey]
                       );
                       });
                   });
               });
           });
       });
    });     



