"""
utils/logger.py
───────────────
Application-wide logger.  Import `logger` anywhere in the codebase.
Log level is controlled by the LOG_LEVEL env var (default: INFO).
"""

import logging
import sys
import os


def _build_logger(name: str = "fittrack") -> logging.Logger:
    log = logging.getLogger(name)
    if log.handlers:          # avoid duplicate handlers during hot-reload
        return log

    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    log.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    log.addHandler(handler)
    return log


logger = _build_logger()
