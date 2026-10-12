"""add mandate fields

Revision ID: xxxx
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
    # Since this is a multi-tenant app with schemas, 
    # we need to add columns to the 'leads' table in ALL schemas.
    # This usually requires a loop over existing schemas if using dynamic schemas.
    
    # Example for public schema:
    # op.add_column('leads', sa.Column('mandate_id', sa.Integer(), nullable=True))
    # op.add_column('leads', sa.Column('mandate_name', sa.String(length=255), nullable=True))
    
    # Generic SQL to add to current schema (will be run per tenant if alembic configured for multi-tenancy)
    op.add_column('leads', sa.Column('mandate_id', sa.Integer(), nullable=True))
    sa.orm.Session(bind=op.get_bind()).execute(sa.text("CREATE INDEX IF NOT EXISTS idx_leads_mandate_id ON leads (mandate_id)"))
    
    op.add_column('leads', sa.Column('mandate_name', sa.String(length=255), nullable=True))
    sa.orm.Session(bind=op.get_bind()).execute(sa.text("CREATE INDEX IF NOT EXISTS idx_leads_mandate_name ON leads (mandate_name)"))


def downgrade():
    op.drop_column('leads', 'mandate_id')
    op.drop_column('leads', 'mandate_name')
