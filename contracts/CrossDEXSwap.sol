// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


// Router contract address for uniswap v3
// mainnet: 0xE592427A0AEce92De3Edee1F18E0157C05861564
// testnet: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E

// Router contract address for Pancakeswap
// mainnet: 0x13f4EA83D0bd40E75C8222255bc855a974568Dd4
// testnet: 0x9a489505a00cE272eAa5e07Dba6491314CaE3796

// Router contract address for sushiswap
// mainnet: 0x1b81D678ffb9C0263b24A97847620C99d213eB14
// testnet: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E



interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
}

// Add IWETH interface
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}


contract CrossDEXSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum DEX { UNISWAP_V3, PANCAKESWAP_V3, SUSHISWAP_V3 }
    enum SwapType { EXACT_INPUT, EXACT_OUTPUT }

    struct SwapStep {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        DEX dex;
        uint256 amount;
        SwapType swapType;
    }

    struct SwapOrder {
        SwapStep[] steps;
        uint256 deadline;
        uint256 minAmountOut;
    }

    mapping(DEX => address) public dexRouters;
    mapping(uint256 => address) public wrappedNativeToken; // chainId => WETH/WBNB address

    event RouterUpdated(DEX indexed dex, address indexed newRouter);
    event SwapExecuted(address indexed user, uint256 amountIn, uint256 amountOut);
    event WrappedNativeTokenUpdated(uint256 indexed chainId, address indexed newAddress);

    constructor() Ownable(msg.sender) {
        dexRouters[DEX.UNISWAP_V3] = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; // Sepolia testnet
        dexRouters[DEX.PANCAKESWAP_V3] = 0x9a489505a00cE272eAa5e07Dba6491314CaE3796; // BSC
        dexRouters[DEX.SUSHISWAP_V3] = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; // Assuming this is correct

        // Set wrapped native token addresses (replace with actual addresses)
        wrappedNativeToken[11155111] = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH on Ethereum mainnet
        wrappedNativeToken[56] = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c; // WBNB on BSC
        wrappedNativeToken[11155111] = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH on Sepolia testnet
    }

    receive() external payable {
        // Convert received ETH to WETH
        IWETH(wrappedNativeToken[block.chainid]).deposit{value: msg.value}();
    }

    function executeSwap(SwapOrder calldata order) external payable nonReentrant returns (uint256 amountOut) {
        require(order.steps.length > 0, "Invalid number of swap steps");
        require(order.deadline >= block.timestamp, "Deadline expired");

        address wrappedNative = wrappedNativeToken[block.chainid];
        require(wrappedNative != address(0), "Wrapped native token not set for this chain");

        uint256 currentAmountIn;
        address currentTokenIn = order.steps[0].tokenIn;

        if (currentTokenIn == wrappedNative && msg.value > 0) {
            // Convert received ETH to WETH
            IWETH(wrappedNative).deposit{value: msg.value}();
            currentAmountIn = msg.value;
        } else {
            currentAmountIn = order.steps[0].amount;
            IERC20(currentTokenIn).safeTransferFrom(msg.sender, address(this), currentAmountIn);
        }

        for (uint i = 0; i < order.steps.length; i++) {
            SwapStep memory step = order.steps[i];
            require(step.tokenIn == currentTokenIn, "Invalid token path");

            currentAmountIn = _executeSwapStep(step, currentAmountIn, order.deadline);
            currentTokenIn = step.tokenOut;
        }

        amountOut = currentAmountIn;
        require(amountOut >= order.minAmountOut, "Slippage too high");

        if (currentTokenIn == wrappedNative) {
            // Check the balance before withdrawal
            uint256 wethBalance = IWETH(wrappedNative).balanceOf(address(this));
            require(wethBalance >= amountOut, "Insufficient WETH balance");

            // Convert WETH back to ETH and send to user
            IWETH(wrappedNative).withdraw(amountOut);
            (bool success, ) = payable(msg.sender).call{value: amountOut}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(currentTokenIn).safeTransfer(msg.sender, amountOut);
        }

        emit SwapExecuted(msg.sender, order.steps[0].amount, amountOut);
    }

    function _executeSwapStep(SwapStep memory step, uint256 amountIn, uint256 deadline) internal returns (uint256) {
        address router = dexRouters[step.dex];
        require(router != address(0), "Invalid DEX router");

        IERC20(step.tokenIn).approve(router, amountIn);

        bytes memory path = abi.encodePacked(step.tokenIn, step.fee, step.tokenOut);
        bytes memory callData;

        if (step.swapType == SwapType.EXACT_INPUT) {
            callData = abi.encodeWithSelector(
                ISwapRouter.exactInput.selector,
                ISwapRouter.ExactInputParams({
                    path: path,
                    recipient: address(this),
                    deadline: deadline,
                    amountIn: amountIn,
                    amountOutMinimum: 0
                })
            );
        } else {
            callData = abi.encodeWithSelector(
                ISwapRouter.exactOutput.selector,
                ISwapRouter.ExactOutputParams({
                    path: path,
                    recipient: address(this),
                    deadline: deadline,
                    amountOut: step.amount,
                    amountInMaximum: amountIn
                })
            );
        }

        (bool success, bytes memory result) = router.call(callData);
        require(success, "Swap failed");

        IERC20(step.tokenIn).approve(router, 0);

        return abi.decode(result, (uint256));
    }

    function updateDEXRouter(DEX dex, address newRouter) external onlyOwner {
        require(newRouter != address(0), "Invalid router address");
        dexRouters[dex] = newRouter;
        emit RouterUpdated(dex, newRouter);
    }

    function updateWrappedNativeToken(uint256 chainId, address newAddress) external onlyOwner {
        require(newAddress != address(0), "Invalid wrapped native token address");
        wrappedNativeToken[chainId] = newAddress;
        emit WrappedNativeTokenUpdated(chainId, newAddress);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
}

