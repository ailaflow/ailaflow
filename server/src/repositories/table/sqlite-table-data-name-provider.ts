export class SqliteTableDataNameProvider {
  public static getName(tableName: string): string {
    return `"data_${tableName.replaceAll('"', '""')}"`;
  }
}
