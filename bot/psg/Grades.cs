namespace psg;

public static class Grades
{
    /// <summary>
    ///     Gets the grades of the student with the given username and password from the student portal
    /// </summary>
    /// <param name="username">Inholland username</param>
    /// <param name="password">Inholland password</param>
    /// <returns>Enumerable list of grades</returns>
    public static async Task<IEnumerable<Grade>> GetGrades(string username, string password)
    {
        StudentPortalClient studentPortalClient = new();
        await studentPortalClient.GetCookies();
        await studentPortalClient.Login(username, password);

        string htmlTable = await studentPortalClient.GetHtmlTable();
        return GradeParser.ParseGrades(htmlTable);
    }
}