System Overview¶
The Ethereum Interop Layer is an on-chain protocol and a set of accompanying standards that allows users and applications to interact with the entire Ethereum ecosystem, instead of interacting with separate fragmented chains and rollups.

The EIL protocol is closely integrated with ERC-4337 and build on top of Account Abstraction to achieve a near-universal Chain Abstraction.

Core System Components¶
Cross-Chain Assets Protocol¶
The core of the EIL is designed to make ETH and ERC-20 tokens seamlessly transferable across all L2 chains. The user deposits the necessary assets on the origin chains where these assets were held, creating a so-called VoucherRequest . On their UserOperation's destination chain, the user then claims the assets requested from a Cross-Chain Liquidity Provide.

XLP: Cross-Chain Liquidity Provider¶
The Cross-Chain Liquidity Provider (XLP) is an automated entity that monitors the EIL protocol contracts and fulfills the VoucherRequests by releasing the equivalent assets on the destination chain. It does so by creating and submitting a signed message called Voucher.

The XLP is not a privileged participant, and anyone can become an XLP. As the XLPs do not need to perform any complex calculation and are not trusted by the users in any way, the hardware and staking requirements for running an XLP are minimal.

Once the Voucher has been used, the XLP receives the assets on the origin chain of the VoucherRequest. Each VoucherRequest may also bear some fee that is paid out to the XLP that fulfills the request.

Dispute Resolution Protocol¶
As the EIL coordinates multiple actions of multiple participants across multiple chains, some actions are performed optimistically before the finalized state can be propagated through the L1 across the Ethereum ecosystem.

This inevitably leads to a risk of a dispute, which may be caused by a mistake, chain reorg or a malicious actor.

The EIL protocol is designed to allow resolving any possible dispute without intermediaries and without any risk to the users. Any participant can trigger an on-chain dispute, but needs to supply a bond to do so. Once a dispute is initiated, a week-long dispute window begins.

During this time, the EIL contract on the L1 Ethereum mainnet accepts messages that confirm the finalized state of all L2 chains involved in the dispute.

After the dispute window, the L1 EIL contract is able to make a final judgement in the dispute.

Note that this dispute resolution relies exclusively on the actual state of relevant chains and does not have any external consensus mechanism, voting, co-validation etc.

The losing party will lose its bond, preventing users from initiating any frivolous disputes and making DoS attacks on the dispute mechanism infeasible.

Standards incorporated into the EIL¶
ERC-4337 Account Abstraction¶
The EIL is built on top of the ERC-4337 Account Abstraction and relies on the UserOperation bundlers to execute the transactions on-chain.

The main contract of the EIL protocol is called CrossChainPaymaster, and it acts as a Paymaster contract on the destination chain. The gas costs are charged from the Voucher directly.

While it is technically possible to use the EIL protocol with a simple EOA account with no code, its functionality will be extremely limited.

Note: The EIL protocol requires support of EntryPoint v0.9 and will not work on earlier versions of the EntryPoint.

Multi-Chain UserOperation Hash and Signature¶
Currently, the most widespread approach to signing an ERC-4337 UserOperation involves signing the UserOperation struct directly with a single private key, using the ERC-712 signature scheme for the UserOperation hash.

However, in many cases this means that each UserOperations signed by the user requires a separate interaction and confirmation from the user. This is especially relevant for users of hardware wallets.

This ERC introduces a signature mechanism that efficiently authorizes an unlimited number of UserOperations with a single ERC-191 signature.

Smart Account Composability¶
"Smart Account Composability" is a standard for Smart Account contracts that allows Smart Accounts to fill in some of the input parameters of UserOperations on-chain after the UserOperation is fully signed.

One of the main use-cases for such composability is creating a sequence of actions where the outcome of one action becomes an input of the next one. For example, consider an operation that consists of swapping ETH for USDC on Optimism and then bridging the USDC to Arbitrum.

You can read more about composability in this repository.

EIP-5792: Wallet Call API and Wallet Call Capabilities for EIL¶
EIP-5792 has given wallet applications a way to extend their API and functionality in a well-organized standard way.

We will also introduce the capabilities needed to use the EIL protocol as an abstraction provided by the wallet.

Together, these features allow dapps and wallets to use the EIL protocol in a convenient level of abstraction. Dapps do not need to be aware of any internals of the EIL protocol, as long as the wallet fully supports these capabilities.

ERC-7930: Interoperable Addresses¶
In a Multi-Chain, Account Abstracted environment, it is no longer safe to assume Ethereum addresses to be universal across all EVM-compatible chains.

ERC-7930 introduces a way to serialize the address together with its target chain identifier. It is a critical UX improvement for the EIL and Chain Abstraction.

ERC-7786: Cross-Chain Messaging Gateway¶
ERC-7786 defines an interface for contracts to send and receive cross-chain messages containing arbitrary data.

If such a standard is not widely implemented, the need to manually implement messaging support for each chain will become a major obstacle to Chain Abstraction in general and the EIL protocol in particular.