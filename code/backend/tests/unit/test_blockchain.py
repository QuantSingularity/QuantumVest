"""
Unit tests for BlockchainService (app/services/blockchain.py).

This is the only service in the codebase that talks to an external network
dependency (a Web3 RPC endpoint), so - unlike the rest of the test suite -
some of these tests use unittest.mock to exercise the "connected, contract
available" code paths without requiring a live chain in CI. The graceful-
degradation paths (no provider reachable, no artifact, etc.) are tested
against real (just unreachable) config, no mocking needed.
"""

from unittest.mock import MagicMock, patch

import pytest
from app.services.blockchain import BlockchainService


@pytest.fixture
def unreachable_app_config(app):
    """Points WEB3_PROVIDER_URI at a port nothing is listening on, so
    connection attempts fail fast and deterministically."""
    original = app.config.get("WEB3_PROVIDER_URI")
    app.config["WEB3_PROVIDER_URI"] = "http://127.0.0.1:1"
    yield app
    app.config["WEB3_PROVIDER_URI"] = original


class TestConnection:
    def test_not_connected_when_disabled(self, app):
        app.config["BLOCKCHAIN_ENABLED"] = False
        try:
            assert BlockchainService.is_connected() is False
        finally:
            app.config["BLOCKCHAIN_ENABLED"] = True

    def test_not_connected_when_no_provider_uri(self, app):
        original = app.config.get("WEB3_PROVIDER_URI")
        app.config["WEB3_PROVIDER_URI"] = None
        try:
            assert BlockchainService.is_connected() is False
        finally:
            app.config["WEB3_PROVIDER_URI"] = original

    def test_not_connected_when_unreachable(self, unreachable_app_config):
        assert BlockchainService.is_connected() is False


class TestStatusGracefulDegradation:
    def test_status_reports_disconnected(self, unreachable_app_config):
        status = BlockchainService.status()
        assert status["connected"] is False
        assert "provider" in status

    def test_read_methods_report_error_not_exception(self, unreachable_app_config):
        for result in (
            BlockchainService.get_price_trend(),
            BlockchainService.get_moving_average(5),
            BlockchainService.get_historical_market_data("ETH"),
            BlockchainService.get_token_balance(
                "0x0000000000000000000000000000000000dEaD"
            ),
            BlockchainService.get_oracle_price(
                "0x0000000000000000000000000000000000dEaD"
            ),
        ):
            assert result["success"] is False
            assert "error" in result

    def test_record_market_data_without_provider(self, unreachable_app_config):
        result = BlockchainService.record_market_data("ETH", 2500, 100)
        assert result["success"] is False


class TestAddressResolution:
    def test_explicit_override_wins_over_artifact(self, app):
        app.config["DATA_TRACKING_CONTRACT_ADDRESS"] = (
            "0x1234567890123456789012345678901234567890"
        )
        try:
            w3 = MagicMock()
            artifact = {
                "networks": {
                    "1": {"address": "0xdead000000000000000000000000000000dead"}
                }
            }
            resolved = BlockchainService._resolve_address(w3, "DataTracking", artifact)
            assert resolved.lower() == "0x1234567890123456789012345678901234567890"
        finally:
            app.config["DATA_TRACKING_CONTRACT_ADDRESS"] = None

    def test_falls_back_to_artifact_network_entry(self, app):
        app.config["DATA_TRACKING_CONTRACT_ADDRESS"] = None
        w3 = MagicMock()
        w3.net.version = "1337"
        artifact = {
            "networks": {
                "1337": {"address": "0x1234567890123456789012345678901234567890"}
            }
        }
        resolved = BlockchainService._resolve_address(w3, "DataTracking", artifact)
        assert resolved.lower() == "0x1234567890123456789012345678901234567890"

    def test_no_entry_for_connected_network_returns_none(self, app):
        app.config["DATA_TRACKING_CONTRACT_ADDRESS"] = None
        w3 = MagicMock()
        w3.net.version = "99999"
        artifact = {
            "networks": {
                "1337": {"address": "0x1234567890123456789012345678901234567890"}
            }
        }
        assert BlockchainService._resolve_address(w3, "DataTracking", artifact) is None

    def test_no_artifact_and_no_override_returns_none(self, app):
        app.config["DATA_TRACKING_CONTRACT_ADDRESS"] = None
        w3 = MagicMock()
        assert BlockchainService._resolve_address(w3, "DataTracking", None) is None


class TestMockedSuccessPaths:
    """Exercises the "connected, contract deployed" branches with a mocked
    Web3/contract, since CI doesn't run a live chain."""

    def test_get_price_trend_success(self, app):
        mock_contract = MagicMock()
        mock_contract.functions.getPriceTrend.return_value.call.return_value = (
            200000000000
        )
        with patch.object(
            BlockchainService,
            "_get_contract",
            return_value=(MagicMock(), mock_contract, None),
        ):
            result = BlockchainService.get_price_trend()
        assert result == {"success": True, "price": 200000000000}

    def test_get_historical_market_data_maps_struct_fields_in_order(self, app):
        mock_contract = MagicMock()
        # DataTracking.MarketData is (timestamp, price, volume) - confirm
        # the service maps tuple positions correctly, not just by coincidence.
        mock_contract.functions.getHistoricalData.return_value.call.return_value = [
            (1700000000, 2500, 10),
        ]
        with patch.object(
            BlockchainService,
            "_get_contract",
            return_value=(MagicMock(), mock_contract, None),
        ):
            result = BlockchainService.get_historical_market_data("ETH")
        assert result["success"] is True
        assert result["data"] == [
            {"timestamp": 1700000000, "price": 2500, "volume": 10}
        ]

    def test_record_market_data_success(self, app):
        app.config["BLOCKCHAIN_PRIVATE_KEY"] = (
            "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1"
        )
        try:
            mock_w3 = MagicMock()
            mock_account = MagicMock()
            mock_account.address = "0xabc0000000000000000000000000000000abc0"
            mock_w3.eth.account.from_key.return_value = mock_account
            mock_w3.eth.get_transaction_count.return_value = 0
            mock_w3.eth.chain_id = 1337

            mock_signed = MagicMock()
            mock_signed.raw_transaction = b"\x01\x02"
            mock_account.sign_transaction.return_value = mock_signed

            mock_w3.eth.send_raw_transaction.return_value = b"\xaa\xbb"
            mock_receipt = MagicMock()
            mock_receipt.status = 1
            mock_receipt.blockNumber = 42
            mock_receipt.gasUsed = 100000
            mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt

            mock_contract = MagicMock()
            mock_contract.functions.addDataPoint.return_value.build_transaction.return_value = {
                "from": mock_account.address
            }

            with patch.object(
                BlockchainService,
                "_get_contract",
                return_value=(mock_w3, mock_contract, None),
            ):
                result = BlockchainService.record_market_data("ETH", 2500, 10)

            assert result["success"] is True
            assert result["block_number"] == 42
        finally:
            app.config["BLOCKCHAIN_PRIVATE_KEY"] = None
