"""
Blockchain Integration Service for QuantumVest
Web3 integration for on-chain data analysis and DeFi features
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from web3 import Web3

logger = logging.getLogger(__name__)


class BlockchainService:
    """Service for blockchain integration and on-chain analysis"""

    def __init__(self, provider_url: Optional[str] = None) -> None:
        self.provider_url = (
            provider_url or "https://mainnet.infura.io/v3/your-project-id"
        )
        self.w3: Optional[Web3] = None
        self.initialize_web3()

    def initialize_web3(self) -> None:
        """Initialize Web3 connection"""
        try:
            self.w3 = Web3(Web3.HTTPProvider(self.provider_url))
            if self.w3.is_connected():
                logger.info("Successfully connected to Ethereum network")
            else:
                logger.warning("Failed to connect to Ethereum network")
        except Exception as e:
            logger.error(f"Error initializing Web3: {e}")
            self.w3 = None

    def get_wallet_balance(
        self, address: str, token_contracts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get wallet balance for ETH and ERC-20 tokens"""
        try:
            if not self.w3 or not self.w3.is_connected():
                return {"success": False, "error": "Web3 not connected"}
            if not Web3.is_address(address):
                return {"success": False, "error": "Invalid Ethereum address"}
            balances = {}
            eth_balance_wei = self.w3.eth.get_balance(address)
            eth_balance = self.w3.from_wei(eth_balance_wei, "ether")
            balances["ETH"] = {
                "balance": float(eth_balance),
                "symbol": "ETH",
                "name": "Ethereum",
                "decimals": 18,
            }
            if token_contracts:
                for contract_address in token_contracts:
                    try:
                        token_info = self._get_erc20_balance(address, contract_address)
                        if token_info:
                            balances[token_info["symbol"]] = token_info
                    except Exception as e:
                        logger.warning(
                            f"Error getting balance for token {contract_address}: {e}"
                        )
            return {
                "success": True,
                "address": address,
                "balances": balances,
                "total_tokens": len(balances),
            }
        except Exception as e:
            logger.error(f"Error getting wallet balance: {e}")
            return {"success": False, "error": str(e)}

    def get_transaction_history(self, address: str, limit: int = 100) -> Dict[str, Any]:
        """Get transaction history for an address"""
        try:
            if not self.w3 or not self.w3.is_connected():
                return {"success": False, "error": "Web3 not connected"}
            if not Web3.is_address(address):
                return {"success": False, "error": "Invalid Ethereum address"}
            latest_block = self.w3.eth.block_number
            transactions = []
            blocks_to_check = min(1000, latest_block)
            for block_num in range(latest_block, latest_block - blocks_to_check, -1):
                if len(transactions) >= limit:
                    break
                try:
                    block = self.w3.eth.get_block(block_num, full_transactions=True)
                    for tx in block.transactions:
                        if tx["from"] == address or tx["to"] == address:
                            tx_info = {
                                "hash": tx["hash"].hex(),
                                "from": tx["from"],
                                "to": tx["to"],
                                "value": float(self.w3.from_wei(tx["value"], "ether")),
                                "gas_price": float(
                                    self.w3.from_wei(tx["gasPrice"], "gwei")
                                ),
                                "gas_used": tx["gas"],
                                "block_number": tx["blockNumber"],
                                "timestamp": datetime.fromtimestamp(
                                    block.timestamp, tz=timezone.utc
                                ).isoformat(),
                                "type": "sent" if tx["from"] == address else "received",
                            }
                            transactions.append(tx_info)
                            if len(transactions) >= limit:
                                break
                except Exception as e:
                    logger.warning(f"Error processing block {block_num}: {e}")
                    continue
            return {
                "success": True,
                "address": address,
                "transactions": transactions,
                "count": len(transactions),
            }
        except Exception as e:
            logger.error(f"Error getting transaction history: {e}")
            return {"success": False, "error": str(e)}

    def analyze_whale_movements(self, min_value_eth: float = 1000) -> Dict[str, Any]:
        """Analyze large transactions (whale movements)"""
        try:
            if not self.w3 or not self.w3.is_connected():
                return {"success": False, "error": "Web3 not connected"}
            latest_block = self.w3.eth.block_number
            whale_transactions = []
            for block_num in range(latest_block, latest_block - 10, -1):
                try:
                    block = self.w3.eth.get_block(block_num, full_transactions=True)
                    for tx in block.transactions:
                        value_eth = float(self.w3.from_wei(tx["value"], "ether"))
                        if value_eth >= min_value_eth:
                            whale_tx = {
                                "hash": tx["hash"].hex(),
                                "from": tx["from"],
                                "to": tx["to"],
                                "value_eth": value_eth,
                                "block_number": tx["blockNumber"],
                                "timestamp": datetime.fromtimestamp(
                                    block.timestamp, tz=timezone.utc
                                ).isoformat(),
                                "gas_price_gwei": float(
                                    self.w3.from_wei(tx["gasPrice"], "gwei")
                                ),
                            }
                            whale_transactions.append(whale_tx)
                except Exception as e:
                    logger.warning(f"Error analyzing block {block_num}: {e}")
                    continue
            whale_transactions.sort(key=lambda x: x["value_eth"], reverse=True)
            return {
                "success": True,
                "whale_transactions": whale_transactions,
                "count": len(whale_transactions),
                "min_value_threshold": min_value_eth,
            }
        except Exception as e:
            logger.error(f"Error analyzing whale movements: {e}")
            return {"success": False, "error": str(e)}

    def get_defi_protocol_data(self, protocol: str) -> Dict[str, Any]:
        """Get DeFi protocol data (TVL, yields, etc.)"""
        try:
            protocols_data = {
                "uniswap": {
                    "name": "Uniswap V3",
                    "tvl": 4500000000,
                    "volume_24h": 1200000000,
                    "fees_24h": 3600000,
                    "pools_count": 8500,
                    "top_pools": [
                        {"pair": "USDC/ETH", "tvl": 450000000, "apy": 12.5},
                        {"pair": "WBTC/ETH", "tvl": 320000000, "apy": 8.7},
                        {"pair": "USDT/USDC", "tvl": 280000000, "apy": 5.2},
                    ],
                },
                "aave": {
                    "name": "Aave V3",
                    "tvl": 6200000000,
                    "total_borrowed": 4100000000,
                    "available_liquidity": 2100000000,
                    "markets_count": 25,
                    "top_markets": [
                        {
                            "asset": "USDC",
                            "supply_apy": 3.2,
                            "borrow_apy": 4.8,
                            "utilization": 75,
                        },
                        {
                            "asset": "ETH",
                            "supply_apy": 2.1,
                            "borrow_apy": 3.5,
                            "utilization": 68,
                        },
                        {
                            "asset": "WBTC",
                            "supply_apy": 1.8,
                            "borrow_apy": 3.2,
                            "utilization": 62,
                        },
                    ],
                },
                "compound": {
                    "name": "Compound V3",
                    "tvl": 2800000000,
                    "total_borrowed": 1900000000,
                    "total_reserves": 45000000,
                    "markets_count": 18,
                    "top_markets": [
                        {
                            "asset": "USDC",
                            "supply_apy": 2.8,
                            "borrow_apy": 4.2,
                            "utilization": 72,
                        },
                        {
                            "asset": "ETH",
                            "supply_apy": 1.9,
                            "borrow_apy": 3.1,
                            "utilization": 65,
                        },
                        {
                            "asset": "DAI",
                            "supply_apy": 2.5,
                            "borrow_apy": 3.8,
                            "utilization": 69,
                        },
                    ],
                },
            }
            protocol_lower = protocol.lower()
            if protocol_lower not in protocols_data:
                return {"success": False, "error": f"Protocol {protocol} not supported"}
            data = protocols_data[protocol_lower]
            data["last_updated"] = datetime.now(timezone.utc).isoformat()
            return {"success": True, "protocol": protocol, "data": data}
        except Exception as e:
            logger.error(f"Error getting DeFi protocol data: {e}")
            return {"success": False, "error": str(e)}

    def get_gas_tracker(self) -> Dict[str, Any]:
        """Get current gas prices and network congestion"""
        try:
            if not self.w3 or not self.w3.is_connected():
                return {"success": False, "error": "Web3 not connected"}
            gas_price_wei = self.w3.eth.gas_price
            gas_price_gwei = self.w3.from_wei(gas_price_wei, "gwei")
            latest_block = self.w3.eth.get_block("latest")
            gas_used_ratio = latest_block.gasUsed / latest_block.gasLimit
            if gas_used_ratio > 0.9:
                congestion_level = "High"
            elif gas_used_ratio > 0.7:
                congestion_level = "Medium"
            else:
                congestion_level = "Low"
            transaction_costs = {
                "simple_transfer": float(gas_price_gwei) * 21000 / 1000000000.0,
                "erc20_transfer": float(gas_price_gwei) * 65000 / 1000000000.0,
                "uniswap_swap": float(gas_price_gwei) * 150000 / 1000000000.0,
                "defi_interaction": float(gas_price_gwei) * 200000 / 1000000000.0,
            }
            return {
                "success": True,
                "gas_price_gwei": float(gas_price_gwei),
                "congestion_level": congestion_level,
                "gas_used_ratio": float(gas_used_ratio),
                "block_number": latest_block.number,
                "transaction_costs_eth": transaction_costs,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting gas tracker data: {e}")
            return {"success": False, "error": str(e)}

    def _get_erc20_balance(
        self, wallet_address: str, contract_address: str
    ) -> Optional[Dict]:
        """Get ERC-20 token balance"""
        try:
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function",
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function",
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function",
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "name",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function",
                },
            ]
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address), abi=erc20_abi
            )
            symbol = contract.functions.symbol().call()
            name = contract.functions.name().call()
            decimals = contract.functions.decimals().call()
            balance_raw = contract.functions.balanceOf(
                Web3.to_checksum_address(wallet_address)
            ).call()
            balance = balance_raw / 10**decimals
            return {
                "balance": float(balance),
                "symbol": symbol,
                "name": name,
                "decimals": decimals,
                "contract_address": contract_address,
            }
        except Exception as e:
            logger.warning(f"Error getting ERC-20 balance for {contract_address}: {e}")
            return None
