#!/usr/bin/env python3
import sys
import os

# 1. APPLY PATCH IMMEDIATELY
try:
    import nest_asyncio
    nest_asyncio.apply()
except ImportError:
    pass

# Ensure the src directory is in the python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, "src"))



try:
    from src.main import main
except ImportError as e:
    print(f"Error importing src.main: {e}")
    sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExiting...")
        sys.exit()
