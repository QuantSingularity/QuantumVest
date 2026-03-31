"""
WebSocket Service for Real-time Data
Real-time price updates and portfolio notifications
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Set

from auth import AuthService
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import Portfolio, User

logger = logging.getLogger(__name__)


class WebSocketService:
    """Service for real-time WebSocket communications"""

    def __init__(self, socketio: SocketIO) -> None:
        self.socketio = socketio
        self.connected_users: Dict[str, str] = {}
        self.user_rooms: Dict[str, Set[str]] = {}
        self.price_subscribers: Dict[str, Set[str]] = {}
        self.register_handlers()

    def register_handlers(self) -> None:
        """Register WebSocket event handlers"""

        @self.socketio.on("connect")
        def handle_connect(auth):
            """Handle client connection"""
            try:
                token = auth.get("token") if auth else None
                if not token:
                    logger.warning("WebSocket connection attempted without token")
                    return False
                user_id = AuthService.verify_token(token)
                if not user_id:
                    logger.warning("WebSocket connection attempted with invalid token")
                    return False
                user = User.query.get(user_id)
                if not user or not user.is_active:
                    logger.warning(
                        f"WebSocket connection attempted for inactive user: {user_id}"
                    )
                    return False
                session_id = request.sid
                self.connected_users[session_id] = user_id
                if user_id not in self.user_rooms:
                    self.user_rooms[user_id] = set()
                join_room(f"user_{user_id}")
                self.user_rooms[user_id].add(f"user_{user_id}")
                logger.info(f"User {user_id} connected via WebSocket")
                emit(
                    "connected",
                    {
                        "status": "success",
                        "user_id": user_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                return True
            except Exception as e:
                logger.error(f"Error handling WebSocket connection: {e}")
                return False

        @self.socketio.on("disconnect")
        def handle_disconnect():
            """Handle client disconnection"""
            try:
                session_id = request.sid
                user_id = self.connected_users.pop(session_id, None)
                if user_id:
                    if user_id in self.user_rooms:
                        for room in self.user_rooms[user_id]:
                            leave_room(room)
                        del self.user_rooms[user_id]
                    for symbol, subscribers in self.price_subscribers.items():
                        subscribers.discard(user_id)
                    logger.info(f"User {user_id} disconnected from WebSocket")
            except Exception as e:
                logger.error(f"Error handling WebSocket disconnection: {e}")

        @self.socketio.on("subscribe_prices")
        def handle_subscribe_prices(data):
            """Handle price subscription requests"""
            try:
                session_id = request.sid
                user_id = self.connected_users.get(session_id)
                if not user_id:
                    emit("error", {"message": "Not authenticated"})
                    return
                symbols = data.get("symbols", [])
                for symbol in symbols:
                    symbol = symbol.upper()
                    if symbol not in self.price_subscribers:
                        self.price_subscribers[symbol] = set()
                    self.price_subscribers[symbol].add(user_id)
                    room_name = f"prices_{symbol}"
                    join_room(room_name)
                    self.user_rooms[user_id].add(room_name)
                emit(
                    "subscription_confirmed",
                    {
                        "symbols": symbols,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                logger.info(f"User {user_id} subscribed to prices: {symbols}")
            except Exception as e:
                logger.error(f"Error handling price subscription: {e}")
                emit("error", {"message": "Subscription failed"})

        @self.socketio.on("unsubscribe_prices")
        def handle_unsubscribe_prices(data):
            """Handle price unsubscription requests"""
            try:
                session_id = request.sid
                user_id = self.connected_users.get(session_id)
                if not user_id:
                    emit("error", {"message": "Not authenticated"})
                    return
                symbols = data.get("symbols", [])
                for symbol in symbols:
                    symbol = symbol.upper()
                    if symbol in self.price_subscribers:
                        self.price_subscribers[symbol].discard(user_id)
                    room_name = f"prices_{symbol}"
                    leave_room(room_name)
                    self.user_rooms[user_id].discard(room_name)
                emit(
                    "unsubscription_confirmed",
                    {
                        "symbols": symbols,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                logger.info(f"User {user_id} unsubscribed from prices: {symbols}")
            except Exception as e:
                logger.error(f"Error handling price unsubscription: {e}")
                emit("error", {"message": "Unsubscription failed"})

        @self.socketio.on("subscribe_portfolio")
        def handle_subscribe_portfolio(data):
            """Handle portfolio subscription requests"""
            try:
                session_id = request.sid
                user_id = self.connected_users.get(session_id)
                if not user_id:
                    emit("error", {"message": "Not authenticated"})
                    return
                portfolio_id = data.get("portfolio_id")
                portfolio = Portfolio.query.filter_by(
                    id=portfolio_id, user_id=user_id
                ).first()
                if not portfolio:
                    emit("error", {"message": "Portfolio not found or access denied"})
                    return
                room_name = f"portfolio_{portfolio_id}"
                join_room(room_name)
                self.user_rooms[user_id].add(room_name)
                emit(
                    "portfolio_subscription_confirmed",
                    {
                        "portfolio_id": portfolio_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
                logger.info(f"User {user_id} subscribed to portfolio: {portfolio_id}")
            except Exception as e:
                logger.error(f"Error handling portfolio subscription: {e}")
                emit("error", {"message": "Portfolio subscription failed"})

    def broadcast_price_update(self, symbol: str, price_data: Dict) -> Any:
        """Broadcast price update to subscribers"""
        try:
            room_name = f"prices_{symbol}"
            self.socketio.emit(
                "price_update",
                {
                    "symbol": symbol,
                    "price": price_data["price"],
                    "change": price_data.get("change", 0),
                    "change_percent": price_data.get("change_percent", 0),
                    "volume": price_data.get("volume", 0),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                room=room_name,
            )
            logger.debug(
                f"Broadcasted price update for {symbol}: {price_data['price']}"
            )
        except Exception as e:
            logger.error(f"Error broadcasting price update: {e}")

    def broadcast_portfolio_update(self, portfolio_id: str, update_data: Dict) -> Any:
        """Broadcast portfolio update to subscribers"""
        try:
            room_name = f"portfolio_{portfolio_id}"
            self.socketio.emit(
                "portfolio_update",
                {
                    "portfolio_id": portfolio_id,
                    "update_type": update_data.get("type", "general"),
                    "data": update_data.get("data", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                room=room_name,
            )
            logger.debug(f"Broadcasted portfolio update for {portfolio_id}")
        except Exception as e:
            logger.error(f"Error broadcasting portfolio update: {e}")

    def send_user_notification(self, user_id: str, notification: Dict) -> Any:
        """Send notification to specific user"""
        try:
            room_name = f"user_{user_id}"
            self.socketio.emit(
                "notification",
                {
                    "type": notification.get("type", "info"),
                    "title": notification.get("title", ""),
                    "message": notification.get("message", ""),
                    "data": notification.get("data", {}),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                room=room_name,
            )
            logger.debug(f"Sent notification to user {user_id}")
        except Exception as e:
            logger.error(f"Error sending user notification: {e}")

    def broadcast_market_alert(self, alert_data: Dict) -> Any:
        """Broadcast market-wide alert"""
        try:
            self.socketio.emit(
                "market_alert",
                {
                    "type": alert_data.get("type", "info"),
                    "title": alert_data.get("title", ""),
                    "message": alert_data.get("message", ""),
                    "severity": alert_data.get("severity", "low"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
            logger.info(
                f"Broadcasted market alert: {alert_data.get('title', 'Unknown')}"
            )
        except Exception as e:
            logger.error(f"Error broadcasting market alert: {e}")

    def get_connected_users_count(self) -> int:
        """Get number of connected users"""
        return len(self.connected_users)

    def get_price_subscribers_count(self, symbol: str) -> int:
        """Get number of subscribers for a specific asset"""
        return len(self.price_subscribers.get(symbol.upper(), set()))


class PriceStreamManager:
    """Manager for real-time price streaming"""

    def __init__(self, websocket_service: WebSocketService) -> None:
        self.websocket_service = websocket_service
        self.is_running = False
        self.update_interval = 5

    async def start_price_streaming(self):
        """Start the price streaming service"""
        self.is_running = True
        logger.info("Price streaming service started")
        while self.is_running:
            try:
                subscribed_symbols = set(
                    self.websocket_service.price_subscribers.keys()
                )
                if subscribed_symbols:
                    price_updates = await self._fetch_latest_prices(subscribed_symbols)
                    for symbol, price_data in price_updates.items():
                        self.websocket_service.broadcast_price_update(
                            symbol, price_data
                        )
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                logger.error(f"Error in price streaming: {e}")
                await asyncio.sleep(self.update_interval)

    def stop_price_streaming(self) -> Any:
        """Stop the price streaming service"""
        self.is_running = False
        logger.info("Price streaming service stopped")

    async def _fetch_latest_prices(self, symbols: Set[str]) -> Dict[str, Dict]:
        """Fetch latest prices for symbols (mock implementation)"""
        try:
            import random

            price_updates = {}
            for symbol in symbols:
                base_price = 100 + hash(symbol) % 1000
                change = random.uniform(-5, 5)
                price_updates[symbol] = {
                    "price": base_price + change,
                    "change": change,
                    "change_percent": change / base_price * 100,
                    "volume": random.randint(1000000, 10000000),
                }
            return price_updates
        except Exception as e:
            logger.error(f"Error fetching latest prices: {e}")
            return {}
