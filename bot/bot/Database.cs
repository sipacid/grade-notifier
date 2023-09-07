internal class Database
{
    private static string _connectionString;

    internal Database(string connectionString)
    {
        _connectionString = connectionString;
    }
}