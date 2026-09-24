## SQLite Repository Versioning

Use the built-in versioning system for all schema changes. Each SQLite repository must implement `setup` and call `this.db.setup`:

```ts
public async setup(_: AbortSignal): Promise<void> {
  await this.db.setup(1, 'example', (db, dbVersion) => {
    if (dbVersion < 1) {
      db.exec(`CREATE TABLE example (...) STRICT`);
    }
  });
}
```

The arguments are the current code version, the table name, and a callback receiving the database and the table's current version. If the table has no recorded version, `dbVersion` is `0`. Increment the code version for each schema change and guard migrations with `dbVersion < X`. Do not detect schema state through queries or `IF NOT EXISTS` clauses.
