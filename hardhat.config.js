require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const LOCALHOST_RPC_URL = process.env.LOCALHOST_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_FORK_URL = process.env.ALCHEMY_FORK_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            forking: {
                url: ALCHEMY_FORK_URL,
            },
        },
        localhost: {
            chainId: 31337,
            blockConfirmations: 1,
            url: LOCALHOST_RPC_URL,
            accounts: [PRIVATE_KEY],
        },
    },
    solidity: {
        compilers: [
            { version: "0.8.7" },
            { version: "0.4.19" },
            { version: "0.6.12" },
            { version: "0.6.6" },
        ],
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        player: {
            default: 1,
        },
    },
    gasReporter: {
        enabled: false,
    },
    mocha: {
        timeout: 300000,
    },
};
