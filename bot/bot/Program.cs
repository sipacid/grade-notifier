using psg;

namespace bot;

public class Program
{
    private static readonly string? Email = Environment.GetEnvironmentVariable("EMAIL");
    private static readonly string? Password = Environment.GetEnvironmentVariable("PASSWORD");

    private static readonly string? WebhookUrl =
        Environment.GetEnvironmentVariable("WEBHOOK_URL");

    private static async Task Main(string[] args)
    {
        CheckEnvironmentVariables();
        Database database = new();

        while (true)
        {
            IEnumerable<Grade> newGrades = await Grades.GetGrades(Email!, Password!);
            IEnumerable<Grade> oldGrades = await database.GetGrades();

            IEnumerable<Grade> filteredGrades = FilterGrades(newGrades, oldGrades, true);
            foreach (Grade newGrade in filteredGrades)
            {
                await Discord.SendToWebhook(WebhookUrl!, "New grade!",
                    Discord.GetGradeEmbed(newGrade)!);

                await database.InsertGrade(newGrade);
            }

            Thread.Sleep(1000 * 60 * 5);
        }
    }

    private static IEnumerable<Grade> FilterGrades(IEnumerable<Grade> newGrades,
        IEnumerable<Grade> oldGrades, bool includeResits)
    {
        return newGrades.Where(newGrade =>
        {
            return !oldGrades.Any(oldGrade => includeResits
                ? oldGrade.TestCode == newGrade.TestCode &&
                  oldGrade.DateOfTest == newGrade.DateOfTest
                : oldGrade.TestCode == newGrade.TestCode);
        });
    }

    private static void CheckEnvironmentVariables()
    {
        if (Email != null && Password != null && WebhookUrl != null) return;

        Console.WriteLine(
            "Please set the EMAIL, PASSWORD and WEBHOOK_URL environment variables.");
        Environment.Exit(1);
    }
}