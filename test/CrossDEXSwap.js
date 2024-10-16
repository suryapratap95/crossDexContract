const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrossDEXSwap", function () {
  let CrossDEXSwap, crossDEXSwap, owner, addr1, addr2;
  let MockERC20, tokenA, tokenB, tokenC;
  let MockRouter, uniswapRouter, pancakeRouter, sushiRouter;
  let MockWETH, weth;


  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    console.log("owner", owner.address);
    console.log("addr1", addr1.address);
    console.log("addr2", addr2.address);

    // Token Deploy Tokens
    MockERC20 = await ethers.getContractFactory("MockERC20");
    console.log("MockERC20 factory created");

    
    tokenA = await MockERC20.deploy("Token A", "TKA");
    console.log("Token A deployed at:", tokenA.target);
    expect(tokenA.target).to.be.properAddress;

    tokenB = await MockERC20.deploy("Token B", "TKB");
    expect(tokenB.target).to.properAddress; // Address validation
    console.log("Token B deployed at:", tokenB.target);

    tokenC = await MockERC20.deploy("Token C", "TKC");
    expect(tokenC.target).to.properAddress; // Address validation
    console.log("Token C deployed at:", tokenC.target);

    // Deploy mock WETH
    MockWETH = await ethers.getContractFactory("MockWETH");
    weth = await MockWETH.deploy();
    expect(weth.target).to.properAddress; // Ensure the address is valid
    console.log("WETH deployed at:", weth.target);

    // Deploy mock routers
    MockRouter = await ethers.getContractFactory("MockRouter");
    console.log("MockRouter factory created");

    uniswapRouter = await MockRouter.deploy();
    expect(uniswapRouter.target).to.properAddress; // Ensure the address is valid
    console.log("Uniswap Router deployed at:", uniswapRouter.target);

    pancakeRouter = await MockRouter.deploy();
    expect(pancakeRouter.target).to.properAddress; // Ensure the address is valid
    console.log("Pancake Router deployed at:", pancakeRouter.target);

    sushiRouter = await MockRouter.deploy();
    expect(sushiRouter.target).to.properAddress; // Ensure the address is valid
    console.log("Sushi Router deployed at:", sushiRouter.target);

    // Deploy CrossDEXSwap
    CrossDEXSwap = await ethers.getContractFactory("CrossDEXSwap");
    crossDEXSwap = await CrossDEXSwap.deploy();
    expect(crossDEXSwap.target).to.properAddress; // Ensure the address is valid
    console.log("CrossDEXSwap deployed at:", crossDEXSwap.target);

    // Set up routers and wrapped native token
    await crossDEXSwap.updateDEXRouter(0, uniswapRouter.target);
    await crossDEXSwap.updateDEXRouter(1, pancakeRouter.target);
    await crossDEXSwap.updateDEXRouter(2, sushiRouter.target);
    await crossDEXSwap.updateWrappedNativeToken(31337, weth.target); // 31337  Hardhat Network chainID

    console.log("Setup completed successfully");
  });

  describe("Swap Execution", function () {
    it("Should execute a multi-step swap across different DEXes", async function () {
      // Mint tokens to addr1

      await tokenA.mint(addr1.address, ethers.parseUnits("1000", 18));
      console.log("Minted 1000 Token A to addr1");
  
      // Approve CrossDEXSwap to spend addr1's tokens
      await tokenA.connect(addr1).approve(crossDEXSwap.target, ethers.parseUnits("1000", 18));
      console.log("Approved CrossDEXSwap to spend addr1's Token A");
  
      // Set up mock returns for routers
      await uniswapRouter.setMockReturn(ethers.parseUnits("200", 18)); // 1000 TKA -> 200 TKB
      await pancakeRouter.setMockReturn(ethers.parseUnits("150", 18)); // 200 TKB -> 150 TKC
      await sushiRouter.setMockReturn(ethers.parseUnits("100", 18)); // 150 TKC -> 100 WETH
      console.log("Set up mock returns for routers");
  
      // Mint some WETH to the CrossDEXSwap contract
      await weth.mint(crossDEXSwap.target, ethers.parseUnits("1000", 18));
      console.log("Minted 1000 WETH to CrossDEXSwap contract");
      
      // Create swap order
      const swapOrder = {
        steps: [
          {
            tokenIn: tokenA.target,
            tokenOut: tokenB.target,
            fee: 3000, // 0.3%
            dex: 0, // Uniswap
            amount: ethers.parseUnits("1000",18),
            swapType: 0 // EXACT_INPUT
          },
          {
            tokenIn: tokenB.target,
            tokenOut: tokenC.target,
            fee: 3000, // 0.3%
            dex: 1, // Pancakeswap
            amount: ethers.parseUnits("200",18),
            swapType: 0 // EXACT_INPUT
          },
          {
            tokenIn: tokenC.target,
            tokenOut: weth.target,
            fee: 3000, // 0.3%
            dex: 2, // Sushiswap
            amount: ethers.parseUnits("150",18),
            swapType: 0 // EXACT_INPUT
          }
        ],
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        minAmountOut: ethers.parseUnits("90",18) // Expect at least 90 WETH
      };

            // Create swap order
            const newswapOrder = {
              steps: [
                {
                  tokenIn: tokenA.target,
                  tokenOut: tokenB.target,
                  fee: 3000, // 0.3%
                  dex: 0, // Uniswap
                  amount: ethers.parseUnits("1000",18).toString(),
                  swapType: 0 // EXACT_INPUT
                },
                {
                  tokenIn: tokenB.target,
                  tokenOut: tokenC.target,
                  fee: 3000, // 0.3%
                  dex: 1, // Pancakeswap
                  amount: ethers.parseUnits("200",18).toString(),
                  swapType: 0 // EXACT_INPUT
                },
                {
                  tokenIn: tokenC.target,
                  tokenOut: weth.target,
                  fee: 3000, // 0.3%
                  dex: 2, // Sushiswap
                  amount: ethers.parseUnits("150",18).toString(),
                  swapType: 0 // EXACT_INPUT
                }
              ],
              deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
              minAmountOut: ethers.parseUnits("90",18).toString() // Expect at least 90 WETH
            };
      

       console.log("Swap order created:", JSON.stringify(newswapOrder, null, 2));

      // Execute swap
      try {
        const tx = await crossDEXSwap.connect(addr1).executeSwap(swapOrder);
        const receipt = await tx.wait();
        console.log("Swap executed successfully. Transaction hash:", receipt.hash);

        const swapEvent = receipt.events?.find(e => e.event === "SwapExecuted");
        if (swapEvent) {
            console.log("SwapExecuted event emitted with args:", swapEvent.args);
        } else {
            console.log("SwapExecuted event not found in transaction receipt");
        }
    } catch (error) {
        console.error("Error executing swap:", error);
        throw error;
    }



    // Check final balance
    const finalBalance = await weth.balanceOf(addr1.address);
    console.log("Final WETH balance of addr1:", ethers.formatEther(finalBalance));
    expect(finalBalance).to.equal(ethers.parseUnits("100", 18));

    });
  });
});
