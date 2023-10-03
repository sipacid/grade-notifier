using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using psg;
using static System.DateTime;

namespace bot;

internal static class Discord
{
    internal static async Task SendToWebhook(string webhookUrl, string message,
        JsonNode gradeEmbed)
    {
        while (true)
        {
            var data = new { content = message, embeds = new[] { gradeEmbed } };

            using HttpClient client = new();
            StringContent content = new(JsonSerializer.Serialize(data), Encoding.UTF8,
                "application/json");

            HttpResponseMessage response = await client.PostAsync(webhookUrl, content);
            if (response.IsSuccessStatusCode) return;

            await Console.Error.WriteLineAsync($"Failed to send message to Discord | {response}");
            if (response.StatusCode == HttpStatusCode.TooManyRequests &&
                response.Headers.RetryAfter?.Delta?.TotalSeconds is not null)
            {
                await Console.Error.WriteLineAsync(
                    $"Rate limited, waiting {response.Headers.RetryAfter?.Delta?.TotalSeconds} seconds");
                Thread.Sleep((int)response.Headers.RetryAfter?.Delta?.TotalMilliseconds!);
                continue;
            }

            break;
        }
    }

    internal static JsonNode? GetGradeEmbed(Grade grade)
    {
        int color = grade.Sufficient() ? 65280 : 16711680;

        return JsonNode.Parse($$"""
                                
                                        {
                                            "title": "{{grade.CourseName}}",
                                            "url": "https://studentportal.inholland.nl/",
                                            "timestamp": "{{UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture)}}",
                                            "color": {{color}},
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