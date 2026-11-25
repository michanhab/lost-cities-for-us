import asyncio
import json
import websockets
import urllib.request
import time
from server import app, rooms
import uvicorn
import threading

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8123, log_level="warning")

async def test_full_game_flow():
    # 1. Create Room via API
    req = urllib.request.urlopen("http://127.0.0.1:8123/api/room/create?max_rounds=1")
    data = json.loads(req.read().decode("utf-8"))
    room_id = data["room_id"]
    print(f"Created room: {room_id}")

    # 2. Connect Player 1
    uri1 = f"ws://127.0.0.1:8123/ws/{room_id}/P1?name=Alice"
    uri2 = f"ws://127.0.0.1:8123/ws/{room_id}/P2?name=Bob"

    async with websockets.connect(uri1) as ws1:
        # P1 receives waiting state
        msg1 = json.loads(await ws1.recv())
        assert msg1["state"]["status"] == "waiting"
        print("P1 connected and waiting...")

        # Connect P2
        async with websockets.connect(uri2) as ws2:
            # P2 receives playing state
            msg2 = json.loads(await ws2.recv())
            # P1 receives playing state update
            msg1_update = json.loads(await ws1.recv())
            
            state1 = msg1_update["state"]
            state2 = msg2["state"]
            
            assert state1["status"] == "playing"
            assert state2["status"] == "playing"
            assert len(state1["my_hand"]) == 8
            assert len(state2["my_hand"]) == 8
            assert state1["deck_count"] == 44 # 60 - 16 = 44
            print("Both players connected and game started successfully with 8 cards each and 44 deck cards!")

            # Determine active player
            turn_p = state1["turn_player_id"]
            active_ws = ws1 if turn_p == "P1" else ws2
            other_ws = ws2 if turn_p == "P1" else ws1
            active_state = state1 if turn_p == "P1" else state2

            # Step 1: Active player discards first card
            first_card = active_state["my_hand"][0]
            discard_color = first_card["color"]
            await active_ws.send(json.dumps({
                "type": "play_card",
                "card_id": first_card["id"],
                "action": "discard"
            }))

            # Receive updates on both sockets
            u1 = json.loads(await ws1.recv())["state"]
            u2 = json.loads(await ws2.recv())["state"]
            curr = u1 if turn_p == "P1" else u2
            assert curr["turn_step"] == 2
            assert curr["last_discarded_color"] == discard_color
            print("Step 1 discard executed successfully!")

            # Try to draw from same discard pile (MUST FAIL)
            await active_ws.send(json.dumps({
                "type": "draw_card",
                "source": "discard",
                "color": discard_color
            }))
            err = json.loads(await active_ws.recv())
            assert err["type"] == "error"
            assert "今自分が捨てたばかり" in err["message"]
            print("Forbidden same-turn discard draw correctly rejected by server!")

            # Step 2: Draw from deck (MUST SUCCEED)
            await active_ws.send(json.dumps({
                "type": "draw_card",
                "source": "deck"
            }))

            u1 = json.loads(await ws1.recv())["state"]
            u2 = json.loads(await ws2.recv())["state"]
            curr = u1 if turn_p == "P1" else u2
            assert curr["deck_count"] == 43
            assert len(curr["my_hand"]) == 8
            assert curr["turn_step"] == 1
            assert curr["turn_player_id"] != turn_p # Turn passed
            print("Step 2 deck draw executed and turn passed smoothly!")

    print("Full WebSocket gameplay verification passed!")

if __name__ == "__main__":
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    time.sleep(1.5)
    asyncio.run(test_full_game_flow())
