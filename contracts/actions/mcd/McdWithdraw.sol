// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/mcd/IManager.sol";
import "../../interfaces/mcd/IVat.sol";
import "../../interfaces/mcd/IJoin.sol";
import "../../DS/DSMath.sol";
import "../ActionBase.sol";

contract McdWithdraw is ActionBase, DSMath {
    address public constant MANAGER_ADDRESS = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;

    // TODO: remove
    // address public constant ETH_JOIN_ADDRESS = 0x2F0b23f53734252Bda2277357e97e1517d6B042A;

    IManager public constant manager = IManager(MANAGER_ADDRESS);
    IVat public constant vat = IVat(VAT_ADDRESS);

    function executeAction(uint, bytes memory _callData, bytes32[] memory _returnValues) override public payable returns (bytes32) {
        (uint cdpId, uint amount, address joinAddr) = parseParamData(_callData, _returnValues);

        uint frobAmount = amount;

        if (IJoin(joinAddr).dec() != 18) {
            frobAmount = amount * (10 ** (18 - IJoin(joinAddr).dec()));
        }

        manager.frob(cdpId, -toPositiveInt(frobAmount), 0);
        manager.flux(cdpId, address(this), frobAmount);

        IJoin(joinAddr).exit(address(this), amount);

        // if (joinAddr == ETH_JOIN_ADDRESS) {
        //     Join(joinAddr).gem().withdraw(amount); // Weth -> Eth
        // }

        logger.Log(address(this), msg.sender, "McdWithdraw", abi.encode(cdpId, amount, joinAddr));

        return bytes32(amount);
    }

    function actionType() override public pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseParamData(
        bytes memory _data,
        bytes32[] memory _returnValues
    ) public pure returns (uint cdpId,uint amount, address joinAddr) {
        uint8[] memory inputMapping;

        (cdpId, amount, joinAddr, inputMapping) = abi.decode(_data, (uint256,uint256,address,uint8[]));

        // mapping return values to new inputs
        if (inputMapping.length > 0 && _returnValues.length > 0) {
            for (uint i = 0; i < inputMapping.length; i += 2) {
                bytes32 returnValue = _returnValues[inputMapping[i + 1]];

                if (inputMapping[i] == 0) {
                    cdpId = uint(returnValue);
                } else if (inputMapping[i] == 1) {
                    amount = uint(returnValue);
                } else if (inputMapping[i] == 2) {
                    joinAddr = address(bytes20(returnValue));
                }
            }
        }
    }


    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint _x) internal pure returns (int y) {
        y = int(_x);
        require(y >= 0, "int-overflow");
    }
}