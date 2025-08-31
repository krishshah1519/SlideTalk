import logging
import sys
from logging.handlers import TimedRotatingFileHandler

# Define the package-level logger
DEFAULT_FORMATTER = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Console handler
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(DEFAULT_FORMATTER)

# File handler
file_handler = TimedRotatingFileHandler('slidetalk.log', when='midnight', backupCount=7)
file_handler.setFormatter(DEFAULT_FORMATTER)

# Create and configure the logger
logger = logging.getLogger("slidetalk_logger")
logger.setLevel(logging.DEBUG)
logger.addHandler(stream_handler)
logger.addHandler(file_handler)