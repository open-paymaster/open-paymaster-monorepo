EIL: Trust minimized cross-L2 interop
Executive summary
Ethereum’s rollups brought scale, but fragmented the user experience. Today, each L2 feels like an island with its own gas, bridge, and sometimes even wallet. Moving between them breaks the seamless, trustless UX Ethereum was meant to offer.

There have been many attempts to unify the L2 user experience, but they often compromise on Ethereum’s core values:

Less censorship resistance - transacting through intermediaries.
Less security - trusting 3rd parties with funds or state attestation.
Less privacy - exposing the user’s IP address and/or intention to 3rd parties.
Less open source - most logic runs on a 3rd party server, often opaque to users.
We want the UX of a single chain, the security and censorship resistance of Ethereum, with the scalability, price, and speed of the L2 ecosystem. This post will talk about the Ethereum Interop Layer (EIL), an interop standard that aims to provide exactly that.

The Ethereum Interop Layer (EIL) makes Ethereum’s rollups feel like a single, unified chain by enabling users to sign once for a cross-chain transaction without adding new trust assumptions. Built on ERC-4337 account abstraction and the principles of the Trustless Manifesto, users themselves initiate and settle cross-L2 actions directly from their wallets, not through relayers or solvers. EIL preserves Ethereum’s core guarantees of self-custody, censorship resistance, disintermediation, and verifiable onchain execution. This new account-based interoperability layer unifies Ethereum’s fragmented L2 ecosystem under Ethereum’s own security model.

The vision
UX: Multichain feels like single chain
Arbitrum Alice wants to send 0.1 ETH to Base Bob. Alice pastes Bob’s address into her wallet and sends 0.1 ETH, her wallet figures everything out and Bob receives the funds within seconds.

We want this kind of clean user experience not just for moving around ETH and ERC20s, but also for more complicated operations (eg. multichain calls, cross-chain swaps). Alice should be able to pay fees in one place using any asset, and sign once per operation, not once per chain. Latency should be as low as possible.

Security & privacy: Censorship resistance, no trusted intermediaries
Alice and Bob should not have to trust any third party for liveness, safety or privacy. That is:

There should be no “enshrined” actor that the protocol depends on in order to operate.
Liquidity providers or other actors should not be able to steal Alice’s funds. Security assumptions should be the same as the underlying chains.
Liquidity providers or other actors should not even be able to freeze Alice’s funds, even for a short duration. If one liquidity provider disappears halfway through a trade, others should be able to come in and finish the job.
There should be no server that Alice or Bob (or even liquidity providers) need to ping, leaking their IP address. The only thing that they should need to talk to is RPC nodes of the L1/L2s, and possibly a p2p mempool.
Liquidity providers should not learn ahead of time details that could allow them to sandwich or otherwise exploit Alice.
Background
Why general purpose censorship resistant intents are hard
At first glance, intent solvers seem like an easy path to cross-chain UX. But permissionless and decentralized solvers face structural DoS and griefing risks.

For example:

Sybil could deploy malicious contracts on the destination chain and send many intents that use them, causing the solver to unexpectedly revert on chain and not get paid for them. Solvers will have to mitigate by whitelisting contracts. E.g. support only a closed list of known tokens. This happened to MEV searchers: initially they automatically used every ERC-20, then they got salmonella and within hours they all switched to whitelists.
General purpose intents can be arbitrarily complex and it’s hard to verify their results. Oscar could run malicious solvers that fulfill intents in unintended ways, causing Alice to pay and not get what she wanted. For example a solver could call the requested contract with insufficient (but marginal) gas, causing an inner frame to revert while the rest of the intent succeeds. Mitigating each such attack is easy, but mitigating all possible attacks for every possible intent is hard. Protocols might mitigate by whitelisting known-safe intent types.
Oscar’s solver could decompose a multichain intent, perform the actions on one chain but not on another. The solver doesn’t get paid but the user is stuck in a limbo state which Oscar may benefit from. Intent protocols might mitigate by whitelisting solvers.
Protocols that whitelist solvers or users are not censorship resistant.

Protocols that whitelist contracts or intent types are not general purpose and require work to support every new use case. The added friction for supporting new use cases might become de-facto gatekeeping.

Since the solver must execute arbitrary logic on untrusted contracts, full censorship resistance and generality are fundamentally in tension.

Why crosschain privacy is hard: the Privacy/Safety/UX trilemma
Submitting an intent reveals the user’s intended outcome ahead of time - what the user is going to do on each chain. It often also require interacting with an offchain service, associating the user’s IP address with the intent. This has privacy implications.

Example 1:

Arbitrum Alice wants to donate to a controversial cause on Scroll. She reaches out to solvers, they reject her, or say ok but not actually deliver. They do log her IP address and associate her real world identity with the cause.

She could instead separate the donation to two transactions: 1. Send funds to her own Scroll address. 2. Send the donation on Scroll. She won’t be censored in this case but her IP is still associated with the donation due to 1, and her UX is degraded - she has to sign two transactions for one operation.

Example 2:

Base Bob wants to bid at an auction on Arbitrum. He doesn’t want to associate his IP address with the bid, but also doesn’t want to reveal his intent to bid due to frontrunning safety.

If he uses an offchain intent protocol and a reputable solver, he’s relatively safe from frontrunning but the solver now knows his IP.
If he uses an onchain intent protocol to avoid connecting to a solver, his IP stays hidden but gives up safety - his action is revealed to frontrunners.
If he splits the operation into two transactions, sending funds to Arbitrum and then signing another transaction for the actual bid, he is safe from both risks, but UX is degraded.
This presents a trilemma: {Privacy, Safety, UX} — pick 2 out of 3

Choice (what you optimize for)	Example approach	What you lose
Privacy + UX	On-chain intent protocols (fully public mempool execution)	Lose front-running safety - transactions can be observed and exploited before inclusion.
Safety + UX	Reputable off-chain solver networks (private matching and execution)	Lose privacy - users reveal intent details and metadata like IP address, which can link their blockchain address and real-world identity to a centralized or semi-trusted solver.
Safety + Privacy	Split flow: on-chain intents only for transfers, send calls separately	Lose UX - high latency, multiple signatures, and fragmented user flow.
Takeaway: full censorship-resistant, privacy-preserving, safe, and seamless intent execution is currently impossible without introducing some trust assumption or UX degradation.

A well designed crosschain protocol should aim to solve this trilemma:

Not require offchain server interaction.
Not require revealing the entire intent ahead of time.
Good UX: reliability, low latency, one signature per operation.
This can be solved by putting the user in full control at all times.
If Alice initiates every transaction on every chain without intermediaries transacting on her behalf, no one can censor her, grief her, limit her to specific use cases, or compromise her privacy. Goal achieved.

But this requires solving some problems:

How will Alice transparently use an unknown chain without trusting dapps to add them to her wallet and trusting unknown RPC servers?
How will Alice pay for the gas on chains she never used before?
How will Alice move assets between chains without trusting bridge operators or using expensive and slow canonical L1 bridges?
How will she do all this with just one signature?
How EIL works
Multichain calls with ERC-4337
Suppose Alice wants to perform N operations on N different chains. By far the most common case will be: transfer assets to a liquidity provider on chain A, and then perform an action on chain B. But there are other more complex cases as well.

In EIL, users use an ERC-4337 account with logic optimized for multichain use cases. A wallet generates multiple different UserOps, then signs a single authorization on a Merkle root of all of them. The validation section of the account on each chain expects (i) a UserOp, (ii) a Merkle branch proving its membership in some tree, and (iii) a signature over the root of the tree.

The main advantage of doing this instead of just signing N times (which a wallet could do with one click from the user) is in order to support hardware wallets, which generally do not support any functionality for simultaneously generating N signatures.

How the wallet uses it:

Untitled
Untitled
1436×2804 153 KB
ZeroDev and Biconomy implemented validation modules that works similarly.

Token transfers
Token transfers from chain A to chain B are needed for two reasons. First, Alice often wants to move tokens between chains. Second, if Alice wants to do something on chain B, but has no tokens on chain B, she needs to pay gas fees somehow, and this requires moving tokens over from chain A.

Unlike calls, token transfers do require information flow between L2s. Currently we can’t trustlessly implement fast messaging so the next best thing is Atomic Swaps.

The most widely known method is HTLC. Each party locks funds in a timelock contract on one of the chains, which can be withdrawn by the other party using a secret which is hashed in the contract. Both contracts use the same hash so as soon as the party which generated the secret performs a withdrawal, the other party sees the secret and can perform the withdrawal on the other chain. If the secret is not revealed within the preset time, each party can withdraw their original deposit. Funds can’t be lost or stolen but the protocol is inefficient. It requires 1:1 relationship, multiple transactions on both chains, and potentially locks up funds for some time.

Can we do better? Yes! We have a tool at our disposal that the typical HTLC implementation doesn’t: We don’t have fast cheap trustless messaging but we do have slow expensive messaging via L1.

This enables optimistic design, removing the need for a secret and reducing the number of transactions to 2 on the source chain (one by each party) and 0 on the destination chain. The withdrawal doesn’t require a dedicated transaction, and happens within the user’s call where the funds are used. Transfers can be as fast as 1 source chain block + 1 destination chain block, 2 seconds on many current rollups.

How it works
We introduce a CrossChainPaymaster, an ERC-4337 paymaster for crosschain gas payments as well as a permissionless liquidity hub for ETH and ERC-20 tokens.

XLPs (Crosschain Liquidity Providers) register and deposit funds in the CrossChainPaymaster on multiple chains. In addition they lock a stake on L1 in L1CrossChainStakeManager. The unstake delay is 8 days - longer than the max L2 finality time. If an XLP starts the 8 days unstaking process, it immediately gets unregistered.

Registering & Staking:

Untitled (1)
Untitled (1)
1436×772 26.6 KB
Unregistering & unstaking:

Untitled (2)
Untitled (2)
1436×764 26 KB
The structure and use of the stake is discussed in EIL: under the hood.

Transacting:

Alice wants to transact from Chain_A to Chain_B. She finds registered XLPs that operate on both chains
Alice signs a multichain UserOp. On Chain_A she locks funds in CrossChainPaymaster and requests a matching Chain_B voucher, specifying a list of XLPs she’s willing to use and a fee schedule (detailed below). The request is short-lived. If a voucher is not provided promptly, Alice’s funds are unlocked.
An XLP claims her Chain_A funds by providing a signed voucher - a signed commitment for Chain_B. The same signed voucher that claims funds on Chain_A releases XLP funds on chain B to Alice - forming an atomic swap. The funds on Chain_A remain locked for an hour (to mitigate rugpull attempts - more details in the following section), after which they’re credited to XLP’s deposit.
Alice appends the XLP’s voucher to her Chain_B UserOp’s signature and submits it to Chain_B.
Chain_B CrossChainPaymaster verifies voucher, checks that XLP has sufficient funds deposited, pays for the gas and gives Alice the funds.
Alice’s Chain_B call gets executed and her account uses the funds during this call. Gas is paid out of XLP’s Chain_B balance.
Untitled (3)
Untitled (3)
1436×1064 41.4 KB
This flow can continue and traverse any number of L2s using the same signature.
Each iteration transfers value and performs one or more calls.
It can also perform a completion call on Chain_A if needed.
Calls are executed on all chains with one signature. Gas was paid on the source chain.
What could go wrong and what do we do about it? EIL defines a trustless L1-based dispute mechanism, ensuring that funds cannot be lost or stolen, penalizing XLPs that violate the rules and incentivizing other XLPs to prove any such violation to L1. See Attacks & mitigations section in EIL: under the hood.

Voucher fee structure
Voucher requests offer a fee to compensate XLPs. Each request may include one or more assets, e.g. ETH for gas, ERC-20 tokens. The fee is denominated in the first asset, whether it’s ETH or a token.

Requests specify multiple XLPs that may claim them. The first XLP to provide a voucher receives the fee. This creates competition between XLPs.

Fee discovery uses a reverse Dutch auction. The request specifies a fee range and a fee increase per second.

Time T+0: UserOp is still in the mempool. Any listed XLP may provide a voucher and receive the start fee as soon as both the request and the voucher get included onchain.
Time T+1: If no XLP provided a voucher at T+0, the request may land onchain unfulfilled. A higher fee is paid to the XLP that provides a voucher.
The fee keeps increasing every second at the user-specified rate until a voucher is provided or the max fee is reached.
If the request remains unclaimed, it expires and the funds are released back to the user.
Alice may start with a very low fee and let it increase until an XLP considers it sufficient. However, to minimize latency she should start close to the current market fee. If she offers the current market fee or higher, she can expect zero-latency fulfillment. Current market fees can be observed onchain as the paymaster emits an event for each voucher.

This mechanism is an optimization over how gas fees work. The start fee is equivalent to the current gas price which can be gathered from onchain data. To avoid signing a new transaction if the price increased, a range is specified. The reverse dutch auction uses the competition between XLPs to ensure that users transact at the lowest possible fee.

Mempool dynamics
An XLP that also runs a bundler and participates in the mempool can bundle the UserOp along with its own UserOp that claims the funds, thus earning the fee before other XLPs get a chance to act. Voucher requests become part of MEV.

In a competitive environment XLPs that don’t do this will usually be 1 block too late and seldom earn fees.

It is therefore expected that most XLPs would join the mempool and compete on fulfilling requests in the same block where users submit them. Users benefit from 1 block crosschain swaps.

What can we improve when we get trustless crosschain messaging
In the future we expect faster L2 finality as rollups move away from the optimistic model and towards ZK validity proofs. This enables fast trustless cross-L2 messaging and efficient proving of L2 state.

When fast L2 finality becomes available, we’ll build an additional paymaster, CrosschainMessagingPaymaster, which doesn’t use atomic swaps and makes different trade offs. It removes the XLPs and replaces them with passive liquidity providers, much like a Uniswap liquidity pool.

Multichain accounts will be able to send funds on the source chain and use them to complete the transaction on the destination chain as soon as a message is delivered between the paymasters on both chains.

Liquidity providers will earn fees on each chain and be incentivized to rebalance the pool across chains.

It provides better liveness guarantees than CrossChainPaymaster since there’s no risk that a chain has no XLPs running, but higher latency due to L2 finality time on L1 and slightly higher cost due to crosschain messaging overhead.

CrosschainMessagingPaymaster and CrossChainPaymaster may share the same interface so wallets will be able to support both without additional effort. By default they might prefer to use the faster and cheaper CrossChainPaymaster, but can fall back to CrosschainMessagingPaymaster if there’s a protocol liveness issue on a certain chain.

What can we improve when we get native account abstraction (EIP-7701)
Currently the protocol uses ERC-4337 accounts for multichain operations. Being an ERC rather than part of the Ethereum protocol, 4337 unavodiably adds a layer on top of transaction. This comes with certain downsides:

The AA protocol is implemented as a singleton contract (EntryPoint) which adds some gas overhead.
The 4337 mempool is a network of bundlers rather than block builders. Bundlers then interact with block builders, adding a layer of complexity.
EIP-7701 introduces flexible in-protocol account abstraction. It enables different AA models, including a more efficient variant of ERC-4337 where the EntryPoint contract is replaced by the protocol, and the bundlers logic can be implemented directly by block builders that wish to participate in the AA mempool.

EIL is designed with EIP-7701 in mind. Chains that implement EIP-7701 will benefit from an EIL implementation with increased efficiency and improved censorship resistance.

Recap: what are some key UX, security and privacy properties of this mechanism?
Seamless UX
:white_check_mark: Multichain smart accounts and EIP-7702 delegation enable multichain transactions signing once per operation, not separately on each chain.
:white_check_mark: You can purchase vouchers for any token on any chain, and use them anywhere.
:white_check_mark: You can purchase a gas voucher on one chain, and use it to pay fees on another.
:white_check_mark: Minimum latency - as fast as the underlying chains.
:white_check_mark: Building interop into the wallet. Vouchers requested and received in the same block, wallets transact directly on all chains, not waiting for a crosschain message.
Censorship resistance, security, privacy
:white_check_mark: EIL uses a permissionless and incentivized mempool. A single honest node is sufficient.
:white_check_mark: No trusted intermediaries, calls made directly by the user, funds are swapped atomically, any dispute is resolved directly via L1.
:white_check_mark: Privacy aware users can send directly to the p2p mempool. Plausible deniability.
:white_check_mark: The pre-transaction-submission steps of reveal token amounts and gas limits. Actual calls not revealed to anyone until the user executes them. Privacy aware users can choose to send direct to builder marketplaces that protect from sandwiching, or use any future solution to the same problem.
:white_check_mark: Runs locally on the user’s machine, open source. Cross-chain liquidity provider only provides gas and liquidity, performs minimal functionality (atomic swaps) and fully verifiable onchain.
How does this architecture support the most common use cases?
Seamless crosschain transfers
Arbitrum Alice wants to send 100 USDC to Base Bob. Alice pastes Bob’s address into her wallet and sends 100 USDC, her wallet figures everything out and Bob receives the funds within seconds.

Untitled (4)
Untitled (4)
1436×930 37.5 KB
Seamless multichain calls
Alice wants to mint an NFT on Linea. It costs 1 ETH. She never used Linea but has 0.8 ETH on Arbitrum and 0.5 ETH on Scroll. She clicks the “mint” button and signs a single transaction. Her wallet figures everything out, transparently transfers enough ETH from Arbitrum and Scroll, mints the NFT on Linea and verifies that she received it.

Untitled (5)
Untitled (5)
1436×936 38.9 KB
Seamless crosschain swaps
Arbitrum Alice wants to swap USDC to RUT (Rarely Used Token). It has little liquidity on Arbitrum but she finds a good price in a DEX in Taiko. She signs a single transaction, her wallet figures everything out, swaps on Taiko, and she receives the RUT back on Arbitrum within seconds.

Untitled (6)
Untitled (6)
1436×1120 47.2 KB
Differences between EIL and other designs
EIL is not Intents or Bridges
EIL is account-based interop: the user’s own account directly performs every call on every chain. Liquidity providers only supply gas and assets - they never submit transactions and never see the call targets. This removes the “mid-state” trust dependency that exists in intents and bridges, where a 3rd party solver/relayer transacts on the user’s behalf.

The analogy is buying gas for your car vs. buying a bus ticket:

If you buy a bus ticket, you’re committed to that bus.
Privacy: the bus company knows where you’re going.
Censorship resistance: If the bus driver decides to drive elsewhere, or stops the bus halfway and kicks you out, you don’t reach your destination. There’s a mid-state in which you can’t switch buses.
If you buy gas for your car and then drive to your destination, either the gas station sell you the gas or another station will, but either way your dependency on the gas station ends as soon as you get the gas.
Privacy: the gas station doesn’t know where you’re going.
Censorship resistance: Once they sell you the gas they have no way to stop you. There’s no mid state, the transaction is atomic - you pay, get the gas, and you’re done.
With intents or Bridges, there is this mid state where a 3rd party is supposed to “get you there”, and at that point you’re dependent on them. EIL does not have this mid state because the calls are made by the user, not a 3rd party.

EIL is not a crosschain messaging protocol
Trustless crosschain messaging is currently slow. It depends on L1 block time as well as L2 finality speed. To improve speed, messaging protocols introduce trust assumptions. A 3rd party needs to attest for message validity until it gets proven/disproven via L1.

Messaging protocols have different strengthes and weaknesses comapred to EIL:

Strength: they can achieve something that EIL doesn’t - composability between contracts on multiple chains. EIL is account based, enables the account to combine calls to different contracts, but doesn’t attempt to enable calls from a contract on one chain to another. For this use case, projects should choose between slow trustless messaging (canonical bridges) and faster messaging protocols. Good options exist, making different trade offs.
Weakness: messaging introduces latency. The less trust it requires, the higher the latency. EIL does not incur this latency because the calls are from the user to each chain rather than from one chain to another.
EIL does use the canonical bridge for messaging, but only when a fraud proof is required. Normal user flows do not involve messaging. Hence it cannot be seen as a messaging based protocol.

In the future, when we have faster finality of both L1 and L2 which enables trustless messaging, it’ll be possible to implement EIL as a messaging based protocol and simplify the protocol. For now, however, it is not messaging based.

When to use / not use EIL?
EIL enables trustless execution of calls on multiple chains, and provides liquidity and gas for these calls.

When is EIL a good fit?

You need to execute calls on multiple chains seamlessly.
The user doesn’t necessarily have gas funds on each chain.
Assets scattered on multiple chains, you wish to use them without bridging friction.
You prefer to only trust your wallet, and not add intermediaries and trust assumptions.
When should you use something else?

Your dapp only knows what it wants to achieve at a high level, not how to translate it to contract calls. EIL doesn’t delegate to a 3rd party service so the dapp must specify the calls to execute.
Intents let you delegate to a Solver and let it figure out the calls. The downsides are that transaction logic is controlled by a 3rd party, and censorship resistance is degraded.
Your action involves offchain counterparties rather than just smart contracts. For example, offchain orderbook based swaps. EIL is an onchain protocol. It can transfer assets across chains but depends on DEXes for swapping one asset to another.
If a transaction requires coordinating between offchain parties, intents are a better fit. It comes with the downsides above, plus the information asymmetry risk.
A contract on one chain needs to call a contract on another, without trusting the user.
EIL lets users transact on multiple chains, but if contracts need to call each other directly, then you need a crosschain messaging protocol. The downside is either high latency (canonical bridge - 7 days for optimistic rollups), or trusting an offchain oracle to attest for crosschain messages.
How to use EIL if I’m a …?
Wallet dev
Support ERC-5792 (wallet_sendCalls) with an extension for multichain operations, or use the EIL SDK.
Smart accounts: use the multichain account module we’ll provide or build your own, based on the ERC (WiP).
EOA wallets: use the multichain 7702 implementation we’ll provide or implement the ERC (WiP)
Use CrossChainPaymaster for crosschain gas payment and token transfers.
dApp dev
Use ERC-5792 (wallet_sendCalls) for multichain operations by default, or use the EIL SDK.
Only fall back to bridges if the wallet doesn’t support it.
User
Pick a wallet that supports EIL.
Transact like you would on a single chain, never having to switch networks or bridge funds.