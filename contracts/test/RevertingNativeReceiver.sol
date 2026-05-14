// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract RevertingNativeReceiver {
    receive() external payable {
        revert("native rejected");
    }
}
