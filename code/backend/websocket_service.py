"""
WebSocket Service for Real-time Data
Real-time price updates and portfolio notifications
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Set

from auth import AuthService
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import User, db

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
            try:
                token = auth.get("token") if auth else None
                if not token:
                    logger.warning("WebSocket connection attempted without token")
                    return False

                user_id = AuthService.verify_token(token)
                if not user_id:
                    logger.warning("WebSocket connection attempted with invalid token")
                    return False

                user = db.session.get(User, user_id)
                if not user or not user.is_active:
                    logger.warning(f"WebSocket connection for inactive user: {user_id}")
                    return False

                session_id = request.sid
                self.connected_users[session_id] = user_id

                if user_id not in self.user_rooms:
                    self.user_rooms[user_id] = set()

                room = f"user_{user_id}"
                join_room(room)
                self.user_rooms[user_id].add(room)

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
            try:
                session_id = request.sid
                user_id = self.connected_users.pop(session_id, None)
                if user_id:
                    if user_id in self.user_rooms:
                        for room in self.user_rooms[user_id]:
                            leave_room(room)
                        del self.user_rooms[user_id]

                    for symbol in list(self.price_subscribers.keys()):
                        self.price_subscribers[symbol].discard(user_id)
                        if not self.price_subscribers[symbol]:
                            del self.price_subscribers[symbol]

                logger.info(f"User {user_id} disconnected from WebSocket")
            except Exception as e:
                logger.error(f"Error handling WebSocket disconnect: {e}")

        @self.socketio.on("subscribe_price")
        def handle_subscribe_price(data):
            try:
                session_id = request.sid
                user_id = self.connected_users.get(session_id)
                if not user_id:
                    emit("error", {"message": "Not authenticated"})
                    return

                symbol = data.get("symbol", "").upper() if data else ""
                if not symbol:
                    emit("error", {"message": "Symbol is required"})
                    return

                if symbol not in self.price_subscribers:
                    self.price_subscribers[symbol] = set()
                self.price_subscribers[symbol].add(user_id)

                join_room(f"price_{symbol}")
                emit("subscribed", {"symbol": symbol, "status": "success"})
                logger.info(f"User {user_id} subscribed to {symbol} price updates")
            except Exception as e:
                logger.error(f"Error handling price subscription: {e}")
                emit("error", {"message": "Subscription failed"})

        @self.socketio.on("unsubscribe_price")
        def handle_unsubscribe_price(data):
            try:
                session_id = request.sid
                user_id = self.connected_users.get(session_id)
                if not user_id:
                    return

                symbol = data.get("symbol", "").upper() if data else ""
                if symbol and symbol in self.price_subscribers:
                    self.price_subscribers[symbol].discard(user_id)

                leave_room(f"price_{symbol}")
                emit("unsubscribed", {"symbol": symbol, "status": "success"})
            except Exception as e:
                logger.error(f"Error handling price unsubscription: {e}")

        @self.socketio.on("ping")
        def handle_ping():
            emit("pong", {"timestamp": datetime.now(timezone.utc).isoformat()})

    def broadcast_price_update(self, symbol: str, price_data: Dict[str, Any]) -> None:
        """Broadcast price update to all subscribers of a symbol"""
        try:
            self.socketio.emit(
                "price_update",
                {
                    "symbol": symbol,
                    "data": price_data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
                room=f"price_{symbol}",
            )
        except Exception as e:
            logger.error(f"Error broadcasting price update for {symbol}: {e}")

    def notify_user(self, user_id: str, event: str, data: Dict[str, Any]) -> None:
        """Send a notification to a specific user"""
        try:
            self.socketio.emit(event, data, room=f"user_{user_id}")
        except Exception as e:
            logger.error(f"Error notifying user {user_id}: {e}")

    def get_connected_count(self) -> int:
        """Return the number of currently connected users"""
        return len(self.connected_users)
