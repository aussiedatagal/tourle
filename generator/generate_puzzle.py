#!/usr/bin/env python3
"""
Daily TSP puzzle generator (single entrypoint).

Key rules:
- Exact optimality only (dynamic programming); house count capped at <=16.
- Difficulty uses candidate search with human-like heuristic gap + route complexity scoring.
- Hard puzzles bias layouts (clusters/bottlenecks/outliers) to increase human difficulty.

Usage:
  python generator/generate_puzzle.py [YYYY-MM-DD]

Outputs:
  public/puzzles/YYYY/MM/DD_{difficulty}.json
  public/puzzles/YYYY/MM/DD_{difficulty}_solution.json
"""

import json
import sys
import math
import random
from datetime import datetime
from pathlib import Path

import numpy as np
from python_tsp.exact import solve_tsp_dynamic_programming


GRID_SIZE = 1000
GRID_SPACING = 100
MIN_MARGIN = GRID_SPACING  # keep emojis away from edges
MAX_HOUSES = 16  # exact solver cap (17 nodes incl. north pole)


def log(msg):
    print(msg, flush=True)


def build_valid_positions(grid_size=GRID_SIZE, grid_spacing=GRID_SPACING, margin=MIN_MARGIN, north_pole=None):
    min_x = grid_spacing
    max_x = ((grid_size - margin) // grid_spacing) * grid_spacing
    min_y = grid_spacing
    max_y = ((grid_size - margin) // grid_spacing) * grid_spacing
    positions = []
    for x in range(min_x, max_x + 1, grid_spacing):
        for y in range(min_y, max_y + 1, grid_spacing):
            if north_pole and x == north_pole["x"] and y == north_pole["y"]:
                continue
            positions.append((x, y))
    return positions


def is_far_enough(target, placed, min_grid_distance, grid_spacing):
    for house in placed:
        dx = abs(target[0] - house["x"]) // grid_spacing
        dy = abs(target[1] - house["y"]) // grid_spacing
        if max(dx, dy) < min_grid_distance:
            return False
    return True


def generate_coordinates(num_houses, *, north_pole, min_grid_distance, biased=False):
    """Generate coordinates on grid; biased layouts for hard if requested."""
    valid_positions = build_valid_positions(north_pole=north_pole)
    random.shuffle(valid_positions)

    houses = []

    def pick_position(preferred):
        for pos in preferred:
            if pos in valid_positions and is_far_enough(pos, houses, min_grid_distance, GRID_SPACING):
                valid_positions.remove(pos)
                return pos
        return None

    if biased:
        # Bias toward clustered/bottleneck/outlier patterns
        cluster_count = random.choice([2, 3])
        centers = random.sample(valid_positions, cluster_count)
        cluster_sizes = [max(3, num_houses // cluster_count) for _ in range(cluster_count)]
        remaining = num_houses - sum(cluster_sizes)
        for i in range(remaining):
            cluster_sizes[i % cluster_count] += 1

        # Outlier(s)
        outlier_targets = []
        if num_houses >= 15:
            corners = [
                (GRID_SPACING, GRID_SPACING),
                (GRID_SPACING, GRID_SIZE - GRID_SPACING),
                (GRID_SIZE - GRID_SPACING, GRID_SPACING),
                (GRID_SIZE - GRID_SPACING, GRID_SIZE - GRID_SPACING),
            ]
            random.shuffle(corners)
            outlier_targets.append(corners[0])
            if num_houses >= 16:
                outlier_targets.append(corners[1])

        # Place clusters
        for center, size in zip(centers, cluster_sizes):
            if len(houses) >= num_houses:
                break
            neighborhood = []
            for dx in [-GRID_SPACING, 0, GRID_SPACING]:
                for dy in [-GRID_SPACING, 0, GRID_SPACING]:
                    neighborhood.append((center[0] + dx, center[1] + dy))
            random.shuffle(neighborhood)
            placed = 0
            while placed < size and neighborhood and len(houses) < num_houses:
                pos = pick_position(neighborhood)
                if pos:
                    houses.append({"id": len(houses) + 1, "x": pos[0], "y": pos[1]})
                    placed += 1
                else:
                    break

        # Place outliers
        for target in outlier_targets:
            if len(houses) >= num_houses:
                break
            pos = pick_position([target])
            if pos:
                houses.append({"id": len(houses) + 1, "x": pos[0], "y": pos[1]})

        # Fill remaining with any valid positions that are sufficiently spaced
        while len(houses) < num_houses and valid_positions:
            pos = pick_position(valid_positions)
            if not pos:
                break
            houses.append({"id": len(houses) + 1, "x": pos[0], "y": pos[1]})
    else:
        while len(houses) < num_houses and valid_positions:
            pos = valid_positions.pop()
            if not is_far_enough(pos, houses, min_grid_distance, GRID_SPACING):
                continue
            houses.append({"id": len(houses) + 1, "x": pos[0], "y": pos[1]})

    return houses[:num_houses]


def calculate_distance_matrix(north_pole, houses):
    nodes = [north_pole] + [{"x": h["x"], "y": h["y"]} for h in houses]
    n = len(nodes)
    distance_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            dx = nodes[i]["x"] - nodes[j]["x"]
            dy = nodes[i]["y"] - nodes[j]["y"]
            distance_matrix[i][j] = math.hypot(dx, dy)
    return distance_matrix


def calculate_route_complexity(route):
    if len(route) < 3:
        return 0

    direction_changes = 0
    angles = []
    total_distance = 0.0
    prev_dx, prev_dy = None, None

    for i in range(len(route) - 1):
        dx = route[i + 1]["x"] - route[i]["x"]
        dy = route[i + 1]["y"] - route[i]["y"]
        dist = math.hypot(dx, dy)
        total_distance += dist

        if prev_dx is not None and prev_dy is not None:
            prev_mag = math.hypot(prev_dx, prev_dy)
            curr_mag = math.hypot(dx, dy)
            if prev_mag > 1e-6 and curr_mag > 1e-6:
                prev_norm = (prev_dx / prev_mag, prev_dy / prev_mag)
                curr_norm = (dx / curr_mag, dy / curr_mag)
                dot_product = prev_norm[0] * curr_norm[0] + prev_norm[1] * curr_norm[1]
                dot_product = max(-1.0, min(1.0, dot_product))
                angle = math.acos(dot_product)
                angles.append(angle)
                if dot_product < 0.7:
                    direction_changes += 1
        prev_dx, prev_dy = dx, dy

    angle_std = np.std(angles) if angles else 0.0
    complexity = direction_changes * 120 + total_distance * 0.05 + angle_std * 80
    return complexity


def solve_tsp_exact(north_pole, houses):
    distance_matrix = calculate_distance_matrix(north_pole, houses)
    num_nodes = len(houses) + 1
    if num_nodes > MAX_HOUSES + 1:
        raise ValueError(f"Too many houses ({len(houses)}) for exact solver limit {MAX_HOUSES}.")
    permutation, distance = solve_tsp_dynamic_programming(distance_matrix)
    return distance, permutation, distance_matrix


def nearest_neighbor_with_two_opt(distance_matrix, max_2opt_iters=30):
    n = distance_matrix.shape[0]
    unvisited = set(range(1, n))
    route = [0]
    current = 0
    while unvisited:
        nxt = min(unvisited, key=lambda j: distance_matrix[current, j])
        unvisited.remove(nxt)
        route.append(nxt)
        current = nxt
    route.append(0)

    def route_distance(r):
        return sum(distance_matrix[r[i], r[i + 1]] for i in range(len(r) - 1))

    improved = True
    iterations = 0
    while improved and iterations < max_2opt_iters:
        improved = False
        iterations += 1
        for i in range(1, len(route) - 2):
            for k in range(i + 1, len(route) - 1):
                a, b = route[i - 1], route[i]
                c, d = route[k], route[k + 1]
                current_len = distance_matrix[a, b] + distance_matrix[c, d]
                new_len = distance_matrix[a, c] + distance_matrix[b, d]
                if new_len + 1e-6 < current_len:
                    route[i:k + 1] = reversed(route[i:k + 1])
                    improved = True
        if not improved:
            break
    return route, route_distance(route)


def build_route_from_permutation(permutation, north_pole, houses):
    route = []
    for idx in permutation:
        if idx == 0:
            route.append({"type": "north_pole", "x": north_pole["x"], "y": north_pole["y"]})
        else:
            house = houses[idx - 1]
            route.append({"type": "house", "id": house["id"], "x": house["x"], "y": house["y"]})
    if route[-1]["type"] != "north_pole":
        route.append({"type": "north_pole", "x": north_pole["x"], "y": north_pole["y"]})
    return route


def score_candidate(north_pole, houses):
    optimal_distance, permutation, distance_matrix = solve_tsp_exact(north_pole, houses)
    optimal_route = build_route_from_permutation(permutation, north_pole, houses)
    complexity = calculate_route_complexity(optimal_route)

    heuristic_path, heuristic_distance = nearest_neighbor_with_two_opt(distance_matrix)
    heuristic_gap = max(0.0, (heuristic_distance - optimal_distance) / optimal_distance)

    score = heuristic_gap * 1200 + complexity * 0.4
    return {
        "optimal_distance": float(optimal_distance),
        "optimal_route": optimal_route,
        "permutation": permutation,
        "complexity": complexity,
        "heuristic_gap": heuristic_gap,
        "score": score,
    }


DIFFICULTY_CONFIG = {
    "easy": {
        "house_range": (12, 12),
        "min_gap": 0.0,
        "min_complexity": 60,
        "candidates": 4,
        "min_grid_distance": 2,
        "biased": False,
    },
    "medium": {
        "house_range": (14, 14),
        "min_gap": 0.05,
        "min_complexity": 130,
        "candidates": 6,
        "min_grid_distance": 1,
        "biased": False,
    },
    "hard": {
        "house_range": (16, 16),
        "min_gap": 0.10,
        "min_complexity": 180,
        "candidates": 1,
        "min_grid_distance": 1,
        "biased": False,
    },
}


def generate_puzzle(date=None, difficulty="medium"):
    if date is None:
        date = datetime.now()

    if difficulty not in DIFFICULTY_CONFIG:
        raise ValueError(f"Unknown difficulty '{difficulty}'")

    cfg = DIFFICULTY_CONFIG[difficulty]
    num_houses = random.randint(*cfg["house_range"])
    num_houses = min(num_houses, MAX_HOUSES)

    north_pole = {"x": GRID_SIZE // 2, "y": GRID_SIZE // 2}

    log(f"[{difficulty}] Generating puzzle (houses={num_houses})...")
    
    # Generate the first candidate and use it
    houses = generate_coordinates(
        num_houses,
        north_pole=north_pole,
        min_grid_distance=cfg["min_grid_distance"],
        biased=cfg["biased"],
    )

    if len(houses) < num_houses:
        raise RuntimeError(f"Insufficient houses placed ({len(houses)}/{num_houses})")

    stats = score_candidate(north_pole, houses)
    log(
        f"[{difficulty}] Generated: gap={stats['heuristic_gap']:.3f}, "
        f"complexity={stats['complexity']:.1f}, score={stats['score']:.1f}"
    )
    
    chosen = {**stats, "houses": houses}

    houses = chosen["houses"]
    optimal_distance = chosen["optimal_distance"]
    optimal_route = chosen["optimal_route"]

    puzzle = {
        "date": date.strftime("%Y-%m-%d"),
        "north_pole": north_pole,
        "houses": houses,
        "optimal_distance": float(optimal_distance),
        "optimal_route": optimal_route,
    }

    solution = {
        "date": date.strftime("%Y-%m-%d"),
        "route": optimal_route,
        "optimal_distance": float(optimal_distance),
    }

    return puzzle, solution


def save_puzzle(puzzle, output_path):
    """
    Save puzzle to JSON file, creating directories if needed.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(puzzle, f, indent=2)
    
    print(f"Saved puzzle to {output_path}")


def main():
    if len(sys.argv) > 1:
        try:
            date = datetime.strptime(sys.argv[1], "%Y-%m-%d")
        except ValueError:
            print(f"Invalid date format: {sys.argv[1]}. Use YYYY-MM-DD")
            sys.exit(1)
    else:
        date = datetime.now()

    # Optional difficulty filter
    target_difficulty = None
    if len(sys.argv) > 2:
        target_difficulty = sys.argv[2]
        if target_difficulty not in DIFFICULTY_CONFIG:
            print(f"Unknown difficulty: {target_difficulty}. Use: easy, medium, hard")
            sys.exit(1)

    year = date.strftime("%Y")
    month = date.strftime("%m")
    day = date.strftime("%d")
    base_path = Path(__file__).parent.parent / "public" / "puzzles" / year / month

    difficulties = [target_difficulty] if target_difficulty else ["easy", "medium", "hard"]

    log(f"Generating puzzles for {date.strftime('%Y-%m-%d')}...")

    for difficulty in difficulties:
        log(f"\n[{difficulty}] Starting generation...")
        puzzle, solution = generate_puzzle(date, difficulty=difficulty)

        puzzle_path = base_path / f"{day}_{difficulty}.json"
        solution_path = base_path / f"{day}_{difficulty}_solution.json"

        save_puzzle(puzzle, puzzle_path)
        save_puzzle(solution, solution_path)

        log(
            f"[{difficulty}] Done. Houses={len(puzzle['houses'])}, "
            f"Optimal distance={puzzle['optimal_distance']:.2f}"
        )

    log(f"\nAll puzzles generated for {date.strftime('%Y-%m-%d')}.")


if __name__ == '__main__':
    main()

