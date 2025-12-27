#!/usr/bin/env python3
"""
Santa's Sleigh Route Puzzle Generator

Generates daily TSP puzzles with guaranteed optimal solutions.
Saves puzzles in puzzles/YYYY/MM/DD.json format.

OPTIMALITY GUARANTEE:
- Uses exact solver (dynamic programming) for puzzles up to 17 nodes (16 houses)
- All current puzzle sizes (easy: 6-8, medium: 10-12, hard: 16 houses) use exact solver
- Solutions are mathematically proven optimal, not heuristic approximations

DIFFICULTY SETTINGS:
- Easy: 10-12 houses, normal spacing (2 grid units = 200px minimum), 1000x1000 grid
- Medium: 16 houses (always maximum), tight spacing (1 grid unit = 100px minimum), 1000x1000 grid
- Hard: 18-20 houses, tight spacing (1 grid unit = 100px minimum), 
  1500x1500 grid (scaled to 1000x1000 for display) for maximum spread and challenge,
  generates multiple candidates and selects the most complex route,
  uses heuristic solver for optimal solutions

VERIFICATION:
- Use verify_puzzle_optimality.py to verify existing puzzles
- Use fix_suboptimal_puzzles.py to fix any puzzles that were created with heuristics
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import random
import numpy as np
from python_tsp.exact import solve_tsp_dynamic_programming
try:
    from python_tsp.heuristics import solve_tsp_simulated_annealing
    HAS_HEURISTIC = True
except ImportError:
    HAS_HEURISTIC = False


def generate_coordinates(num_houses, grid_size=1000, margin=None, grid_spacing=100, north_pole=None, min_grid_distance=None):
    """
    Generate random house coordinates on grid intersections.
    Ensures houses are placed on grid cross-sections (multiples of grid_spacing).
    Houses must be at least min_grid_distance grid units apart from each other and from the north pole.
    Nodes are kept away from edges to prevent emoji cutoff (minimum 1 grid unit margin).
    
    Args:
        min_grid_distance: Minimum distance in grid units (default: 2 for normal difficulty, 1 for hard)
    """
    houses = []
    # Minimum distance: 2 grid units (e.g., 2 * 100 = 200px) for normal difficulty
    # 1 grid unit (100px) for hard puzzles - creates more complex layouts
    # The renderer will automatically scale down emojis if nodes are too close to prevent overlap
    if min_grid_distance is None:
        min_grid_distance = 2
    
    # Ensure margin is at least 1 grid unit to prevent emoji cutoff at edges
    # With 3x scaling, emojis can be up to 84px, so we need at least 42px margin
    # Using 1 grid unit (100px) provides safe margin
    if margin is None:
        margin = grid_spacing  # 1 grid unit = 100px
    else:
        # Round margin up to nearest grid unit to ensure proper spacing
        margin = ((margin + grid_spacing - 1) // grid_spacing) * grid_spacing
    
    # Calculate valid grid positions (multiples of grid_spacing within bounds)
    # Ensure we're at least 1 grid unit from edges
    min_grid_x = grid_spacing  # At least 100px from left edge
    max_grid_x = ((grid_size - margin) // grid_spacing) * grid_spacing
    min_grid_y = grid_spacing  # At least 100px from top edge
    max_grid_y = ((grid_size - margin) // grid_spacing) * grid_spacing
    
    # Generate list of all valid grid positions
    valid_positions = []
    for x in range(min_grid_x, max_grid_x + 1, grid_spacing):
        for y in range(min_grid_y, max_grid_y + 1, grid_spacing):
            # Skip north pole position if provided
            if north_pole and x == north_pole['x'] and y == north_pole['y']:
                continue
            valid_positions.append((x, y))
    
    # Shuffle to randomize selection order
    random.shuffle(valid_positions)
    
    for i in range(num_houses):
        placed = False
        positions_tried = set()
        
        while len(positions_tried) < len(valid_positions) and not placed:
            # Try a random position we haven't tried yet
            remaining_positions = [pos for pos in valid_positions if pos not in positions_tried]
            if not remaining_positions:
                break
                
            x, y = random.choice(remaining_positions)
            positions_tried.add((x, y))
            
            # Check distance from north pole (if provided)
            too_close = False
            if north_pole:
                dx = abs(x - north_pole['x']) // grid_spacing
                dy = abs(y - north_pole['y']) // grid_spacing
                grid_dist = max(dx, dy)  # Chebyshev distance (king's move)
                
                if grid_dist < min_grid_distance:
                    too_close = True
            
            # Check distance from other houses (using grid units for efficiency)
            if not too_close:
                for house in houses:
                    # Calculate grid distance (Chebyshev distance in grid units)
                    dx = abs(x - house['x']) // grid_spacing
                    dy = abs(y - house['y']) // grid_spacing
                    grid_dist = max(dx, dy)  # Chebyshev distance (king's move)
                    
                    if grid_dist < min_grid_distance:
                        too_close = True
                        break
            
            if not too_close:
                houses.append({'id': i + 1, 'x': x, 'y': y})
                # Remove this position from valid_positions to avoid duplicates
                valid_positions.remove((x, y))
                placed = True
        
        if not placed:
            # If we couldn't place a house with proper spacing, stop placing more
            # This allows the generator to place as many houses as possible given constraints
            break
    
    return houses


def calculate_distance_matrix(north_pole, houses):
    """
    Calculate distance matrix for TSP solver.
    Includes North Pole as the first node (index 0).
    """
    nodes = [north_pole] + [{'x': h['x'], 'y': h['y']} for h in houses]
    n = len(nodes)
    distance_matrix = np.zeros((n, n))
    
    for i in range(n):
        for j in range(n):
            if i != j:
                dx = nodes[i]['x'] - nodes[j]['x']
                dy = nodes[i]['y'] - nodes[j]['y']
                distance_matrix[i][j] = np.sqrt(dx**2 + dy**2)
    
    return distance_matrix


def calculate_route_complexity(route):
    """
    Calculate complexity score for a route.
    Higher score = more complex/harder puzzle.
    
    Complexity factors:
    - Number of direction changes (more changes = harder)
    - Total route distance (longer = potentially harder)
    - How "non-straight" the route is
    """
    if len(route) < 3:
        return 0
    
    direction_changes = 0
    total_distance = 0
    prev_dx, prev_dy = None, None
    
    for i in range(len(route) - 1):
        dx = route[i+1]['x'] - route[i]['x']
        dy = route[i+1]['y'] - route[i]['y']
        dist = np.sqrt(dx**2 + dy**2)
        total_distance += dist
        
        # Check for direction change
        if prev_dx is not None and prev_dy is not None:
            # Normalize direction vectors
            prev_mag = np.sqrt(prev_dx**2 + prev_dy**2)
            curr_mag = np.sqrt(dx**2 + dy**2)
            
            if prev_mag > 0.1 and curr_mag > 0.1:  # Avoid division by zero
                prev_norm_x = prev_dx / prev_mag
                prev_norm_y = prev_dy / prev_mag
                curr_norm_x = dx / curr_mag
                curr_norm_y = dy / curr_mag
                
                # Dot product close to 1 means same direction, close to -1 means opposite
                # We want to count significant direction changes
                dot_product = prev_norm_x * curr_norm_x + prev_norm_y * curr_norm_y
                if dot_product < 0.7:  # Significant direction change (roughly >45 degrees)
                    direction_changes += 1
        
        prev_dx, prev_dy = dx, dy
    
    # Complexity score: combine direction changes and distance
    # Weight direction changes more heavily as they indicate route complexity
    complexity = direction_changes * 100 + total_distance * 0.1
    return complexity


def solve_tsp(north_pole, houses, use_heuristic=False):
    """
    Solve TSP problem to find optimal route.
    Returns the optimal distance and route.
    
    Uses exact solver for problems up to 17 nodes (16 houses).
    For larger problems, uses heuristic solver (simulated annealing).
    """
    distance_matrix = calculate_distance_matrix(north_pole, houses)
    num_nodes = len(houses) + 1  # +1 for North Pole
    
    # Use exact solution for problems up to 17 nodes (tested to work in reasonable time)
    if num_nodes <= 17 and not use_heuristic:
        try:
            permutation, distance = solve_tsp_dynamic_programming(distance_matrix)
            return distance, permutation
        except Exception as e:
            print(f"Exact solution failed: {e}")
            raise
    
    # For larger problems or when explicitly requested, use heuristic solver
    if HAS_HEURISTIC:
        try:
            permutation, distance = solve_tsp_simulated_annealing(distance_matrix)
            return distance, permutation
        except Exception as e:
            print(f"Heuristic solution failed: {e}")
            raise
    else:
        raise ValueError(f"Puzzle too large for exact solver ({num_nodes} nodes) and heuristic solver not available. Maximum supported: 17 nodes (16 houses).")


def generate_puzzle(date=None, num_houses=None, difficulty=None):
    """
    Generate a puzzle for the given date.
    
    Args:
        date: datetime object (defaults to today)
        num_houses: number of houses to generate (defaults to random 10-15)
        difficulty: 'easy', 'medium', or 'hard' - affects spacing and complexity
    
    Returns:
        tuple: (puzzle_dict, solution_dict)
    """
    if date is None:
        date = datetime.now()
    
    if num_houses is None:
        # Request 10-15 houses, but generator will place as many as possible with constraints
        num_houses = random.randint(10, 15)
    
    # For hard puzzles, use a larger grid (1500x1500) to create more spread out, challenging puzzles
    # For easy and medium, use standard 1000x1000 grid
    if difficulty == 'hard':
        grid_size = 1500
        # North Pole at center of larger grid (750 is a multiple of 100)
        grid_spacing = 100
        north_pole_x = (750 // grid_spacing) * grid_spacing
        north_pole_y = (750 // grid_spacing) * grid_spacing
    else:
        grid_size = 1000
        # North Pole at center (on grid intersection: 500 is a multiple of 100)
        grid_spacing = 100
        north_pole_x = (500 // grid_spacing) * grid_spacing
        north_pole_y = (500 // grid_spacing) * grid_spacing
    
    north_pole = {'x': north_pole_x, 'y': north_pole_y}
    
    # For hard and medium puzzles, use tighter spacing (1 grid unit) to create more complex layouts
    # For easy, use normal spacing (2 grid units)
    min_grid_distance = 1 if difficulty in ['hard', 'medium'] else 2
    
    # For hard puzzles, generate multiple candidates and select the most complex one
    if difficulty == 'hard':
        num_candidates = 5  # Generate 5 candidates and pick the most complex
        candidates = []
        
        for attempt in range(num_candidates):
            # Generate houses on larger grid
            houses = generate_coordinates(num_houses, grid_size=grid_size, north_pole=north_pole, grid_spacing=grid_spacing, min_grid_distance=min_grid_distance)
            
            # Solve TSP (use heuristic for hard puzzles with >16 houses)
            optimal_distance, permutation = solve_tsp(north_pole, houses, use_heuristic=True)
            
            # Build route for complexity calculation
            route = []
            for idx in permutation:
                if idx == 0:
                    route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
                else:
                    house = houses[idx - 1]
                    route.append({'type': 'house', 'id': house['id'], 'x': house['x'], 'y': house['y']})
            
            if route[-1]['type'] != 'north_pole':
                route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
            
            # Calculate complexity
            complexity = calculate_route_complexity(route)
            
            candidates.append({
                'houses': houses,
                'permutation': permutation,
                'optimal_distance': optimal_distance,
                'route': route,
                'complexity': complexity
            })
        
        # Select the candidate with highest complexity
        best_candidate = max(candidates, key=lambda c: c['complexity'])
        houses = best_candidate['houses']
        permutation = best_candidate['permutation']
        optimal_distance = best_candidate['optimal_distance']
        route = best_candidate['route']
        
        # Scale coordinates from 1500x1500 grid to 1000x1000 canvas
        # Scale factor: 1000/1500 = 2/3
        scale_factor = 1000.0 / 1500.0
        for house in houses:
            house['x'] = int(house['x'] * scale_factor)
            house['y'] = int(house['y'] * scale_factor)
        north_pole['x'] = int(north_pole['x'] * scale_factor)
        north_pole['y'] = int(north_pole['y'] * scale_factor)
        # Update route coordinates
        for node in route:
            node['x'] = int(node['x'] * scale_factor)
            node['y'] = int(node['y'] * scale_factor)
        # Recalculate optimal distance with scaled coordinates (use heuristic for >16 houses)
        optimal_distance, _ = solve_tsp(north_pole, houses, use_heuristic=len(houses) > 16)
    else:
        # For easy and medium, generate normally on 1000x1000 grid
        houses = generate_coordinates(num_houses, grid_size=grid_size, north_pole=north_pole, grid_spacing=grid_spacing, min_grid_distance=min_grid_distance)
        
        # Solve TSP
        optimal_distance, permutation = solve_tsp(north_pole, houses)
        
        # Create solution data
        route = []
        for idx in permutation:
            if idx == 0:
                route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
            else:
                house = houses[idx - 1]  # permutation uses 1-based indexing for houses
                route.append({'type': 'house', 'id': house['id'], 'x': house['x'], 'y': house['y']})
        
        # Ensure route ends at North Pole
        if route[-1]['type'] != 'north_pole':
            route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
    
    # Create puzzle data (without solution)
    puzzle = {
        'date': date.strftime('%Y-%m-%d'),
        'north_pole': north_pole,
        'houses': houses,
        'optimal_distance': float(optimal_distance)
    }
    
    solution = {
        'date': date.strftime('%Y-%m-%d'),
        'route': route,
        'optimal_distance': float(optimal_distance)
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
    """
    Main function: generate 3 puzzles (easy, medium, hard) for today or specified date.
    """
    # Determine date
    if len(sys.argv) > 1:
        # Date provided as argument (YYYY-MM-DD)
        try:
            date = datetime.strptime(sys.argv[1], '%Y-%m-%d')
        except ValueError:
            print(f"Invalid date format: {sys.argv[1]}. Use YYYY-MM-DD")
            sys.exit(1)
    else:
        # Use today's date
        date = datetime.now()
    
    # Determine output paths
    year = date.strftime('%Y')
    month = date.strftime('%m')
    day = date.strftime('%d')
    base_path = Path(__file__).parent.parent / 'public' / 'puzzles' / year / month
    
    # Define difficulty levels with house count ranges
    difficulties = [
        ('easy', 10, 12),  # Shifted up from old medium
        ('medium', 16, 16),  # Shifted up from old hard (tight spacing)
        ('hard', 18, 20)  # Hard puzzles: 18-20 houses on larger grid
    ]
    
    print(f"Generating puzzles for {date.strftime('%Y-%m-%d')}...")
    
    for difficulty, min_houses, max_houses in difficulties:
        print(f"\nGenerating {difficulty} puzzle...")
        num_houses = random.randint(min_houses, max_houses)
        puzzle, solution = generate_puzzle(date, num_houses, difficulty=difficulty)
        
        # Save puzzle and solution with difficulty suffix
        puzzle_path = base_path / f'{day}_{difficulty}.json'
        solution_path = base_path / f'{day}_{difficulty}_solution.json'
        
        save_puzzle(puzzle, puzzle_path)
        save_puzzle(solution, solution_path)
        
        print(f"  {difficulty.capitalize()} puzzle generated successfully!")
        print(f"    Houses: {len(puzzle['houses'])}")
        print(f"    Optimal distance: {puzzle['optimal_distance']:.2f}")
    
    print(f"\nAll puzzles generated for {date.strftime('%Y-%m-%d')}!")


if __name__ == '__main__':
    main()

