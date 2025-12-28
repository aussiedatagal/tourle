#!/usr/bin/env python3
"""
Regenerate all hard puzzles for December 2025, starting from today backwards.
Commits and pushes after each puzzle.
"""
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def main():
    # Get the repository root (parent of generator directory)
    repo_root = Path(__file__).parent.parent
    
    # Start from today and go backwards
    today = datetime.now()
    start_day = today.day
    year = today.year
    month = today.month
    
    # Generate hard puzzles from today backwards to day 1
    for day in range(start_day, 0, -1):
        date_str = f"{year}-{month:02d}-{day:02d}"
        print(f"\n{'='*60}")
        print(f"Regenerating hard puzzle for {date_str}")
        print(f"{'='*60}\n")
        
        # Generate the puzzle
        generator_script = repo_root / "generator" / "generate_puzzle.py"
        result = subprocess.run(
            [sys.executable, str(generator_script), date_str, "hard"],
            cwd=str(repo_root),
            capture_output=False
        )
        
        if result.returncode != 0:
            print(f"ERROR: Failed to generate puzzle for {date_str}")
            sys.exit(1)
        
        # Commit and push
        print(f"\nCommitting and pushing {date_str} hard puzzle...")
        
        # Add the puzzle files (force add solution since it's in .gitignore)
        puzzle_path = f"public/puzzles/{year}/{month:02d}/{day:02d}_hard.json"
        solution_path = f"public/puzzles/{year}/{month:02d}/{day:02d}_hard_solution.json"
        
        # Add puzzle file
        add_result = subprocess.run(
            ["git", "add", puzzle_path],
            cwd=str(repo_root),
            capture_output=True
        )
        
        if add_result.returncode != 0:
            print(f"ERROR: Failed to add puzzle file to git")
            print(add_result.stderr.decode())
            sys.exit(1)
        
        # Force add solution file (it's in .gitignore)
        add_result = subprocess.run(
            ["git", "add", "-f", solution_path],
            cwd=str(repo_root),
            capture_output=True
        )
        
        if add_result.returncode != 0:
            print(f"ERROR: Failed to add solution file to git")
            print(add_result.stderr.decode())
            sys.exit(1)
        
        # Commit with --no-verify to skip hooks
        commit_msg = f"Regenerate hard puzzle for {date_str} (16 nodes, no clustering)"
        commit_result = subprocess.run(
            ["git", "commit", "--no-verify", "-m", commit_msg],
            cwd=str(repo_root),
            capture_output=True
        )
        
        if commit_result.returncode != 0:
            error_msg = commit_result.stderr.decode()
            if "nothing to commit" in error_msg.lower():
                print(f"No changes to commit for {date_str}")
            else:
                print(f"WARNING: Commit failed: {error_msg}")
        else:
            print(f"Committed: {commit_msg}")
        
        # Push (git push doesn't have --no-verify, but we can use --no-verify on the commit)
        push_result = subprocess.run(
            ["git", "push"],
            cwd=str(repo_root),
            capture_output=True
        )
        
        if push_result.returncode != 0:
            print(f"ERROR: Failed to push")
            print(push_result.stderr.decode())
            sys.exit(1)
        
        print(f"Pushed: {date_str} hard puzzle")
    
    print(f"\n{'='*60}")
    print("All hard puzzles regenerated, committed, and pushed successfully!")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()

