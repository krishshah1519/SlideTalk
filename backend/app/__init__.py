import logging
import sys
from logging.handlers import TimedRotatingFileHandler


DEFAULT_FORMATTER = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')


stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(DEFAULT_FORMATTER)

file_handler = TimedRotatingFileHandler('slidetalk.log', when='midnight', backupCount=7)
file_handler.setFormatter(DEFAULT_FORMATTER)


logger = logging.getLogger("slidetalk_logger")
logger.setLevel(logging.DEBUG)
logger.addHandler(stream_handler)
logger.addHandler(file_handler)