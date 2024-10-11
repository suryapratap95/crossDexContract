

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CrossDEXSwapModule", (m) => {
  // Deployment parameters can be customized as needed
  const chainId = m.getParameter("chainId", 31337); // chain ID for hardhat network
  const wethAddress = m.getParameter("wethAddress", "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"); // Address from the weth contract 
  const usdtAddress = m.getParameter("usdtAddress", "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"); // address from the  USDT contract
  const mockRouterAddress = m.getParameter("mockRouterAddress", "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"); // address from the   Router Contract

  // Deploy contracts
  const crossDEXSwap = m.contract("CrossDEXSwap", [], { gasLimit: 500_000 });
  const mockERC20 = m.contract("MockERC20", ["Mock USDT", "MUSDT"], { gasLimit: 500_000 });
  const mockWETH = m.contract("MockWETH", [], { gasLimit: 500_000 });
  const mockRouter = m.contract("MockRouter", [], { gasLimit: 500_000 });

  // Optionally mint tokens for testing
  mockERC20.call("mint", [crossDEXSwap.address, 1_000_000_000n]); // Mint 1 million tokens
  mockWETH.call("mint", [crossDEXSwap.address, 1_000_000n]); // Mint 1,000 WETH

  return {
    crossDEXSwap,
    mockERC20,
    mockWETH,
    mockRouter,
  };
});
