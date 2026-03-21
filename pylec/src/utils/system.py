import sys
import os
from pathlib import Path

import tempfile

class SystemUtils:
    @staticmethod
    def get_documents_path():
        """
        Returns a writable directory for saving files.
        Prioritizes Documents -> OneDrive -> Desktop -> Home -> CWD -> Temp.
        """
        candidates = [
            Path.home() / "Documents",
            Path.home() / "OneDrive" / "Documents",
            Path.home() / "Desktop",
            Path.home(),
            Path(os.getcwd()),
            Path(tempfile.gettempdir())
        ]

        for path in candidates:
            try:
                if not path.exists():
                    continue
                # Check if it is a directory and writable
                if path.is_dir() and os.access(path, os.W_OK):
                    return path
            except Exception:
                continue

        # Ultimate fallback if everything fails (highly unlikely)
        return Path(tempfile.gettempdir())