import os
import sys

_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
for _candidate in (_BACKEND_DIR, os.path.dirname(_BACKEND_DIR)):
    if (
        os.path.isdir(os.path.join(_candidate, "ai_models"))
        and _candidate not in sys.path
    ):
        sys.path.append(_candidate)
