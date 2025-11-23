**Extended Vision Statement V2

General problem**:
- Having funds (tokens) but not being able to make use of them because of the lack of gas

- Difficulty to get gas, such as needing to bridge funds or use a centralized exchange with KYC.

- Difficulty to understand gas for end users, which should be abstracted away as an implementation detail.

**Centralized Paymasters problems:**

- They’re owned by a central third party, depending on them to be kept operable and filled with enough ETH liquidity to sponsor user operations. Users must trust that their paymaster owners will not go down and will refill.

- Centralized Paymasters are expensive for end users, as they charge at least 10% on top of the used gas

**Statement:**

**Today**, when users or applications **want to** use ethereum compatible networks, such as making use of their funds in the shape of tokens, **they are forced to** get native currency **and** understand how gas works, **which results in** a great blocker for adoption and growth of the technology. Additionally, they need to understand which chain they're using, and how their tokens and activity are fragmented across chains.

 In order to solve this, and maintain the trustless property of the system, we propose a fully trustless system that allows users to pay for their transactions in the tokens they have, being abstracted away from gas both on their origin chains and destination chains. 

**Open Paymaster** is a decentralized, trustless paymaster. Built on ERC-4337 account abstraction infrastructure, enables gasless blockchain transactions through community-funded liquidity pools, allowing LP’s to make a yield on native ETH, and allowing users to pay for transaction fees on any token.

The Open Paymaster is strongly complemented by and with the recently proposed “Ethereum Interoperability Layer”, which together achieves a real gasless & trustless “unified ethereum experience”, by allowing to perform cross-chain interactions without having to trust any centralized party. 

The EIL “CrossChainPaymaster” can pays for users gas on any destination chain, while the Open Paymaster completes the gasless and trustless experience by covering the gas on the origin chain.

The user experience is radically simplified: instead of manually bridging assets, swapping for gas, or maintaining ETH balances across multiple chains, users can pay transaction fees directly with any supported ERC-20 token. The paymaster handles the gas payment behind the scenes, abstracting away blockchain complexity and making interactions feel seamless.

**Let’s go over an example:**

Alice is a common person and is not a protocol engineer. She got paid 100 USDC in her ethereum account, and she wants to use those funds to pay her friend Bob 50 USDT in Base. 

Neither Alice or Bob know what gas is, and they don’t have any. 

In order to fulfill this operation, Alice’s wallet uses the Open Paymaster to make her pay the entire operation gas in USDC in the origin chain. Right after, an EIL “Voucher Request” is broadcasted, which is fulfilled by an EIL’s XLP on the destination chain, filling her base account with 50 USDC, and sending those funds to Bob. 

Both Alice and Bob used ethereum to improve their lives, they didn’t need to understand and get gas, and they didn’t require to trust any party.