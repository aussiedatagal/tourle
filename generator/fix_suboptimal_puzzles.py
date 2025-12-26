#!/usr/bin/env python3
"""
Fix suboptimal puzzles by re-solving them with the exact solver.

This script:
1. Finds all puzzles that are suboptimal
2. Re-solves them with the exact solver
3. Updates both the puzzle and solution files with the correct optimal distance
"""

import json
import sys
from pathlib import Path
import numpy as np
from python_tsp.exact import solve_tsp_dynamic_programming
from verify_puzzle_optimality import verify_puzzle, calculate_distance_matrix


def fix_puzzle(puzzle_path, solution_path=None, dry_run=False):
    """
    Fix a suboptimal puzzle by re-solving with exact solver.
    
    Returns:
        dict with fix results
    """
    # Verify first
    result = verify_puzzle(puzzle_path, solution_path)
    
    if result.get('is_optimal') is True:
        return {
            'puzzle_path': str(puzzle_path),
            'status': 'already_optimal',
            'message': 'Puzzle is already optimal'
        }
    
    if result.get('method') != 'exact' or not result.get('verified_optimal'):
        return {
            'puzzle_path': str(puzzle_path),
            'status': 'cannot_fix',
            'message': f"Cannot fix: {result.get('error', 'Unknown error')}"
        }
    
    # Load puzzle
    with open(puzzle_path, 'r') as f:
        puzzle = json.load(f)
    
    north_pole = puzzle['north_pole']
    houses = puzzle['houses']
    
    # Re-solve with exact solver
    distance_matrix = calculate_distance_matrix(north_pole, houses)
    permutation, optimal_distance = solve_tsp_dynamic_programming(distance_matrix)
    
    # Update puzzle
    puzzle['optimal_distance'] = float(optimal_distance)
    
    # Update solution if it exists
    solution = None
    if solution_path and solution_path.exists():
        with open(solution_path, 'r') as f:
            solution = json.load(f)
        
        # Reconstruct route from permutation
        route = []
        for idx in permutation:
            if idx == 0:
                route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
            else:
                house = houses[idx - 1]
                route.append({'type': 'house', 'id': house['id'], 'x': house['x'], 'y': house['y']})
        
        if route[-1]['type'] != 'north_pole':
            route.append({'type': 'north_pole', 'x': north_pole['x'], 'y': north_pole['y']})
        
        solution['route'] = route
        solution['optimal_distance'] = float(optimal_distance)
    
    # Save if not dry run
    if not dry_run:
        with open(puzzle_path, 'w') as f:
            json.dump(puzzle, f, indent=2)
        
        if solution and solution_path:
            with open(solution_path, 'w') as f:
                json.dump(solution, f, indent=2)
    
    old_distance = result['stored_optimal']
    new_distance = float(optimal_distance)
    improvement = old_distance - new_distance
    improvement_pct = (improvement / old_distance) * 100
    
    return {
        'puzzle_path': str(puzzle_path),
        'status': 'fixed' if not dry_run else 'would_fix',
        'old_distance': old_distance,
        'new_distance': new_distance,
        'improvement': improvement,
        'improvement_pct': improvement_pct,
        'message': f"Updated optimal distance from {old_distance:.2f} to {new_distance:.2f} ({improvement_pct:.2f}% improvement)"
    }


def main():
    """Main function to fix suboptimal puzzles."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix suboptimal puzzles')
    parser.add_argument('--all', action='store_true', help='Fix all suboptimal puzzles')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('puzzle_path', nargs='?', help='Path to puzzle file to fix')
    parser.add_argument('solution_path', nargs='?', help='Path to solution file (optional)')
    
    args = parser.parse_args()
    
    if args.all:
        # Find and fix all suboptimal puzzles
        puzzles_dir = Path(__file__).parent.parent / 'public' / 'puzzles'
        puzzle_files = list(puzzles_dir.rglob('*_easy.json')) + \
                      list(puzzles_dir.rglob('*_medium.json')) + \
                      list(puzzles_dir.rglob('*_hard.json'))
        
        puzzle_files = [f for f in puzzle_files if '_solution' not in f.name]
        
        print(f"Checking {len(puzzle_files)} puzzles...\n")
        
        fixed_count = 0
        already_optimal_count = 0
        cannot_fix_count = 0
        
        for puzzle_path in sorted(puzzle_files):
            solution_path = puzzle_path.parent / puzzle_path.name.replace('.json', '_solution.json')
            result = fix_puzzle(puzzle_path, solution_path if solution_path.exists() else None, args.dry_run)
            
            if result['status'] == 'fixed' or result['status'] == 'would_fix':
                print(f"✓ {puzzle_path.name}: {result['message']}")
                fixed_count += 1
            elif result['status'] == 'already_optimal':
                already_optimal_count += 1
            else:
                print(f"✗ {puzzle_path.name}: {result['message']}")
                cannot_fix_count += 1
        
        print(f"\n{'='*80}")
        print(f"Summary:")
        if args.dry_run:
            print(f"  Would fix: {fixed_count}")
        else:
            print(f"  Fixed: {fixed_count}")
        print(f"  Already optimal: {already_optimal_count}")
        print(f"  Cannot fix: {cannot_fix_count}")
        print(f"  Total: {len(puzzle_files)}")
        
    elif args.puzzle_path:
        # Fix single puzzle
        puzzle_path = Path(args.puzzle_path)
        solution_path = Path(args.solution_path) if args.solution_path else None
        
        if not puzzle_path.exists():
            print(f"Error: Puzzle file not found: {puzzle_path}")
            sys.exit(1)
        
        result = fix_puzzle(puzzle_path, solution_path, args.dry_run)
        
        print(f"Fix results for {puzzle_path.name}:")
        print(f"  Status: {result['status']}")
        print(f"  {result['message']}")
        
        if 'old_distance' in result:
            print(f"  Old distance: {result['old_distance']:.2f}")
            print(f"  New distance: {result['new_distance']:.2f}")
            print(f"  Improvement: {result['improvement']:.2f} ({result['improvement_pct']:.2f}%)")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()

