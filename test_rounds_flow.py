import asyncio
import json
import websockets
import urllib.parse

from server import rooms, GameRoom

async def simulate_3_rounds():
    room_id = "ROUND_TEST"
    room = GameRoom(room_id, is_random=False, max_rounds=3, time_limit=0)
    rooms[room_id] = room

    # Verify initial state
    assert room.max_rounds == 3
    assert room.current_round == 1
    
    # Player 1 and Player 2 join
    p1 = "p1_id"
    p2 = "p2_id"
    room.add_player(p1, "Player1", None, "s1")
    room.add_player(p2, "Player2", None, "s2")
    room.start_game()
    assert room.status == "playing"
    assert room.current_round == 1

    # End round 1 (empty deck simulation)
    room.deck.clear()
    room._end_round()
    assert room.status == "round_over", f"Expected round_over, got {room.status}"
    assert room.current_round == 1

    # Both players vote next_round
    room.next_round(p1)
    room.next_round(p2)
    assert room.status == "playing", f"Expected playing for round 2, got {room.status}"
    assert room.current_round == 2, f"Expected current_round=2, got {room.current_round}"

    # End round 2
    room.deck.clear()
    room._end_round()
    assert room.status == "round_over", f"Expected round_over after R2, got {room.status}"
    assert room.current_round == 2

    # Both players vote next_round to enter Round 3
    room.next_round(p1)
    room.next_round(p2)
    assert room.status == "playing", f"Expected playing for round 3, got {room.status}"
    assert room.current_round == 3, f"Expected current_round=3, got {room.current_round}"

    # End round 3 (Final round)
    room.deck.clear()
    room._end_round()
    assert room.status == "game_over", f"Expected game_over after R3, got {room.status}"
    assert room.current_round == 3

    print("All 3 rounds transition test passed perfectly!")

if __name__ == "__main__":
    asyncio.run(simulate_3_rounds())
