#!/usr/bin/env python3
"""
Verify that puzzle solutions are truly optimal by re-solving with exact solver.

This script can be used to:
1. Verify existing puzzles to ensure they have optimal solutions
2. Re-generate optimal solutions for puzzles that were created with heuristics
"""

import json
import sys
from pathlib import Path
import numpy as np
from python_tsp.exact import solve_tsp_dynamic_programming


def calculate_distance_matrix(north_pole, houses):
    """Calculate distance matrix for TSP solver."""
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


def calculate_route_distance(route):
    """Calculate total distance of a route."""
    total = 0.0
    for i in range(len(route) - 1):
        dx = route[i]['x'] - route[i+1]['x']
        dy = route[i]['y'] - route[i+1]['y']
        total += np.sqrt(dx**2 + dy**2)
    return total


def verify_puzzle(puzzle_path, solution_path=None):
    """
    Verify that a puzzle's optimal_distance is truly optimal.
    
    Returns:
        dict with verification results
    """
    with open(puzzle_path, 'r') as f:
        puzzle = json.load(f)
    
    north_pole = puzzle['north_pole']
    houses = puzzle['houses']
    stored_optimal = puzzle['optimal_distance']
    num_nodes = len(houses) + 1
    
    # Calculate distance matrix
    distance_matrix = calculate_distance_matrix(north_pole, houses)
    
    result = {
        'puzzle_path': str(puzzle_path),
        'num_houses': len(houses),
        'num_nodes': num_nodes,
        'stored_optimal': stored_optimal,
        'verified_optimal': None,
        'is_optimal': None,
        'difference': None,
        'method': None,
        'error': None
    }
    
    # Try exact solver if possible
    if num_nodes <= 17:
        try:
            permutation, verified_distance = solve_tsp_dynamic_programming(distance_matrix)
            result['verified_optimal'] = float(verified_distance)
            result['method'] = 'exact'
            
            # Check if stored optimal matches verified optimal (within floating point tolerance)
            diff = abs(stored_optimal - verified_distance)
            result['difference'] = diff
            result['is_optimal'] = diff < 0.01  # Allow small floating point differences
            
            # If solution path provided, also verify the route distance
            if solution_path and Path(solution_path).exists():
                with open(solution_path, 'r') as f:
                    solution = json.load(f)
                route_distance = calculate_route_distance(solution['route'])
                result['route_distance'] = float(route_distance)
                result['route_matches_optimal'] = abs(route_distance - verified_distance) < 0.01
            
        except Exception as e:
            result['error'] = str(e)
            result['method'] = 'exact (failed)'
    else:
        # Too large for exact solver
        result['method'] = 'too_large'
        result['error'] = f'Puzzle too large for exact solver ({num_nodes} nodes)'
    
    return result


def main():
    """Main function to verify puzzles."""
    if len(sys.argv) < 2:
        print("Usage: verify_puzzle_optimality.py <puzzle_path> [solution_path]")
        print("   or: verify_puzzle_optimality.py --all")
        sys.exit(1)
    
    if sys.argv[1] == '--all':
        # Verify all puzzles in puzzles directory
        puzzles_dir = Path(__file__).parent.parent / 'puzzles'
        puzzle_files = list(puzzles_dir.rglob('*_easy.json')) + \
                      list(puzzles_dir.rglob('*_medium.json')) + \
                      list(puzzles_dir.rglob('*_hard.json'))
        
        # Exclude solution files
        puzzle_files = [f for f in puzzle_files if '_solution' not in f.name]
        
        print(f"Found {len(puzzle_files)} puzzles to verify...\n")
        
        results = []
        for puzzle_path in sorted(puzzle_files):
            solution_path = puzzle_path.parent / puzzle_path.name.replace('.json', '_solution.json')
            result = verify_puzzle(puzzle_path, solution_path if solution_path.exists() else None)
            results.append(result)
            
            status = "✓" if result.get('is_optimal') else "✗" if result.get('is_optimal') is False else "?"
            method = result.get('method', 'unknown')
            print(f"{status} {puzzle_path.name:30} {result['num_houses']:2} houses  "
                  f"Stored: {result['stored_optimal']:8.2f}  "
                  f"Verified: {result.get('verified_optimal', 'N/A'):8.2f}  "
                  f"Method: {method}")
        
        # Summary
        optimal_count = sum(1 for r in results if r.get('is_optimal') is True)
        suboptimal_count = sum(1 for r in results if r.get('is_optimal') is False)
        unknown_count = sum(1 for r in results if r.get('is_optimal') is None)
        
        print(f"\n{'='*80}")
        print(f"Summary:")
        print(f"  Optimal: {optimal_count}")
        print(f"  Suboptimal: {suboptimal_count}")
        print(f"  Unknown/Too large: {unknown_count}")
        print(f"  Total: {len(results)}")
        
        # Show suboptimal puzzles
        if suboptimal_count > 0:
            print(f"\nSuboptimal puzzles:")
            for r in results:
                if r.get('is_optimal') is False:
                    print(f"  {r['puzzle_path']}: stored={r['stored_optimal']:.2f}, "
                          f"verified={r.get('verified_optimal', 'N/A'):.2f}, "
                          f"diff={r.get('difference', 0):.2f}")
    else:
        # Verify single puzzle
        puzzle_path = Path(sys.argv[1])
        solution_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        
        if not puzzle_path.exists():
            print(f"Error: Puzzle file not found: {puzzle_path}")
            sys.exit(1)
        
        result = verify_puzzle(puzzle_path, solution_path)
        
        print(f"Verification results for {puzzle_path.name}:")
        print(f"  Houses: {result['num_houses']}")
        print(f"  Nodes: {result['num_nodes']}")
        print(f"  Stored optimal distance: {result['stored_optimal']:.2f}")
        
        if result.get('verified_optimal'):
            print(f"  Verified optimal distance: {result['verified_optimal']:.2f}")
            print(f"  Difference: {result['difference']:.4f}")
            print(f"  Is optimal: {result['is_optimal']}")
            print(f"  Method: {result['method']}")
            
            if result.get('route_distance'):
                print(f"  Route distance: {result['route_distance']:.2f}")
                print(f"  Route matches optimal: {result.get('route_matches_optimal', False)}")
        else:
            print(f"  Method: {result['method']}")
            if result.get('error'):
                print(f"  Error: {result['error']}")


if __name__ == '__main__':
    main()

