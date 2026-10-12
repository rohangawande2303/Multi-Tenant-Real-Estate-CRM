"""add mandate fields

Revision ID: xxxx_add_mandate_fields
Revises: 
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'xxxx_add_mandate_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    schemas = inspector.get_schema_names()

    # Loop through all schemas to check for 'leads' table (public and tenant schemas)
    for schema in schemas:
        try:
            tables = inspector.get_table_names(schema=schema)
            if 'leads' in tables:
                columns = [c['name'] for c in inspector.get_columns('leads', schema=schema)]
                if 'mandate_id' not in columns:
                    op.add_column('leads', sa.Column('mandate_id', sa.Integer(), nullable=True), schema=schema)
                    bind.execute(sa.text(f'CREATE INDEX IF NOT EXISTS idx_leads_mandate_id ON "{schema}".leads (mandate_id)'))
                if 'mandate_name' not in columns:
                    op.add_column('leads', sa.Column('mandate_name', sa.String(length=255), nullable=True), schema=schema)
                    bind.execute(sa.text(f'CREATE INDEX IF NOT EXISTS idx_leads_mandate_name ON "{schema}".leads (mandate_name)'))
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    schemas = inspector.get_schema_names()

    for schema in schemas:
        try:
            tables = inspector.get_table_names(schema=schema)
            if 'leads' in tables:
                columns = [c['name'] for c in inspector.get_columns('leads', schema=schema)]
                if 'mandate_name' in columns:
                    op.drop_column('leads', 'mandate_name', schema=schema)
                if 'mandate_id' in columns:
                    op.drop_column('leads', 'mandate_id', schema=schema)
        except Exception:
            pass
