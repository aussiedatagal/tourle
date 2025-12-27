#!/usr/bin/env python3
"""
Regenerate all puzzles with the new difficulty settings:
- Easy: 10-12 houses, normal spacing
- Medium: 16 houses, tight spacing
- Hard: 18-20 houses, tight spacing, larger grid
"""

import sys
from pathlib import Path
from generate_puzzle import generate_puzzle, save_puzzle
from datetime import datetime
import random
import time

def main():
    # Get all dates from existing puzzle files
    puzzles_dir = Path(__file__).parent.parent / 'public' / 'puzzles' / '2025' / '12'
    
    # Find all unique dates from existing puzzle files
    dates = set()
    for puzzle_file in puzzles_dir.glob('*_easy.json'):
        day = puzzle_file.name.split('_')[0]
        dates.add(day)
    
    dates = sorted(dates)
    total_dates = len(dates)
    total_puzzles = total_dates * 3  # 3 difficulties per date
    
    print(f"Found {total_dates} dates to regenerate ({total_puzzles} puzzles total)...\n")
    print("=" * 80)
    
    base_path = Path(__file__).parent.parent / 'public' / 'puzzles' / '2025' / '12'
    
    puzzle_count = 0
    start_time = time.time()
    
    for date_idx, day in enumerate(dates, 1):
        date = datetime(2025, 12, int(day))
        print(f'\n[{date_idx}/{total_dates}] Regenerating puzzles for {date.strftime("%Y-%m-%d")}...')
        
        # Generate all three difficulty levels
        for difficulty in ['easy', 'medium', 'hard']:
            puzzle_count += 1
            difficulty_start = time.time()
            
            if difficulty == 'easy':
                # Easy: 10-12 houses, normal spacing
                num_houses = random.randint(10, 12)
            elif difficulty == 'medium':
                # Medium: 16 houses, tight spacing
                num_houses = 16
            else:  # hard
                # Hard: 18-20 houses, tight spacing, larger grid
                num_houses = random.randint(18, 20)
            
            print(f'  [{puzzle_count}/{total_puzzles}] Generating {difficulty} puzzle ({num_houses} houses)...', end=' ', flush=True)
            
            try:
                puzzle, solution = generate_puzzle(date, num_houses=num_houses, difficulty=difficulty)
                
                # Save puzzle and solution
                puzzle_path = base_path / f'{day}_{difficulty}.json'
                solution_path = base_path / f'{day}_{difficulty}_solution.json'
                
                save_puzzle(puzzle, puzzle_path)
                save_puzzle(solution, solution_path)
                
                elapsed = time.time() - difficulty_start
                print(f'✓ {len(puzzle["houses"])} houses, distance: {puzzle["optimal_distance"]:.2f} ({elapsed:.1f}s)')
            except Exception as e:
                elapsed = time.time() - difficulty_start
                print(f'✗ ERROR: {e} ({elapsed:.1f}s)')
                raise
        
        # Show progress summary
        elapsed_total = time.time() - start_time
        avg_time = elapsed_total / puzzle_count
        remaining = (total_puzzles - puzzle_count) * avg_time
        print(f'  Progress: {puzzle_count}/{total_puzzles} puzzles ({puzzle_count*100//total_puzzles}%) | '
              f'Elapsed: {elapsed_total/60:.1f}m | Est. remaining: {remaining/60:.1f}m')
    
    total_time = time.time() - start_time
    print('\n' + '=' * 80)
    print(f'All puzzles regenerated!')
    print(f'Total time: {total_time/60:.1f} minutes')
    print(f'Average time per puzzle: {total_time/total_puzzles:.1f} seconds')

if __name__ == '__main__':
    main()

