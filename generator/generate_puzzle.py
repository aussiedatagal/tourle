#!/usr/bin/env python3
"""
Santa's Sleigh Route Puzzle Generator

Generates daily TSP puzzles with guaranteed optimal solutions.
Saves puzzles in puzzles/YYYY/MM/DD.json format.

OPTIMALITY GUARANTEE:
- Uses exact solver (dynamic programming) for puzzles up to 17 nodes (16 houses)
- All current puzzle sizes (easy: 6-8, medium: 10-12, hard: 14-16 houses) use exact solver
- Solutions are mathematically proven optimal, not heuristic approximations

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


def generate_coordinates(num_houses, grid_size=1000, margin=None, grid_spacing=100, north_pole=None):
    """
    Generate random house coordinates on grid intersections.
    Ensures houses are placed on grid cross-sections (multiples of grid_spacing).
    Houses must be at least 3 grid units apart from each other and from the north pole.
    Nodes are kept away from edges to prevent emoji cutoff (minimum 1 grid unit margin).
    """
    houses = []
    # Minimum distance: 2 grid units (e.g., 2 * 100 = 200px)
    # This provides a good balance - challenging but not too cramped
    # The renderer will automatically scale down emojis if nodes are too close to prevent overlap
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


def solve_tsp(north_pole, houses):
    """
    Solve TSP problem to find optimal route.
    Returns the optimal distance and route.
    
    Uses exact solver for problems up to 17 nodes (16 houses).
    For larger problems, raises an error - use constructive generation instead.
    """
    distance_matrix = calculate_distance_matrix(north_pole, houses)
    num_nodes = len(houses) + 1  # +1 for North Pole
    
    # Use exact solution for problems up to 17 nodes (tested to work in reasonable time)
    if num_nodes <= 17:
        try:
            permutation, distance = solve_tsp_dynamic_programming(distance_matrix)
            return distance, permutation
        except Exception as e:
            print(f"Exact solution failed: {e}")
            raise
    
    # For larger problems, raise an error
    raise ValueError(f"Puzzle too large for exact solver ({num_nodes} nodes). Maximum supported: 17 nodes (16 houses).")


def generate_puzzle(date=None, num_houses=None):
    """
    Generate a puzzle for the given date.
    
    Args:
        date: datetime object (defaults to today)
        num_houses: number of houses to generate (defaults to random 10-15)
    
    Returns:
        tuple: (puzzle_dict, solution_dict)
    """
    if date is None:
        date = datetime.now()
    
    if num_houses is None:
        # Request 10-15 houses, but generator will place as many as possible with constraints
        num_houses = random.randint(10, 15)
    
    # North Pole at center (on grid intersection: 500 is a multiple of 100)
    # Ensure it's on a grid intersection and not too close to edges
    grid_spacing = 100
    north_pole_x = (500 // grid_spacing) * grid_spacing  # Round to nearest grid
    north_pole_y = (500 // grid_spacing) * grid_spacing
    north_pole = {'x': north_pole_x, 'y': north_pole_y}
    
    # Generate houses (pass north_pole to ensure houses aren't too close to it)
    # Use default margin (1 grid unit = 100px) to keep nodes away from edges
    houses = generate_coordinates(num_houses, north_pole=north_pole, grid_spacing=grid_spacing)
    
    # Solve TSP
    optimal_distance, permutation = solve_tsp(north_pole, houses)
    
    # Create puzzle data (without solution)
    puzzle = {
        'date': date.strftime('%Y-%m-%d'),
        'north_pole': north_pole,
        'houses': houses,
        'optimal_distance': float(optimal_distance)
    }
    
    # Create solution data
    # permutation[0] is North Pole (index 0), rest are house indices (1-based in our system)
    # Convert permutation to route: [0, house_idx1, house_idx2, ..., 0]
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
        ('easy', 6, 8),
        ('medium', 10, 12),
        ('hard', 14, 16)
    ]
    
    print(f"Generating puzzles for {date.strftime('%Y-%m-%d')}...")
    
    for difficulty, min_houses, max_houses in difficulties:
        print(f"\nGenerating {difficulty} puzzle...")
        num_houses = random.randint(min_houses, max_houses)
        puzzle, solution = generate_puzzle(date, num_houses)
        
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

