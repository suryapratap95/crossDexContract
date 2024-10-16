// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Add ISwapRouter interface
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




contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract MockWETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

   function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "MockWETH: insufficient balance");
        _burn(msg.sender, amount);
        // Instead of trying to transfer ETH, we'll just emit an event
        emit Withdrawal(msg.sender, amount);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    // Add this function to check contract's ETH balance
    function getETHBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    event Withdrawal(address indexed user, uint256 amount);
}

contract MockRouter {
    uint256 private mockReturn;

    function setMockReturn(uint256 _mockReturn) public {
        mockReturn = _mockReturn;
    }

    function exactInput(ISwapRouter.ExactInputParams calldata) external payable returns (uint256) {
        return mockReturn;
    }

    function exactOutput(ISwapRouter.ExactOutputParams calldata) external payable returns (uint256) {
        return mockReturn;
    }
}