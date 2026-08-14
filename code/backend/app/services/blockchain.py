"""
Blockchain integration: a resilient Web3 gateway to the smart contracts in
../blockchain (see blockchain/README.md for the contract suite itself).

Design notes
------------
* Every public method returns a `{"success": bool, ...}` dict and never lets
  a Web3/connection exception propagate. If no RPC endpoint is reachable, or
  a contract hasn't been deployed/configured yet, methods report that in the
  response rather than raising - the rest of the app must keep working with
  blockchain features fully unset (mirrors how REDIS_URL / ALPHA_VANTAGE_
  API_KEY are optional elsewhere in config.py).
* Contract addresses are resolved two ways: an explicit
  `<CONTRACT>_CONTRACT_ADDRESS` env var always wins; otherwise the service
  reads the deployed address for the connected network straight out of the
  Truffle build artifact (BLOCKCHAIN_ARTIFACTS_DIR), keyed by
  `net_version` - the same identifier Truffle itself writes into
  `networks{}` in build/contracts/*.json. This is *not* the same value as
  EIP-155 chain_id in general, even though they coincide for this project's
  ganache setup (see docker-compose.yml / blockchain README).
"""

import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

from flask import current_app
from web3 import Web3
from web3.contract.contract import Contract

logger = logging.getLogger(__name__)

# Contract name -> the config key holding its explicit address override.
_CONTRACT_ADDRESS_CONFIG_KEYS = {
    "DataTracking": "DATA_TRACKING_CONTRACT_ADDRESS",
    "TrendAnalysis": "TREND_ANALYSIS_CONTRACT_ADDRESS",
    "QuantumVestToken": "QUANTUMVEST_TOKEN_CONTRACT_ADDRESS",
    "QuantumVestOracle": "QUANTUMVEST_ORACLE_CONTRACT_ADDRESS",
}


class BlockchainService:
    """Service for reading/writing the QuantumVest smart contract suite."""

    # ─────────────────────────────────────────────────────────────
    # Connection
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _get_w3() -> Optional[Web3]:
        if not current_app.config.get("BLOCKCHAIN_ENABLED", True):
            return None
        provider_uri = current_app.config.get("WEB3_PROVIDER_URI")
        if not provider_uri:
            return None
        try:
            w3 = Web3(Web3.HTTPProvider(provider_uri, request_kwargs={"timeout": 3}))
            if not w3.is_connected():
                return None
            return w3
        except Exception as exc:
            logger.warning("Web3 provider %s unreachable: %s", provider_uri, exc)
            return None

    @staticmethod
    def is_connected() -> bool:
        return BlockchainService._get_w3() is not None

    # ─────────────────────────────────────────────────────────────
    # Contract resolution
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _load_artifact(contract_name: str) -> Optional[Dict[str, Any]]:
        artifacts_dir = current_app.config.get("BLOCKCHAIN_ARTIFACTS_DIR")
        if not artifacts_dir:
            return None
        path = os.path.join(artifacts_dir, f"{contract_name}.json")
        if not os.path.isfile(path):
            return None
        try:
            with open(path) as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Could not read contract artifact %s: %s", path, exc)
            return None

    @staticmethod
    def _resolve_address(
        w3: Web3, contract_name: str, artifact: Optional[Dict[str, Any]]
    ) -> Optional[str]:
        # 1. Explicit config/env override always wins.
        config_key = _CONTRACT_ADDRESS_CONFIG_KEYS.get(contract_name)
        override = current_app.config.get(config_key) if config_key else None
        if override:
            try:
                return Web3.to_checksum_address(override)
            except ValueError:
                logger.warning("Invalid %s override address: %s", config_key, override)
                return None

        # 2. Else, look up the Truffle artifact for the connected network.
        if not artifact:
            return None
        try:
            network_id = w3.net.version
        except Exception:
            return None
        entry = artifact.get("networks", {}).get(str(network_id))
        if not entry or not entry.get("address"):
            return None
        return Web3.to_checksum_address(entry["address"])

    @staticmethod
    def _get_contract(
        contract_name: str,
    ) -> Tuple[Optional[Web3], Optional[Contract], Optional[str]]:
        """Returns (w3, contract, error). `contract` is None if unavailable,
        with `error` explaining why (no connection / no artifact / no
        deployed address for this network)."""
        w3 = BlockchainService._get_w3()
        if w3 is None:
            return None, None, "Not connected to a Web3 provider"

        artifact = BlockchainService._load_artifact(contract_name)
        if not artifact:
            return w3, None, f"No build artifact found for {contract_name}"

        address = BlockchainService._resolve_address(w3, contract_name, artifact)
        if not address:
            return (
                w3,
                None,
                f"{contract_name} is not deployed on the connected network",
            )

        contract = w3.eth.contract(address=address, abi=artifact["abi"])
        return w3, contract, None

    # ─────────────────────────────────────────────────────────────
    # Status
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def status() -> Dict[str, Any]:
        w3 = BlockchainService._get_w3()
        if w3 is None:
            return {
                "connected": False,
                "provider": current_app.config.get("WEB3_PROVIDER_URI"),
            }
        try:
            contracts = {}
            for name in _CONTRACT_ADDRESS_CONFIG_KEYS:
                artifact = BlockchainService._load_artifact(name)
                address = BlockchainService._resolve_address(w3, name, artifact)
                contracts[name] = address

            return {
                "connected": True,
                "provider": current_app.config.get("WEB3_PROVIDER_URI"),
                "chain_id": w3.eth.chain_id,
                "network_id": w3.net.version,
                "block_number": w3.eth.block_number,
                "contracts": contracts,
            }
        except Exception as exc:
            logger.error("blockchain status error: %s", exc)
            return {"connected": False, "error": str(exc)}

    # ─────────────────────────────────────────────────────────────
    # TrendAnalysis (Chainlink price feed reader)
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_price_trend() -> Dict[str, Any]:
        _w3, contract, error = BlockchainService._get_contract("TrendAnalysis")
        if contract is None:
            return {"success": False, "error": error}
        try:
            price = contract.functions.getPriceTrend().call()
            return {"success": True, "price": price}
        except Exception as exc:
            logger.error("get_price_trend error: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def get_moving_average(window: int) -> Dict[str, Any]:
        _w3, contract, error = BlockchainService._get_contract("TrendAnalysis")
        if contract is None:
            return {"success": False, "error": error}
        try:
            ma = contract.functions.calculateMA(window).call()
            return {"success": True, "moving_average": ma, "window": window}
        except Exception as exc:
            logger.error("get_moving_average error: %s", exc)
            return {"success": False, "error": str(exc)}

    # ─────────────────────────────────────────────────────────────
    # DataTracking (on-chain market data log)
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_historical_market_data(ticker: str) -> Dict[str, Any]:
        _w3, contract, error = BlockchainService._get_contract("DataTracking")
        if contract is None:
            return {"success": False, "error": error}
        try:
            points = contract.functions.getHistoricalData(ticker).call()
            return {
                "success": True,
                "ticker": ticker,
                "data": [
                    {"timestamp": p[0], "price": p[1], "volume": p[2]} for p in points
                ],
            }
        except Exception as exc:
            logger.error("get_historical_market_data error: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def record_market_data(ticker: str, price: int, volume: int) -> Dict[str, Any]:
        """Writes a data point on-chain. Requires BLOCKCHAIN_PRIVATE_KEY to
        be the DataTracking contract's owner account (see contracts/
        DataTracking.sol - addDataPoint is onlyOwner)."""
        w3, contract, error = BlockchainService._get_contract("DataTracking")
        if contract is None:
            return {"success": False, "error": error}

        private_key = current_app.config.get("BLOCKCHAIN_PRIVATE_KEY")
        if not private_key:
            return {
                "success": False,
                "error": (
                    "BLOCKCHAIN_PRIVATE_KEY is not configured; writing to "
                    "the blockchain requires a signing key for the "
                    "DataTracking contract's owner account."
                ),
            }

        try:
            account = w3.eth.account.from_key(private_key)
            nonce = w3.eth.get_transaction_count(account.address)
            tx = contract.functions.addDataPoint(
                ticker, int(price), int(volume)
            ).build_transaction(
                {
                    "from": account.address,
                    "nonce": nonce,
                    "chainId": w3.eth.chain_id,
                }
            )
            signed = account.sign_transaction(tx)
            raw_tx = getattr(signed, "raw_transaction", None) or signed.rawTransaction
            tx_hash = w3.eth.send_raw_transaction(raw_tx)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            return {
                "success": receipt.status == 1,
                "transaction_hash": tx_hash.hex(),
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
            }
        except Exception as exc:
            logger.error("record_market_data error: %s", exc)
            return {"success": False, "error": str(exc)}

    # ─────────────────────────────────────────────────────────────
    # QuantumVestToken / QuantumVestOracle
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_token_balance(address: str) -> Dict[str, Any]:
        w3, contract, error = BlockchainService._get_contract("QuantumVestToken")
        if contract is None:
            return {"success": False, "error": error}
        try:
            checksum = Web3.to_checksum_address(address)
            balance_wei = contract.functions.balanceOf(checksum).call()
            return {
                "success": True,
                "address": checksum,
                "balance_wei": str(balance_wei),
                "balance": str(w3.from_wei(balance_wei, "ether")),
            }
        except ValueError as exc:
            return {"success": False, "error": f"Invalid address: {exc}"}
        except Exception as exc:
            logger.error("get_token_balance error: %s", exc)
            return {"success": False, "error": str(exc)}

    @staticmethod
    def get_oracle_price(asset_address: str) -> Dict[str, Any]:
        _w3, contract, error = BlockchainService._get_contract("QuantumVestOracle")
        if contract is None:
            return {"success": False, "error": error}
        try:
            checksum = Web3.to_checksum_address(asset_address)
            if not contract.functions.isPriceValid(checksum).call():
                return {
                    "success": False,
                    "error": "No valid (fresh, high-confidence) price for this asset",
                }
            price, timestamp = contract.functions.getPriceWithTimestamp(checksum).call()
            return {
                "success": True,
                "asset": checksum,
                "price": price,
                "timestamp": timestamp,
            }
        except ValueError as exc:
            return {"success": False, "error": f"Invalid address: {exc}"}
        except Exception as exc:
            logger.error("get_oracle_price error: %s", exc)
            return {"success": False, "error": str(exc)}
