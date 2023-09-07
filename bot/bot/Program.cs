using psg;

public class Program
{
    private static readonly string? Email = Environment.GetEnvironmentVariable("EMAIL");
    private static readonly string? Password = Environment.GetEnvironmentVariable("PASSWORD");

    private static readonly string? PrivateWebhookUrl =
        Environment.GetEnvironmentVariable("PRIVATE_WEBHOOK_URL");

    private static readonly string? PublicWebhookUrl =
        Environment.GetEnvironmentVariable("PUBLIC_WEBHOOK_URL");

    private static async Task Main(string[] args)
    {
        CheckEnvironmentVariables();

        while (true)
        {
            IEnumerable<Grade> newGrades = await Grades.GetGrades(Email!, Password!);
            IEnumerable<Grade> oldGrades = new List<Grade>();

            IEnumerable<Grade> filteredGrades = FilterGrades(newGrades, oldGrades, true);

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
        if (Email == null || Password == null || PrivateWebhookUrl == null)
        {
            Console.WriteLine(
                "Please set the EMAIL, PASSWORD and PRIVATE_WEBHOOK_URL environment variables.");
            return;
        }

        if (PublicWebhookUrl == null)
        {
            Console.WriteLine("PUBLIC_WEBHOOK_URL environment variable not set, ignoring.");
        }
    }
}