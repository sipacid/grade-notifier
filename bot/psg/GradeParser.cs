namespace psg;

/// <summary>
///     A parser to parse grades
/// </summary>
internal static class GradeParser
{
    /// <summary>
    ///     Parses the html table from the student portal to a list of grades
    /// </summary>
    /// <param name="htmlTable">HTML table from StudentPortalClient</param>
    /// <returns>Enumerable list of grades</returns>
    internal static IEnumerable<Grade> ParseGrades(string htmlTable)
    {
        IEnumerable<string> courseNames = RegexUtil.CourseNameRegex().Matches(htmlTable).Select(m => m.Groups[1].Value);
        IEnumerable<string> testCodes = RegexUtil.TestCodeRegex().Matches(htmlTable).Select(m => m.Groups[1].Value);
        IEnumerable<DateOnly> datesOfTest =
            RegexUtil.DateOfTestRegex().Matches(htmlTable)
                .Select(m => DateOnly.ParseExact(m.Groups[1].Value, "dd/MM/yyyy"));
        IEnumerable<string> scores = RegexUtil.ScoreRegex().Matches(htmlTable).Select(m => m.Groups[1].Value)
            .Where(m => !m.Equals("&nbsp;"));

        return courseNames.Zip(testCodes, (courseName, testCode) => (courseName, testCode))
            .Zip(datesOfTest, (tuple, dateOfTest) => (tuple.courseName, tuple.testCode, dateOfTest))
            .Zip(scores, (tuple, score) => new Grade(tuple.courseName, tuple.testCode, tuple.dateOfTest, score));
    }
}