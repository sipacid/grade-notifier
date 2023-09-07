using System.Net;

namespace psg;

/// <summary>
///     A client to interact with the student portal
/// </summary>
internal class StudentPortalClient
{
    private const string UserAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:57.0) Gecko/20100101 Firefox/57.0";
    private const string AcceptLanguage = "en-GB,en;q=0.5";
    private const string StudentPortalUrl = "https://studentportal.inholland.nl/";
    private const string LoginUrl = "https://auth.inholland.nl/p/u/doAuthentication.do";

    private const string GradeUrl =
        "https://studentportal.inholland.nl/psc/CS92PRD/EMPLOYEE/SA/c/IH_MAATWERK_FL.IH_SS_RES_FL.GBL?page=IH_SS_RES_LIST_FL";

    private readonly HttpClient _httpClient;

    /// <summary>
    ///     Initializes a new instance of the <see cref="StudentPortalClient" /> class.
    /// </summary>
    internal StudentPortalClient()
    {
        _httpClient = new HttpClient(new HttpClientHandler
        {
            AllowAutoRedirect = true, CookieContainer = new CookieContainer(), UseCookies = true
        });

        // Set user-agent header to avoid browscap file error
        // Set accept-language header to parse dates correctly
        _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd(UserAgent);
        _httpClient.DefaultRequestHeaders.AcceptLanguage.ParseAdd(AcceptLanguage);
    }

    /// <summary>
    ///     Gets the cookies from the student portal using the <see cref="HttpClient" />
    /// </summary>
    /// <exception cref="Exception">Failed to get student portal</exception>
    internal async Task GetCookies()
    {
        if (!(await _httpClient.GetAsync(StudentPortalUrl)).IsSuccessStatusCode)
            throw new Exception("Failed to get student portal");
    }

    /// <summary>
    ///     Logs in to the student portal using the <see cref="HttpClient" />
    /// </summary>
    /// <param name="username">Inholland username</param>
    /// <param name="password">Inholland password</param>
    /// <exception cref="Exception">Failed to login to student portal</exception>
    internal async Task Login(string username, string password)
    {
        FormUrlEncodedContent loginFormContent = new(new[]
        {
            new KeyValuePair<string, string>("login", username),
            new KeyValuePair<string, string>("passwd", password),
            new KeyValuePair<string, string>("savecredentials", "false"),
            new KeyValuePair<string, string>("nsg-x1-logon-button", "Log+On"),
            new KeyValuePair<string, string>("StateContext", "bG9naW5zY2hlbWE9ZGVmYXVsdA==")
        });

        // We're checking for "error" instead because for some FUCKING reason, the student portal returns a 200 on failed login.
        HttpResponseMessage loginResponse = await _httpClient.PostAsync(LoginUrl, loginFormContent);
        if ((await loginResponse.Content.ReadAsStringAsync()).Contains("error",
                StringComparison.InvariantCultureIgnoreCase))
            throw new Exception("Failed to login to student portal.");
    }

    internal async Task<string> GetHtmlTable()
    {
        HttpResponseMessage response = await _httpClient.GetAsync(GradeUrl);
        string responseString = await response.Content.ReadAsStringAsync();

        return RegexUtil.HtmlTableRegex().Match(responseString).Groups[1].Value;
    }
}