// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AIAgentEscrow is Ownable, ReentrancyGuard {
    uint16 public constant FEE_BPS = 50;
    uint16 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_ESCROW_AMOUNT = BPS_DENOMINATOR / FEE_BPS;

    enum EscrowStatus {
        None,
        Funded,
        Released,
        Burned,
        TimedOut
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint256 feeAmount;
        uint256 sellerAmount;
        uint64 createdAt;
        uint64 deadline;
        bytes32 agreementHash;
        EscrowStatus status;
    }

    uint256 public nextEscrowId;
    address public feeWallet;
    address public immutable deadWallet;

    mapping(uint256 => Escrow) public escrows;
    mapping(bytes32 => bool) public usedAgreementHash;
    mapping(address => uint256) public pendingWithdrawals;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint64 deadline,
        bytes32 agreementHash
    );
    event EscrowReleased(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 sellerAmount,
        uint256 feeAmount,
        address feeWallet
    );
    event EscrowBurned(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed deadWallet,
        uint256 amount
    );
    event EscrowTimedOut(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 sellerAmount,
        uint256 feeAmount,
        address feeWallet
    );
    event FeeWalletUpdated(address indexed oldFeeWallet, address indexed newFeeWallet);
    event WithdrawalClaimed(address indexed account, uint256 amount);

    error ZeroAddress();
    error InvalidDuration();
    error AmountBelowMinimum(uint256 minimumAmount);
    error InvalidAgreementHash();
    error AgreementHashAlreadyUsed(bytes32 agreementHash);
    error EscrowNotFunded();
    error OnlyBuyer();
    error EscrowExpired();
    error EscrowStillActive(uint64 deadline);
    error NoPendingWithdrawal();
    error NativeTransferFailed(address recipient, uint256 amount);

    constructor(
        address initialOwner,
        address initialFeeWallet,
        address deadWallet_
    ) Ownable(initialOwner) {
        if (initialOwner == address(0) || initialFeeWallet == address(0) || deadWallet_ == address(0)) {
            revert ZeroAddress();
        }

        feeWallet = initialFeeWallet;
        deadWallet = deadWallet_;
    }

    function createEscrow(
        address seller,
        uint64 durationSeconds,
        bytes32 agreementHash
    ) external payable nonReentrant returns (uint256 escrowId) {
        if (seller == address(0)) {
            revert ZeroAddress();
        }
        if (durationSeconds == 0) {
            revert InvalidDuration();
        }
        if (msg.value < MIN_ESCROW_AMOUNT) {
            revert AmountBelowMinimum(MIN_ESCROW_AMOUNT);
        }
        if (agreementHash == bytes32(0)) {
            revert InvalidAgreementHash();
        }
        if (usedAgreementHash[agreementHash]) {
            revert AgreementHashAlreadyUsed(agreementHash);
        }

        uint256 deadline = block.timestamp + uint256(durationSeconds);
        require(deadline <= type(uint64).max, "deadline overflow");

        escrowId = ++nextEscrowId;
        usedAgreementHash[agreementHash] = true;
        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            feeAmount: 0,
            sellerAmount: 0,
            createdAt: uint64(block.timestamp),
            deadline: uint64(deadline),
            agreementHash: agreementHash,
            status: EscrowStatus.Funded
        });

        emit EscrowCreated(escrowId, msg.sender, seller, msg.value, uint64(deadline), agreementHash);
    }

    function release(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _requireFundedEscrow(escrowId);
        _requireBuyer(escrow);

        _releaseToSeller(escrowId, escrow, EscrowStatus.Released);
    }

    function dispute(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _requireFundedEscrow(escrowId);
        _requireBuyer(escrow);

        if (block.timestamp > escrow.deadline) {
            revert EscrowExpired();
        }

        uint256 amount = escrow.amount;
        escrow.status = EscrowStatus.Burned;

        _sendNative(deadWallet, amount);

        emit EscrowBurned(escrowId, msg.sender, deadWallet, amount);
    }

    function claimTimeout(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _requireFundedEscrow(escrowId);

        if (block.timestamp <= escrow.deadline) {
            revert EscrowStillActive(escrow.deadline);
        }

        _releaseToSeller(escrowId, escrow, EscrowStatus.TimedOut);
    }

    function updateFeeWallet(address newFeeWallet) external onlyOwner {
        if (newFeeWallet == address(0)) {
            revert ZeroAddress();
        }

        address oldFeeWallet = feeWallet;
        feeWallet = newFeeWallet;

        emit FeeWalletUpdated(oldFeeWallet, newFeeWallet);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) {
            revert NoPendingWithdrawal();
        }

        pendingWithdrawals[msg.sender] = 0;
        _sendNative(msg.sender, amount);

        emit WithdrawalClaimed(msg.sender, amount);
    }

    function quoteFee(uint256 amount) public pure returns (uint256 feeAmount, uint256 sellerAmount) {
        feeAmount = (amount * FEE_BPS) / BPS_DENOMINATOR;
        sellerAmount = amount - feeAmount;
    }

    function _releaseToSeller(
        uint256 escrowId,
        Escrow storage escrow,
        EscrowStatus finalStatus
    ) internal {
        address currentFeeWallet = feeWallet;
        (uint256 feeAmount, uint256 sellerAmount) = quoteFee(escrow.amount);

        escrow.status = finalStatus;
        escrow.feeAmount = feeAmount;
        escrow.sellerAmount = sellerAmount;

        pendingWithdrawals[currentFeeWallet] += feeAmount;
        pendingWithdrawals[escrow.seller] += sellerAmount;

        if (finalStatus == EscrowStatus.TimedOut) {
            emit EscrowTimedOut(
                escrowId,
                escrow.buyer,
                escrow.seller,
                escrow.amount,
                sellerAmount,
                feeAmount,
                currentFeeWallet
            );
        } else {
            emit EscrowReleased(
                escrowId,
                escrow.buyer,
                escrow.seller,
                escrow.amount,
                sellerAmount,
                feeAmount,
                currentFeeWallet
            );
        }
    }

    function _requireFundedEscrow(uint256 escrowId) internal view returns (Escrow storage escrow) {
        escrow = escrows[escrowId];
        if (escrow.status != EscrowStatus.Funded) {
            revert EscrowNotFunded();
        }
    }

    function _requireBuyer(Escrow storage escrow) internal view {
        if (msg.sender != escrow.buyer) {
            revert OnlyBuyer();
        }
    }

    function _sendNative(address recipient, uint256 amount) internal {
        (bool sent, ) = recipient.call{value: amount}("");
        if (!sent) {
            revert NativeTransferFailed(recipient, amount);
        }
    }
}
