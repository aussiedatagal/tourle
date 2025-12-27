#!/usr/bin/env python3
"""
Regenerate all hard puzzles with the new harder settings.
"""

import sys
from pathlib import Path
from generate_puzzle import generate_puzzle, save_puzzle
from datetime import datetime

def main():
    dates = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', 
             '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', 
             '21', '22', '23', '24', '25', '26', '27', '31']
    
    base_path = Path(__file__).parent.parent / 'public' / 'puzzles' / '2025' / '12'
    
    for day in dates:
        date = datetime(2025, 12, int(day))
        print(f'Regenerating hard puzzle for {date.strftime("%Y-%m-%d")}...')
        
        # Generate hard puzzle with 16 houses and tight spacing
        puzzle, solution = generate_puzzle(date, num_houses=16, difficulty='hard')
        
        # Save puzzle and solution
        puzzle_path = base_path / f'{day}_hard.json'
        solution_path = base_path / f'{day}_hard_solution.json'
        
        save_puzzle(puzzle, puzzle_path)
        save_puzzle(solution, solution_path)
        
        print(f'  Houses: {len(puzzle["houses"])}')
        print(f'  Optimal distance: {puzzle["optimal_distance"]:.2f}')
    
    print('\nAll hard puzzles regenerated!')

if __name__ == '__main__':
    main()

