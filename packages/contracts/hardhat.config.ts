import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 500 },
    },
  },
  networks: {
    hedera_testnet: {
      url: process.env.HEDERA_JSON_RPC_URL || '',
      accounts: process.env.HEDERA_PRIVATE_KEY_HEX
        ? [process.env.HEDERA_PRIVATE_KEY_HEX]
        : [],
      chainId: 296,
      timeout: 120_000,
    },
  },
  mocha: {
    timeout: 3_600_000, // Hedera needs longer finality
  },
};

export default config;
