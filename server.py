import asyncio
from contextlib import asynccontextmanager
import json
import random
import socket
import string
import time
from typing import Dict, List, Optional, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
import uvicorn

# Background task for turn timeouts
async def timeout_watcher():
    while True:
        await asyncio.sleep(1)
        for room in list(rooms.values()):
            if room.status == "playing" and room.time_limit > 0:
                timed_out_player = room.handle_timeout()
                if timed_out_player:
                    await broadcast_room_state(room)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(timeout_watcher())
    yield
    task.cancel()

app = FastAPI(title="Lost Cities Online", lifespan=lifespan)

COLORS = ["red", "blue", "green", "yellow", "white"]
COLOR_NAMES = {
    "red": "火山 (赤)",
    "blue": "海洋 (青)",
    "green": "密林 (緑)",
    "yellow": "砂漠 (黄)",
    "white": "雪山 (白)"
}

def create_deck() -> List[dict]:
    deck = []
    card_id = 0
    for color in COLORS:
        # 3 investment cards (wager / multiplier)
        for i in range(3):
            deck.append({
                "id": f"{color}_inv_{i}",
                "color": color,
                "type": "investment",
                "value": 0,
                "label": "投資"
            })
            card_id += 1
        # 9 number cards (2 to 10)
        for val in range(2, 11):
            deck.append({
                "id": f"{color}_{val}",
                "color": color,
                "type": "number",
                "value": val,
                "label": str(val)
            })
            card_id += 1
    random.shuffle(deck)
    return deck

def calculate_expedition_score(cards: List[dict]) -> dict:
    if not cards:
        return {
            "card_count": 0,
            "investments": 0,
            "numbers_sum": 0,
            "base_score": 0,
            "multiplier": 1,
            "subtotal": 0,
            "bonus": 0,
            "total": 0
        }
    
    investments = sum(1 for c in cards if c["type"] == "investment")
    numbers_sum = sum(c["value"] for c in cards if c["type"] == "number")
    base_score = numbers_sum - 20
    multiplier = investments + 1
    subtotal = base_score * multiplier
    bonus = 20 if len(cards) >= 8 else 0
    total = subtotal + bonus

    return {
        "card_count": len(cards),
        "investments": investments,
        "numbers_sum": numbers_sum,
        "base_score": base_score,
        "multiplier": multiplier,
        "subtotal": subtotal,
        "bonus": bonus,
        "total": total
    }

def calculate_player_scores(expeditions: Dict[str, List[dict]]) -> dict:
    details = {}
    grand_total = 0
    for color in COLORS:
        cards = expeditions.get(color, [])
        score_info = calculate_expedition_score(cards)
        details[color] = score_info
        grand_total += score_info["total"]
    return {
        "details": details,
        "total": grand_total
    }

class GameRoom:
    def __init__(self, room_id: str, is_random: bool = False, max_rounds: int = 3, time_limit: int = 0):
        self.room_id = room_id
        self.is_random = is_random
        self.max_rounds = max_rounds
        self.time_limit = time_limit  # 0: no limit, 30: 30s, 60: 60s
        self.current_round = 1
        
        # Player session data: {player_id: {"name": str, "ws": WebSocket, "session_id": str, "round_scores": []}}
        self.players: Dict[str, dict] = {}
        self.player_order: List[str] = [] # [p1_id, p2_id]
        
        self.status = "waiting" # waiting, playing, round_over, game_over
        self.turn_player_id: Optional[str] = None
        self.turn_step: int = 1 # 1: play/discard, 2: draw
        self.last_discarded_color: Optional[str] = None # player cannot draw from discard pile they just discarded to
        self.turn_start_time: float = time.time()
        
        # Game state for current round
        self.deck: List[dict] = []
        self.discard_piles: Dict[str, List[dict]] = {c: [] for c in COLORS}
        self.hands: Dict[str, List[dict]] = {} # {p_id: [cards]}
        self.expeditions: Dict[str, Dict[str, List[dict]]] = {} # {p_id: {color: [cards]}}
        self.round_history: List[dict] = [] # log of actions
        self.cumulative_scores: Dict[str, int] = {}
        self.last_action_text: str = ""
        self.rematch_votes: Set[str] = set()

    def add_player(self, player_id: str, name: str, ws: WebSocket, session_id: str) -> bool:
        if player_id in self.players:
            # Reconnection
            self.players[player_id]["ws"] = ws
            self.players[player_id]["session_id"] = session_id
            return True
        if len(self.players) >= 2:
            return False
        
        self.players[player_id] = {
            "id": player_id,
            "name": name,
            "ws": ws,
            "session_id": session_id,
            "round_scores": []
        }
        self.player_order.append(player_id)
        self.cumulative_scores[player_id] = 0
        return True

    def remove_ws(self, player_id: str):
        if player_id in self.players:
            self.players[player_id]["ws"] = None

    def start_game(self):
        self.current_round = 1
        for p_id in self.player_order:
            self.cumulative_scores[p_id] = 0
            self.players[p_id]["round_scores"] = []
        self.start_round()

    def start_round(self):
        self.deck = create_deck()
        self.discard_piles = {c: [] for c in COLORS}
        self.hands = {}
        self.expeditions = {p_id: {c: [] for c in COLORS} for p_id in self.player_order}
        self.round_history = []
        self.rematch_votes.clear()
        
        # Deal 8 cards to each player
        for p_id in self.player_order:
            self.hands[p_id] = [self.deck.pop() for _ in range(8)]
            # Sort hand by color and value
            self._sort_hand(p_id)
        
        # Alternate first player by round
        first_idx = (self.current_round - 1) % len(self.player_order)
        self.turn_player_id = self.player_order[first_idx]
        self.turn_step = 1
        self.last_discarded_color = None
        self.turn_start_time = time.time()
        self.status = "playing"
        self.last_action_text = f"第 {self.current_round} ラウンド開始！ {self.players[self.turn_player_id]['name']} のターンです。"

    def _sort_hand(self, player_id: str):
        color_order = {c: i for i, c in enumerate(COLORS)}
        def card_key(card):
            c_val = color_order.get(card["color"], 99)
            type_val = 0 if card["type"] == "investment" else 1
            num_val = card["value"]
            return (c_val, type_val, num_val)
        self.hands[player_id].sort(key=card_key)

    def can_play_to_expedition(self, player_id: str, card: dict) -> bool:
        color = card["color"]
        exp = self.expeditions[player_id][color]
        if card["type"] == "investment":
            # Investment cards can only be played if no number cards have been played yet
            has_numbers = any(c["type"] == "number" for c in exp)
            if has_numbers:
                return False
            # Max 3 investments
            inv_count = sum(1 for c in exp if c["type"] == "investment")
            return inv_count < 3
        else: # number card
            # Must be strictly greater than the highest number card in expedition
            highest_num = 0
            for c in exp:
                if c["type"] == "number" and c["value"] > highest_num:
                    highest_num = c["value"]
            return card["value"] > highest_num

    def play_card(self, player_id: str, card_id: str, action: str, target_color: Optional[str] = None) -> tuple[bool, str]:
        """
        action: 'expedition' or 'discard'
        """
        if self.status != "playing":
            return False, "ゲーム中ではありません"
        if self.turn_player_id != player_id:
            return False, "相手のターンです"
        if self.turn_step != 1:
            return False, "カードを引くステップです"
        
        # Find card in hand
        hand = self.hands[player_id]
        card = next((c for c in hand if c["id"] == card_id), None)
        if not card:
            return False, "手札にそのカードがありません"

        if action == "expedition":
            if not self.can_play_to_expedition(player_id, card):
                return False, "そのカードは探検エリアに配置できません（数字は昇順・投資は数字前のみ）"
            
            hand.remove(card)
            self.expeditions[player_id][card["color"]].append(card)
            self.last_discarded_color = None
            p_name = self.players[player_id]["name"]
            color_name = COLOR_NAMES[card["color"]]
            label = "投資カード" if card["type"] == "investment" else f"数字 {card['value']}"
            self.last_action_text = f"{p_name} が {color_name} に {label} を配置しました。"
            self.round_history.append({
                "player": p_name,
                "action": "play",
                "card": card,
                "text": self.last_action_text
            })
            self.turn_step = 2
            return True, "配置完了"

        elif action == "discard":
            hand.remove(card)
            self.discard_piles[card["color"]].append(card)
            self.last_discarded_color = card["color"] # Cannot draw from this pile in step 2
            p_name = self.players[player_id]["name"]
            color_name = COLOR_NAMES[card["color"]]
            label = "投資カード" if card["type"] == "investment" else f"数字 {card['value']}"
            self.last_action_text = f"{p_name} が {color_name} の捨て札置き場に {label} を捨てました。"
            self.round_history.append({
                "player": p_name,
                "action": "discard",
                "card": card,
                "text": self.last_action_text
            })
            self.turn_step = 2
            return True, "捨て札完了"
        else:
            return False, "不正なアクションです"

    def draw_card(self, player_id: str, source: str, color: Optional[str] = None) -> tuple[bool, str]:
        """
        source: 'deck' or 'discard'
        color: required if source == 'discard'
        """
        if self.status != "playing":
            return False, "ゲーム中ではありません"
        if self.turn_player_id != player_id:
            return False, "相手のターンです"
        if self.turn_step != 2:
            return False, "カードを出すステップです"

        drawn_card = None
        p_name = self.players[player_id]["name"]

        if source == "deck":
            if not self.deck:
                return False, "山札がありません"
            drawn_card = self.deck.pop()
            self.last_action_text = f"{p_name} が山札から1枚引きました。"
        elif source == "discard":
            if not color or color not in COLORS:
                return False, "無効な捨て札エリアです"
            if color == self.last_discarded_color:
                return False, "今自分が捨てたばかりの捨て札は引けません"
            pile = self.discard_piles[color]
            if not pile:
                return False, "その捨て札置き場にはカードがありません"
            drawn_card = pile.pop()
            c_name = COLOR_NAMES[color]
            label = "投資カード" if drawn_card["type"] == "investment" else f"数字 {drawn_card['value']}"
            self.last_action_text = f"{p_name} が {c_name} の捨て札から {label} を引きました。"
        else:
            return False, "不正なドロー元です"

        self.hands[player_id].append(drawn_card)
        self._sort_hand(player_id)

        # Check if round ends (deck exhausted)
        if len(self.deck) == 0:
            self._end_round()
            return True, "ラウンド終了"

        # Pass turn to next player
        next_idx = (self.player_order.index(player_id) + 1) % len(self.player_order)
        self.turn_player_id = self.player_order[next_idx]
        self.turn_step = 1
        self.last_discarded_color = None
        self.turn_start_time = time.time()
        return True, "ターン交代"

    def handle_timeout(self) -> Optional[str]:
        """Auto discard and draw on timeout"""
        if self.status != "playing" or self.time_limit <= 0 or not self.turn_player_id:
            return None
        elapsed = time.time() - self.turn_start_time
        if elapsed < self.time_limit + 1:
            return None

        p_id = self.turn_player_id
        if self.turn_step == 1:
            # Auto discard first card
            if self.hands[p_id]:
                card = self.hands[p_id][0]
                self.play_card(p_id, card["id"], "discard")
                # Then auto draw from deck
                if self.deck:
                    self.draw_card(p_id, "deck")
                elif any(self.discard_piles.values()):
                    # Draw from first available valid discard
                    for c in COLORS:
                        if c != self.last_discarded_color and self.discard_piles[c]:
                            self.draw_card(p_id, "discard", c)
                            break
        elif self.turn_step == 2:
            if self.deck:
                self.draw_card(p_id, "deck")
            else:
                for c in COLORS:
                    if c != self.last_discarded_color and self.discard_piles[c]:
                        self.draw_card(p_id, "discard", c)
                        break
        return p_id

    def _end_round(self):
        # Calculate scores for all players
        round_results = {}
        for p_id in self.player_order:
            sc = calculate_player_scores(self.expeditions[p_id])
            round_results[p_id] = sc
            self.players[p_id]["round_scores"].append(sc)
            self.cumulative_scores[p_id] += sc["total"]

        self.rematch_votes.clear()

        if self.current_round >= self.max_rounds:
            self.status = "game_over"
            self.last_action_text = f"全 {self.max_rounds} ラウンド終了！ 最終結果発表！"
        else:
            self.status = "round_over"
            self.last_action_text = f"第 {self.current_round} ラウンド終了！ 次のラウンドへ進めます。"

    def next_round(self, player_id: str) -> bool:
        if self.status != "round_over":
            return False
        self.rematch_votes.add(player_id)
        connected_players = [p for p in self.players.values() if p["ws"] is not None]
        req_count = len(connected_players) if len(connected_players) > 0 else len(self.players)
        if len(self.rematch_votes) >= req_count:
            self.current_round += 1
            self.start_round()
            return True
        return False

    def request_rematch(self, player_id: str) -> bool:
        if self.status != "game_over":
            return False
        self.rematch_votes.add(player_id)
        connected_players = [p for p in self.players.values() if p["ws"] is not None]
        req_count = len(connected_players) if len(connected_players) > 0 else len(self.players)
        if len(self.rematch_votes) >= req_count:
            self.start_game()
            return True
        return False

    def get_state_for_player(self, player_id: str) -> dict:
        p_idx = self.player_order.index(player_id) if player_id in self.player_order else -1
        opp_id = None
        if len(self.player_order) == 2 and p_idx != -1:
            opp_id = self.player_order[1 - p_idx]

        my_hand = self.hands.get(player_id, [])
        opp_hand_count = len(self.hands.get(opp_id, [])) if opp_id else 0

        # Discard tops
        discard_tops = {}
        discard_counts = {}
        for c in COLORS:
            pile = self.discard_piles.get(c, [])
            discard_tops[c] = pile[-1] if pile else None
            discard_counts[c] = len(pile)

        # Player calculations for current board
        my_scores = calculate_player_scores(self.expeditions.get(player_id, {})) if player_id in self.expeditions else None
        opp_scores = calculate_player_scores(self.expeditions.get(opp_id, {})) if opp_id and opp_id in self.expeditions else None

        opp_info = None
        if opp_id and opp_id in self.players:
            opp_info = {
                "id": opp_id,
                "name": self.players[opp_id]["name"],
                "connected": self.players[opp_id]["ws"] is not None,
                "cumulative_score": self.cumulative_scores.get(opp_id, 0),
                "round_scores": [s["total"] for s in self.players[opp_id]["round_scores"]]
            }

        my_info = None
        if player_id in self.players:
            my_info = {
                "id": player_id,
                "name": self.players[player_id]["name"],
                "cumulative_score": self.cumulative_scores.get(player_id, 0),
                "round_scores": [s["total"] for s in self.players[player_id]["round_scores"]]
            }

        # Valid plays for each card in hand (if it's my turn & step 1)
        valid_expeditions = {}
        if self.status == "playing" and self.turn_player_id == player_id and self.turn_step == 1:
            for card in my_hand:
                valid_expeditions[card["id"]] = self.can_play_to_expedition(player_id, card)

        time_left = 0
        if self.time_limit > 0 and self.status == "playing":
            elapsed = time.time() - self.turn_start_time
            time_left = max(0, int(self.time_limit - elapsed))

        return {
            "room_id": self.room_id,
            "status": self.status,
            "current_round": self.current_round,
            "max_rounds": self.max_rounds,
            "time_limit": self.time_limit,
            "time_left": time_left,
            "deck_count": len(self.deck),
            "turn_player_id": self.turn_player_id,
            "is_my_turn": (self.turn_player_id == player_id),
            "turn_step": self.turn_step,
            "last_discarded_color": self.last_discarded_color,
            "last_action_text": self.last_action_text,
            "me": my_info,
            "opponent": opp_info,
            "my_hand": my_hand,
            "opp_hand_count": opp_hand_count,
            "my_expeditions": self.expeditions.get(player_id, {c: [] for c in COLORS}),
            "opp_expeditions": self.expeditions.get(opp_id, {c: [] for c in COLORS}) if opp_id else {c: [] for c in COLORS},
            "my_scores": my_scores,
            "opp_scores": opp_scores,
            "discard_tops": discard_tops,
            "discard_counts": discard_counts,
            "valid_expeditions": valid_expeditions,
            "history": self.round_history[-10:],
            "rematch_votes_count": len(self.rematch_votes),
            "waiting_for_players": len(self.players) < 2
        }


# Room Manager
rooms: Dict[str, GameRoom] = {}
waiting_random_rooms: List[str] = []

def generate_room_id() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

async def broadcast_room_state(room: GameRoom):
    for p_id, p_data in list(room.players.items()):
        ws = p_data.get("ws")
        if ws:
            try:
                state = room.get_state_for_player(p_id)
                await ws.send_json({"type": "state_update", "state": state})
            except Exception:
                pass

@app.get("/favicon.ico", include_in_schema=False)
@app.get("/apple-touch-icon.png", include_in_schema=False)
@app.get("/apple-touch-icon-precomposed.png", include_in_schema=False)
async def favicon_dummy():
    # Return 204 No Content for favicon requests to prevent 404 logs
    return Response(status_code=204)


def get_local_ip() -> str:
    """Get the primary local LAN/Wi-Fi IPv4 address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

@app.get("/api/server-info")
async def server_info():
    local_ip = get_local_ip()
    port = 8000
    return {
        "local_ip": local_ip,
        "port": port,
        "mobile_url": f"http://{local_ip}:{port}"
    }

@app.get("/api/room/create")
async def create_room(max_rounds: int = 3, time_limit: int = 0):
    room_id = generate_room_id()
    room = GameRoom(room_id, is_random=False, max_rounds=max_rounds, time_limit=time_limit)
    rooms[room_id] = room
    return {"room_id": room_id}

@app.get("/api/room/random")
async def match_random(max_rounds: int = 3):
    # Find existing waiting random room
    global waiting_random_rooms
    waiting_random_rooms = [r_id for r_id in waiting_random_rooms if r_id in rooms and len(rooms[r_id].players) < 2]
    if waiting_random_rooms:
        room_id = waiting_random_rooms.pop(0)
        return {"room_id": room_id}
    else:
        room_id = generate_room_id()
        room = GameRoom(room_id, is_random=True, max_rounds=max_rounds, time_limit=45)
        rooms[room_id] = room
        waiting_random_rooms.append(room_id)
        return {"room_id": room_id}


@app.websocket("/ws/{room_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, player_id: str, name: str = "プレイヤー", session_id: str = ""):
    await websocket.accept()

    if room_id not in rooms:
        # Create room if not exists (allows direct joining by URL)
        rooms[room_id] = GameRoom(room_id, is_random=False, max_rounds=3, time_limit=0)

    room = rooms[room_id]

    success = room.add_player(player_id, name, websocket, session_id or player_id)
    if not success:
        await websocket.send_json({"type": "error", "message": "ルームが満員です"})
        await websocket.close()
        return

    # Check if we should start
    if len(room.players) == 2 and room.status == "waiting":
        room.start_game()

    await broadcast_room_state(room)

    try:
        while True:
            data = await websocket.receive_json()
            action_type = data.get("type")

            if action_type == "play_card":
                card_id = data.get("card_id")
                sub_action = data.get("action") # 'expedition' or 'discard'
                ok, msg = room.play_card(player_id, card_id, sub_action)
                if not ok:
                    await websocket.send_json({"type": "error", "message": msg})
                else:
                    await broadcast_room_state(room)

            elif action_type == "draw_card":
                source = data.get("source") # 'deck' or 'discard'
                color = data.get("color")
                ok, msg = room.draw_card(player_id, source, color)
                if not ok:
                    await websocket.send_json({"type": "error", "message": msg})
                else:
                    await broadcast_room_state(room)

            elif action_type == "next_round":
                room.next_round(player_id)
                await broadcast_room_state(room)

            elif action_type == "rematch":
                room.request_rematch(player_id)
                await broadcast_room_state(room)

            elif action_type == "update_name":
                new_name = data.get("name", "").strip()
                if new_name and player_id in room.players:
                    room.players[player_id]["name"] = new_name[:12]
                    await broadcast_room_state(room)

    except WebSocketDisconnect:
        room.remove_ws(player_id)
        await broadcast_room_state(room)
    except Exception as e:
        room.remove_ws(player_id)
        await broadcast_room_state(room)


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    ip = get_local_ip()
    print("=" * 60)
    print(" 🧭 LOST CITIES ONLINE サーバーを起動しました！")
    print(f" 💻 PCで開く場合:       http://localhost:8000")
    print(f" 📱 iPhone等で開く場合: http://{ip}:8000")
    print(" (※iPhoneとPCが同じWi-Fiに接続されている必要があります)")
    print("=" * 60)
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
