from __future__ import annotations

import json
import os
import time
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware


ESCROW_ABI: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "createEscrow",
        "stateMutability": "payable",
        "inputs": [
            {"name": "seller", "type": "address"},
            {"name": "durationSeconds", "type": "uint64"},
            {"name": "agreementHash", "type": "bytes32"},
        ],
        "outputs": [{"name": "escrowId", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "release",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "escrowId", "type": "uint256"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "dispute",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "escrowId", "type": "uint256"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "claimTimeout",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "escrowId", "type": "uint256"}],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "withdraw",
        "stateMutability": "nonpayable",
        "inputs": [],
        "outputs": [],
    },
    {
        "type": "function",
        "name": "pendingWithdrawals",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "type": "function",
        "name": "usedAgreementHash",
        "stateMutability": "view",
        "inputs": [{"name": "agreementHash", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "type": "event",
        "name": "EscrowCreated",
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "escrowId", "type": "uint256"},
            {"indexed": True, "name": "buyer", "type": "address"},
            {"indexed": True, "name": "seller", "type": "address"},
            {"indexed": False, "name": "amount", "type": "uint256"},
            {"indexed": False, "name": "deadline", "type": "uint64"},
            {"indexed": False, "name": "agreementHash", "type": "bytes32"},
        ],
    },
]


@dataclass(frozen=True)
class EscrowOrder:
    order_id: str
    escrow_id: int
    buyer: str
    seller: str
    amount_wei: int
    duration_seconds: int
    agreement_hash: str
    tx_hash: str
    deadline: int | None


def _env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def eth_to_wei(amount_eth: str | Decimal) -> int:
    return int(Decimal(str(amount_eth)) * Decimal(10) ** 18)


class AIAgentEscrowClient:
    def __init__(
        self,
        rpc_url: str,
        contract_address: str,
        private_key: str,
        chain_id: int = 84532,
    ) -> None:
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        if not self.w3.is_connected():
            raise RuntimeError(f"Cannot connect to RPC: {rpc_url}")

        self.chain_id = chain_id
        self.account = self.w3.eth.account.from_key(private_key)
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=ESCROW_ABI,
        )

    @classmethod
    def from_env(cls) -> "AIAgentEscrowClient":
        return cls(
            rpc_url=_env("AI_ESCROW_RPC_URL", "https://sepolia.base.org"),
            contract_address=_env("AI_ESCROW_CONTRACT_ADDRESS"),
            private_key=_env("AI_BUYER_PRIVATE_KEY"),
            chain_id=int(_env("AI_ESCROW_CHAIN_ID", "84532")),
        )

    def create_order_and_lock_funds(
        self,
        seller_address: str,
        amount_eth: str,
        duration_seconds: int = 3600,
        metadata: dict[str, Any] | None = None,
    ) -> EscrowOrder:
        order_id = f"ord_{int(time.time())}_{uuid.uuid4().hex}"
        seller = Web3.to_checksum_address(seller_address)
        amount_wei = eth_to_wei(amount_eth)
        payload = {
            "orderId": order_id,
            "buyer": self.account.address,
            "seller": seller,
            "amountWei": str(amount_wei),
            "durationSeconds": duration_seconds,
            "metadata": metadata or {},
        }
        agreement_hash_bytes = self.w3.keccak(
            text=json.dumps(payload, sort_keys=True, separators=(",", ":"))
        )

        tx = self.contract.functions.createEscrow(
            seller,
            duration_seconds,
            agreement_hash_bytes,
        ).build_transaction(
            {
                "from": self.account.address,
                "value": amount_wei,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "chainId": self.chain_id,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        tx["gas"] = int(self.w3.eth.estimate_gas(tx) * 1.2)

        signed = self.account.sign_transaction(tx)
        raw_tx = getattr(signed, "rawTransaction", None) or signed.raw_transaction
        tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)

        escrow_id = -1
        deadline = None
        events = self.contract.events.EscrowCreated().process_receipt(receipt)
        if events:
            escrow_id = int(events[0]["args"]["escrowId"])
            deadline = int(events[0]["args"]["deadline"])

        return EscrowOrder(
            order_id=order_id,
            escrow_id=escrow_id,
            buyer=self.account.address,
            seller=seller,
            amount_wei=amount_wei,
            duration_seconds=duration_seconds,
            agreement_hash=agreement_hash_bytes.hex(),
            tx_hash=tx_hash.hex(),
            deadline=deadline,
        )

    def pending_withdrawal(self, account: str | None = None) -> int:
        address = Web3.to_checksum_address(account or self.account.address)
        return int(self.contract.functions.pendingWithdrawals(address).call())

    def withdraw(self) -> str:
        tx = self.contract.functions.withdraw().build_transaction(
            {
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "chainId": self.chain_id,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        tx["gas"] = int(self.w3.eth.estimate_gas(tx) * 1.2)

        signed = self.account.sign_transaction(tx)
        raw_tx = getattr(signed, "rawTransaction", None) or signed.raw_transaction
        tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
        self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        return tx_hash.hex()


if __name__ == "__main__":
    client = AIAgentEscrowClient.from_env()
    order = client.create_order_and_lock_funds(
        seller_address=_env("AI_SELLER_ADDRESS"),
        amount_eth=_env("AI_ESCROW_AMOUNT_ETH", "0.001"),
        duration_seconds=int(_env("AI_ESCROW_DURATION_SECONDS", "3600")),
        metadata={"source": "python-sdk-copy-paste"},
    )
    print(json.dumps(order.__dict__, indent=2))
