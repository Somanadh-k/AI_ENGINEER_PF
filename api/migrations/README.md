# SOMANADH.OS — Initial PostgreSQL migration

`001_initial.sql` is the baseline schema for a new PostgreSQL database. It was
generated from the SQLAlchemy models in `api/app/models.py`.

## Development

Local development uses SQLite and `Base.metadata.create_all()` on API startup.
That is convenient for a fresh local database, but it is not a migration
system: it creates missing tables and never alters existing ones.

## Production

Apply the baseline once, before starting the API against an empty database:

```bash
psql "$ADMIN_DATABASE_URL" -f migrations/001_initial.sql
```

`ADMIN_DATABASE_URL` must be a plain PostgreSQL URL, for example:

```text
postgresql://user:password@host:5432/somanadh
```

The application uses the SQLAlchemy driver form:

```text
postgresql+psycopg://user:password@host:5432/somanadh
```

Do not apply the baseline to a database that already contains these tables.

## Future changes

Add numbered, forward-only migrations (`002_...sql`, `003_...sql`) and apply
them in order. The API still calls `create_all()` on startup for local
convenience; production releases should apply migrations explicitly and treat
that startup call as a no-op.
