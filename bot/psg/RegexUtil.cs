using System.Text.RegularExpressions;

namespace psg;

internal static class RegexUtil
{
    internal static Regex HtmlTableRegex() => new(@"<table.*?>(.*?)</table>", RegexOptions.Singleline);

    internal static Regex CourseNameRegex() => new(@"'CRSE_CATALOG_DESCR.*>(.*)<");

    internal static Regex TestCodeRegex() => new(@"'IH_PT_RES_VW_CATALOG_NBR.*>(.*)<");

    internal static Regex DateOfTestRegex() => new(@"'IH_PT_RES_VW_GRADE_DT.*>(.*)<");

    internal static Regex ScoreRegex() => new(@"'IH_PT_RES_VW_CRSE_GRADE_OFF.*>(.*)<");
}