using MongoDB.Driver;
using psg;

namespace bot;

internal class Database
{
    private readonly IMongoCollection<Grade> _grades;

    internal Database(string connectionString)
    {
        MongoClient client = new(connectionString);
        _grades = client.GetDatabase("grade-notifier").GetCollection<Grade>("grades");
    }

    internal async Task<List<Grade>> GetGrades()
    {
        return await _grades.Find(Builders<Grade>.Filter.Empty).ToListAsync();
    }

    internal async Task InsertGrade(Grade grade)
    {
        await _grades.InsertOneAsync(grade);
    }
}