using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;
using psg;
using static System.DateTime;

internal static class Discord
{
    internal static async Task<HttpResponseMessage> SendToWebhook(string webhookUrl, string message,
        JsonNode gradeEmbed)
    {
        using HttpClient client = new();
        StringContent content = new($"{{\"content\": \"{message}\"}}", Encoding.UTF8,
            "application/json");

        return await client.PostAsync(webhookUrl, content);
    }

    internal static JsonNode? GetGradeEmbed(Grade grade)
    {
        return JsonNode.Parse($$"""
                                
                                        {
                                            "title": "{{grade.CourseName}}",
                                            "url": "https://studentportal.inholland.nl/",
                                            "timestamp": "{{UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)}}",
                                            "fields": [
                                                {
                                                    "name": "Course",
                                                    "value": "{{grade.CourseName}}"
                                                },
                                                {
                                                    "name": "Test code",
                                                    "value": "{{grade.TestCode}}"
                                                },
                                                {
                                                    "name": "Date of test",
                                                    "value": "{{grade.DateOfTest}}"
                                                },
                                                {
                                                    "name": "Grade",
                                                    "value": "{{grade.Score}}"
                                                }
                                            ]
                                        }
                                """);
    }
}