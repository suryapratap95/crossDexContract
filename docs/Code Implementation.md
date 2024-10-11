
### Contract Overview
The following contracts have been created:

- **MockERC20**: ERC20 contract for tokens.
- **MockWETH**: Mock contract simulating WETH.
- **MockRouter**: Router contract for different DEXes (Uniswap, SushiSwap, PancakeSwap).
- **CrossDEXSwap**: Swap contract that enables swapping across multiple DEXes.

These contracts are designed to simulate the behavior of real-world components in a decentralized exchange (DEX) environment for testing purposes. The code includes an interface `ISwapRouter`, which defines the structure for exact input and output swap operations.

### Smart Contract Libraries
- Utilizes OpenZeppelin's `SafeERC20` for secure ERC20 token operations.
- Implements `ReentrancyGuard` to prevent reentrancy attacks.
- Employs `Ownable` to manage ownership and administrative functions.

### Execution Logic
The execution logic for these contracts simulates a simplified DEX environment for testing purposes. When testing a system that interacts with these contracts, the following steps are typically followed:

1. Deploy the `MockERC20` contracts for each token needed in the test scenario.
2. Deploy the `MockWETH` contract to simulate WETH.
3. Deploy the `MockRouter` contract to simulate the DEX router.
4. Use the mint functions of `MockERC20` and `MockWETH` to create token balances for test accounts.
5. Set the expected return value for swaps using the `setMockReturn` function of `MockRouter`.
6. Execute test swaps by calling the `exactInput` or `exactOutput` functions on the `MockRouter`.

### CrossDEX Execution
- The `executeSwap` function validates the swap order and checks the deadline.
- Converts Ether to WETH if the first token in the swap is the wrapped native token.

### Implementation Details
The implementation of these contracts focuses on simplicity and flexibility for testing scenarios. The `MockERC20` and `MockWETH` contracts use OpenZeppelin's ERC20 implementation as a base, ensuring standard-compliant token behavior. The additional mint functions in these contracts allow for easy manipulation of token balances without complex distribution mechanisms.

The `MockWETH` contract's deposit and withdraw functions simulate the wrapping and unwrapping of Ether, a crucial functionality in many DEX systems. The withdraw function includes a balance check to ensure users cannot withdraw more WETH than they own.

The `MockRouter`'s implementation of `exactInput` and `exactOutput` is deliberately simplified. Instead of performing complex routing and swapping logic, it returns a predefined value, allowing testers to focus on the interaction between their system and the router without worrying about the intricacies of actual swap execution.

### Multi-DEX Functionality
- Integrates with Uniswap V3, PancakeSwap V3, and SushiSwap V3 for token swaps.
- Supports both exact input and exact output swaps for user convenience.
- Allows users to perform swaps across different DEXes for flexibility and optimization.

### Swap Order Structure
- Uses `SwapOrder` struct to define a series of structured swap steps.
- Each `SwapStep` includes details such as:
  - Input token (`tokenIn`)
  - Output token (`tokenOut`)
  - Fee (`fee`)
  - DEX used for the swap
  - Amount of tokens to swap
  - Type of swap (exact input/output)

### Token Wrapping
- The contract converts received Ether (ETH) into Wrapped Ether (WETH) using the `receive` function.
- Wrapped native tokens are mapped to respective chain IDs for seamless interactions.

### Executing a Swap
- The `executeSwap` function validates the swap order and checks the deadline.
- Converts Ether to WETH if the first token in the swap is the wrapped native token.

### Processing Swap Steps
- Loops through each step in the `SwapOrder` to perform swaps.
- Ensures that the input token for each step matches the expected token.

### DEX Interaction
- The `_executeSwapStep` function constructs and sends calldata to the specified DEX router.
- Supports both exact input and exact output swaps via low-level `call` to execute transactions.

### Final Output Handling
- Validates the final output amount against the minimum specified in the swap order.
- Converts WETH back to native currency if the final token is WETH/WBNB; otherwise, it transfers the output tokens directly to the user.


### Deploy the contracts on the local hardhat network

npx hardhat ignition deploy ./ignition/modules/MockContract.js 
the contract address response will be added in the CrossDEXSwap 
npx hardhat ignition deploy ./ignition/modules/CrossDEXSwap.js

 
