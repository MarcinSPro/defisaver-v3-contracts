const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAaveDataProvider,
    getAaveTokenInfo,
    getAaveReserveInfo,
    VARIABLE_RATE,
    STABLE_RATE,
    aaveV2assetsDefaultMarket
} = require('../utils-aave');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    isEth,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    ETH_ADDR,
    AAVE_MARKET,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

const {
    supplyAave,
    borrowAave,
} = require('../actions');

describe("Aave-Borrow", function () {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, tokensInAave, dataProvider;

    before(async () => {
        await redeploy('AaveBorrow');
        await redeploy('DFSSell');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        dataProvider = await getAaveDataProvider();

        tokensInAave = await dataProvider.getAllReservesTokens();

    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];

        it(`... should variable borrow ${standardAmounts[tokenSymbol]} ${tokenSymbol} from Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            let addr = assetInfo.address;

            if (isEth(addr)) {
                addr = WETH_ADDRESS;
            }

            const reserveInfo = await getAaveReserveInfo(dataProvider, addr);

            if (!reserveInfo.borrowingEnabled) {
                expect(true).to.be.true;
                return;
            }

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            // eth bada bing bada bum
            await supplyAave(proxy, AAVE_MARKET,ethers.utils.parseUnits('3', 18), ETH_ADDR, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await borrowAave(proxy, AAVE_MARKET, assetInfo.address, amount, VARIABLE_RATE, senderAcc.address);
    
            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        });

        it(`... should stable borrow ${standardAmounts[tokenSymbol]} ${tokenSymbol} from Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            let addr = assetInfo.address;

            if (isEth(addr)) {
                addr = WETH_ADDRESS;
            }

            const reserveInfo = await getAaveReserveInfo(dataProvider, addr);

            if (!reserveInfo.stableBorrowRateEnabled) {
                expect(true).to.be.true;
                return;
            }

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            // eth bada bing bada bum
            await supplyAave(proxy, AAVE_MARKET,ethers.utils.parseUnits('3', 18), ETH_ADDR, senderAcc.address);

            const balanceBefore = await balanceOf(assetInfo.address, senderAcc.address);

            await borrowAave(proxy, AAVE_MARKET, assetInfo.address, amount, STABLE_RATE, senderAcc.address);
    
            const balanceAfter = await balanceOf(assetInfo.address, senderAcc.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        });
    }

});
