using Microsoft.Data.Sqlite;
using psg;

namespace bot;

internal class Database
{
    private readonly SqliteConnection _connection;

    internal Database()
    {
        _connection = new SqliteConnection("Data Source=/database/grade-notifier.db");
        _connection.Open();

        using var command = new SqliteCommand(
            """
            CREATE TABLE IF NOT EXISTS grades (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            course_name TEXT NOT NULL,
                            test_code TEXT NOT NULL,
                            date_of_test TEXT NOT NULL,
                            score TEXT NOT NULL
            );
            """,
            _connection);

        command.ExecuteNonQuery();
    }

    internal async Task<List<Grade>> GetGrades()
    {
        var grades = new List<Grade>();
        var command = new SqliteCommand("SELECT * FROM grades", _connection);
        var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var grade = new Grade(
                reader.GetString(1),
                reader.GetString(2),
                DateOnly.Parse(reader.GetString(3)),
                reader.GetString(4));

            grades.Add(grade);
        }

        return grades;
    }

    internal async Task InsertGrade(Grade grade)
    {
        var command =
            new SqliteCommand(
                "INSERT INTO grades (course_name, test_code, date_of_test, score) VALUES (@course_name, @test_code, @date_of_test, @score)",
                _connection);
        command.Parameters.AddWithValue("@course_name", grade.CourseName);
        command.Parameters.AddWithValue("@test_code", grade.TestCode);
        command.Parameters.AddWithValue("@date_of_test", grade.DateOfTest.ToString());
        command.Parameters.AddWithValue("@score", grade.Score);

        await command.ExecuteNonQueryAsync();
    }
}