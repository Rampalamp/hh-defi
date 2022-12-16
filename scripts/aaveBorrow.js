const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");

async function main() {
    //aave protocol treats everything as ERC20, so we need to wrap our eth WETH

    await getWeth();
    const { deployer } = await getNamedAccounts();

    //abi, address

    //LendingPoolAddressProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    const lendingPool = await getLendingPool(deployer);

    console.log(`LendingPool address ${lendingPool.address}`);
    //make a deposit, before we deposit we must submit approval to the aave contract
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    //we want to get the LENDING POOL approval to pull our WETH token from the WETH contract.
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("depositing....");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("deposited!!");

    //now we can start borrowing.
    //how much we have borrowed, how much we have in collateral, how much we CAN borrow.
    //aave has getUserAccountData();
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
        lendingPool,
        deployer
    );

    // how much DAI can we borrow based on the ETH amount we can borrow.
    const daiPrice = await getDAIPrice();
    const amountDaiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
    console.log(`Can borrow ${amountDaiToBorrow} of DAI`);
    //DAI has same amount of decimals as ETHER (18) so we can simply use parseEther to get the amount in wei.
    const amountDaiToBorrowWei = ethers.utils.parseEther(
        amountDaiToBorrow.toString()
    );

    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

    await borrowDai(
        daiTokenAddress,
        lendingPool,
        amountDaiToBorrowWei,
        deployer
    );

    await getBorrowUserData(lendingPool, deployer);

    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);

    await getBorrowUserData(lendingPool, deployer);
}
async function repay(amount, daiAddress, lendingPool, account) {
    //need to approve the dai so that aave can reclaim the amount borrowed.
    await approveErc20(daiAddress, lendingPool.address, amount, account);
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
    await repayTx.wait(1);
    console.log("Repaid!");
}
async function borrowDai(
    daiAddress,
    lendingPool,
    amountDaiToBorrowWei,
    account
) {
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        1,
        0,
        account
    );
    await borrowTx.wait(1);

    console.log("You've borrowed!");
}

async function getDAIPrice() {
    //since we are only reading from the contract, we don't need to add a signer/account into the getContractAt.
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4" //DAI-ETH ChainLink price feed address
    );
    //the answer is at index 1, so just wrap the call and grab data at the 1 index.
    const price = (await daiEthPriceFeed.latestRoundData())[1];
    console.log(`The DAI/ETH price is ${price.toString()}`);

    return price;
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account);

    console.log(`You have ${totalCollateralETH} ETH DEPOSITED.`);
    console.log(`You have ${totalDebtETH} ETH BORROWED.`);
    console.log(`You CAN BORROW ${availableBorrowsETH} worth of ETH.`);

    return { availableBorrowsETH, totalDebtETH };
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    );

    const lendingPoolAddress =
        await lendingPoolAddressesProvider.getLendingPool();

    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    );

    return lendingPool;
}

async function approveErc20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    account
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account
    );
    console.log("Calling APPROVE");
    const tx = await erc20Token.approve(spenderAddress, amountToSpend);
    await tx.wait(1);
    console.log(`Approved for ${amountToSpend}`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
