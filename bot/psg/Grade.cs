namespace psg;

/// <summary>
///     A grade of a student
/// </summary>
public class Grade
{
    public Grade(string courseName, string testCode, DateOnly dateOfTest, string score)
    {
        CourseName = courseName;
        TestCode = testCode;
        DateOfTest = dateOfTest;
        Score = score;
    }

    public string CourseName { get; }
    public string TestCode { get; }
    public DateOnly DateOfTest { get; }
    public string Score { get; }

    public bool Sufficient()
    {
        bool number = double.TryParse(Score, out double score);
        if (number) return score >= 55;

        return Score.Equals("V");
    }
}