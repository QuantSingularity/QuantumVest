"""Flask extensions - instantiated once here, initialized inside create_app()."""

from flask_caching import Cache
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
cache = Cache()
cors = CORS()
