import { config } from 'dotenv';
import { Course } from './interfaces';
import { Browser, launch } from 'puppeteer';
import { createCourseEmbed, sendMessageToDiscord } from './discord';
import { addCourseToDatabase, getCoursesFromDatabase } from './database';

config();

function filterTableWithRegex(table: string, regex: RegExp): string[] {
    var filtered = [];
    let m: RegExpExecArray = undefined;

    while ((m = regex.exec(table)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match: string, groupIndex: any) => {
            if (groupIndex != 0 && match != '&nbsp;') filtered.push(match);
        });
    }

    return filtered;
}

function getCoursesFromTable(table: string): Course[] {
    console.log('Retrieving courses from table...');

    var courseNames = filterTableWithRegex(table, new RegExp('\\"CRSE_CATALOG_DESCR.*\\"\\>(.*)\\<', 'gm'));
    var testCodes = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_CATALOG_NBR.*\\"\\>(.*)\\<', 'gm'));
    var dates = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_GRADE_DT.*\\"\\>(.*)\\<', 'gm'));
    var grades = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_CRSE_GRADE_OFF.*\\"\\>(.*)\\<', 'gm'));

    var courses: Course[] = [];

    for (var i = 0; i < courseNames.length; i++) {
        courses.push({
            courseName: courseNames[i],
            testCode: testCodes[i],
            date: dates[i],
            grade: grades[i]
        });
    }

    console.log(`Successfully retrieved ${courses.length} courses from table.`);

    return courses;
}

async function getTable(): Promise<string> {
    var loginUrl = 'https://studentportal.inholland.nl/';
    var usernameSelector = '#login';
    var passwordSelector = '#passwd';
    var loginButtonSelector = '#nsg-x1-logon-button';
    var studyResultsSelector = '#win0divPTNUI_LAND_REC_GROUPLET\\$2';
    var gradeResultsSelector = '#win1divPTGP_STEP_DVW_PTGP_STEP_BTN_GB\\$3';
    var tableSelector = '#win0divIH_PT_RES_VW2\\$grid\\$0';

    console.log('Retrieving table from student portal...');

    var browser: Browser;
    process.env.USR_BIN_CHROME
        ? (browser = await launch({ executablePath: process.env.USR_BIN_CHROME, args: ['--no-sandbox', '--disable-setuid-sandbox'] }))
        : (browser = await launch());
    var page = await browser.newPage();
    await page.goto(loginUrl);

    await page.waitForSelector(usernameSelector);
    var usernameElement = await page.$(usernameSelector);
    await usernameElement.type(process.env.STUDENT_USERNAME);

    await page.waitForSelector(passwordSelector);
    var passwordElement = await page.$(passwordSelector);
    await passwordElement.type(process.env.STUDENT_PASSWORD);

    await page.waitForSelector(loginButtonSelector);
    var logonButtonElement = await page.$(loginButtonSelector);
    await logonButtonElement.click();

    await page.waitForSelector(studyResultsSelector);
    var studyResultsElement = await page.$(studyResultsSelector);
    await studyResultsElement.click();

    await page.waitForSelector(gradeResultsSelector);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // wait again cause js is slow, this can be fixed by waiting for an element on the toetsAanmeldingen page instead
    var gradeResultsElement = await page.$(gradeResultsSelector);
    await gradeResultsElement.click();

    await page.waitForSelector(tableSelector);
    await page.$(tableSelector);
    var table = await page.evaluate(() => document.querySelector('*').outerHTML);
    await browser.close();

    console.log('Successfully retrieved table from student portal.');

    return table;
}

async function privatePush(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
    var newCourses: Course[] = currentCourses.filter((course) => {
        return !oldCourses.some((oldCourse) => {
            return oldCourse.testCode == course.testCode && oldCourse.date == course.date;
        });
    });

    newCourses.forEach(async (newCourse) => {
        addCourseToDatabase(newCourse);

        var embed = createCourseEmbed(newCourse);
        await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL, `<@${process.env.DISCORD_USER_ID}>`, embed);
    });
}

async function publicPush(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
    if (!process.env.DISCORD_WEBHOOK_URL_PUBLIC) return;

    var newCourses: Course[] = currentCourses.filter((course) => {
        return !oldCourses.some((oldCourse) => {
            return oldCourse.testCode == course.testCode; // no resits
        });
    });

    newCourses.forEach(async (newCourse) => {
        await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL_PUBLIC, `\`${newCourse.courseName}\` cijfer staat op peoplesoft.`);
    });
}

async function main(): Promise<void> {
    var table = await getTable();
    var currentCourses = getCoursesFromTable(table);

    var oldCourses: Course[] = await getCoursesFromDatabase();
    if (oldCourses.length == currentCourses.length) {
        console.log('No new grades have been added.');
        return;
    }

    console.log('Grades have been updated.');
    publicPush(currentCourses, oldCourses);
    privatePush(currentCourses, oldCourses);
}

async function run(): Promise<void> {
    try {
        await main();
    } catch (error) {
        console.log(error);
        await sendMessageToDiscord(
            process.env.DISCORD_WEBHOOK_URL,
            `OOPSIE WOOPSIE!! Uwu We made a fucky wucky!! A wittle fucko boingo! The code monkeys at our headquarters are working VEWY HAWD to fix this! \n\`\`\`${error}\`\`\``
        );
    }
}

run();
setInterval(run, 5 * 60 * 1000); // run every 5 minutes
