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
}