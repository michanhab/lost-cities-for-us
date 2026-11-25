import asyncio
import json
import websockets
import urllib.request
import time
import subprocess
import sys

def test_scoring_logic():
    from server import calculate_expedition_score, calculate_player_scores
    
    # Test 1: Empty expedition
    s0 = calculate_expedition_score([])
    assert s0["total"] == 0
    
    # Test 2: User query example: (35 - 20) * 3 + 20 = 65
    # 2 investments (multiplier = 3), numbers sum 35, 8 cards total (2 inv + 6 numbers)
    cards = [
        {"type": "investment", "value": 0},
        {"type": "investment", "value": 0},
        {"type": "number", "value": 4},
        {"type": "number", "value": 5},
        {"type": "number", "value": 6},
        {"type": "number", "value": 6},
        {"type": "number", "value": 7},
        {"type": "number", "value": 7}, # sum = 35, total 8 cards
    ]
    s1 = calculate_expedition_score(cards)
    assert s1["numbers_sum"] == 35
    assert s1["investments"] == 2
    assert s1["multiplier"] == 3
    assert s1["base_score"] == 15
    assert s1["subtotal"] == 45
    assert s1["bonus"] == 20
    assert s1["total"] == 65, f"Expected 65, got {s1['total']}"
    
    # Test 3: Negative score with multiplier
    # 1 investment (mult = 2), sum = 10 -> (10 - 20) * 2 = -20
    neg_cards = [
        {"type": "investment", "value": 0},
        {"type": "number", "value": 10}
    ]
    s2 = calculate_expedition_score(neg_cards)
    assert s2["total"] == -20, f"Expected -20, got {s2['total']}"
    print("Scoring logic tests passed successfully!")

def test_deck_composition():
    from server import create_deck, COLORS
    deck = create_deck()
    assert len(deck) == 60
    for color in COLORS:
        c_cards = [c for c in deck if c["color"] == color]
        assert len(c_cards) == 12
        invs = [c for c in c_cards if c["type"] == "investment"]
        nums = [c for c in c_cards if c["type"] == "number"]
        assert len(invs) == 3
        assert len(nums) == 9
        values = sorted([c["value"] for c in nums])
        assert values == [2, 3, 4, 5, 6, 7, 8, 9, 10]
    print("Deck composition tests passed successfully!")

def test_rules_validation():
    from server import GameRoom
    room = GameRoom("TEST01", max_rounds=1)
    room.add_player("p1", "Player 1", None, "s1")
    room.add_player("p2", "Player 2", None, "s2")
    room.start_game()
    
    p1 = "p1"
    # Test ascending order rule
    room.expeditions[p1]["red"] = [
        {"id": "red_inv_0", "color": "red", "type": "investment", "value": 0},
        {"id": "red_5", "color": "red", "type": "number", "value": 5}
    ]
    
    # Trying to add investment after number card must fail
    inv_card = {"id": "red_inv_1", "color": "red", "type": "investment", "value": 0}
    assert not room.can_play_to_expedition(p1, inv_card)
    
    # Trying to add smaller number card (e.g. 4 or 5) must fail
    num_4 = {"id": "red_4", "color": "red", "type": "number", "value": 4}
    num_5 = {"id": "red_5b", "color": "red", "type": "number", "value": 5}
    assert not room.can_play_to_expedition(p1, num_4)
    assert not room.can_play_to_expedition(p1, num_5)
    
    # Trying to add strictly higher number card (e.g. 6 or 10) must succeed
    num_6 = {"id": "red_6", "color": "red", "type": "number", "value": 6}
    assert room.can_play_to_expedition(p1, num_6)
    
    print("Rules validation tests passed successfully!")

if __name__ == "__main__":
    test_scoring_logic()
    test_deck_composition()
    test_rules_validation()
    print("All unit tests passed!")
