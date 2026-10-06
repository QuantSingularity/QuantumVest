import uuid

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

JsonType = JSON().with_variant(JSONB(), "postgresql")


def uuid_col():
    from app.extensions import db

    return db.String(36)


def new_uuid():
    return str(uuid.uuid4())
