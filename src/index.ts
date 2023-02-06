import { config } from 'dotenv';
import { Course } from './interfaces';
import { Browser, launch } from 'puppeteer';
import { existsSync, writeFileSync, readFileSync } from 'fs';

config();

async function sendMessageToDiscord(url: string, message: string, embed?: object): Promise<void> {
    var data = { content: message };

    if (embed) data['embeds'] = [embed];

    var response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (response.status != 204) {
        console.log(`Error sending message to Discord. Status: ${response.status} \n Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await sendMessageToDiscord(url, message, embed);
    } else {
        console.log('Message sent to Discord.');
    }
}

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

function getCourses(table: string): Course[] {
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
    process.env.CHROME_BIN ? (browser = await launch({ executablePath: process.env.CHROME_BIN, args: ['--no-sandbox', '--disable-setuid-sandbox'] })) : (browser = await launch());
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

function createCourseEmbed(course: Course) {
    return {
        title: course.courseName,
        url: 'https://studentportal.inholland.nl/',
        timestamp: new Date().toISOString(),
        fields: [
            {
                name: 'Course',
                value: course.courseName
            },
            {
                name: 'Test Code',
                value: course.testCode
            },
            {
                name: 'Date of test',
                value: course.date
            },
            {
                name: 'Grade',
                value: course.grade
            }
        ]
    };
}

async function main(): Promise<void> {
    var table = await getTable();
    var currentCourses = getCourses(table);

    if (!existsSync('courses.json')) writeFileSync('courses.json', '[]');

    var oldCourses: Course[] = JSON.parse(readFileSync('courses.json').toString());
    if (oldCourses.length != currentCourses.length) {
        console.log('Grades have been updated.');
        publicPush(currentCourses, oldCourses);

        var newCourses: Course[] = currentCourses.filter((course) => {
            return !oldCourses.some((oldCourse) => {
                return oldCourse.testCode == course.testCode && oldCourse.date == course.date;
            });
        });

        newCourses.forEach(async (newCourse) => {
            var embed = createCourseEmbed(newCourse);
            await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL, '<@985554048935661648>', embed);
        });
    } else {
        console.log('No new grades have been added.');
    }

    writeFileSync('courses.json', JSON.stringify(currentCourses));
}

async function publicPush(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
    var newCourses: Course[] = currentCourses.filter((course) => {
        return !oldCourses.some((oldCourse) => {
            return oldCourse.testCode == course.testCode; // no resits
        });
    });

    newCourses.forEach(async (newCourse) => {
        await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL_PUBLIC, `${newCourse.courseName} cijfer staat op peoplesoft.`);
    });
}

async function run(): Promise<void> {
    try {
        await main();
    } catch (error) {
        console.log(error);
        await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL, `Oops something went wrong! :( \n\`\`\`${error}\`\`\``);
    }
}

run();
setInterval(run, 5 * 60 * 1000); // run every 5 minutes
