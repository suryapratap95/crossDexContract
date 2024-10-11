

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MockModule", (m) => {
  // Deployment parameters can be customized as needed
  const mockERC20Name = m.getParameter("mockERC20Name", "Mock USDT");
  const mockERC20Symbol = m.getParameter("mockERC20Symbol", "MUSDT");
  const wethAmount = m.getParameter("wethAmount", 1000n); // Default to 1000 WETH
  const mockRouterReturnValue = m.getParameter("mockRouterReturnValue", 100n); 

  // Deploy contracts
  const mockERC20 = m.contract("MockERC20", [mockERC20Name, mockERC20Symbol], { gasLimit: 500_000 });
  const mockWETH = m.contract("MockWETH", [], { gasLimit: 500_000 });
  const mockRouter = m.contract("MockRouter", [], { gasLimit: 500_000 });

  // Optionally mint tokens for testing
  mockERC20.call("mint", [mockRouter.address, 1_000_000n]); // Mint 1 million tokens to MockRouter
  mockWETH.call("mint", [mockRouter.address, wethAmount]); // Mint specified WETH amount to MockRouter

  // Set a mock return value for the MockRouter
  mockRouter.call("setMockReturn", [mockRouterReturnValue]);

  return {
    mockERC20,
    mockWETH,
    mockRouter,
  };
});
