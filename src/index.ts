import { config } from 'dotenv';
import { Course } from './interfaces';
import { launch } from 'puppeteer';
import { existsSync, writeFileSync, readFileSync } from 'fs';

config();

async function sendMessageToDiscord(message: string, embed?: object): Promise<void> {
    var data = { content: message };

    if (embed) data['embeds'] = [embed];

    var response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (response.status != 204) {
        console.log(`Error sending message to Discord. Status: ${response.status} \n Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await sendMessageToDiscord(message, embed);
    } else {
        console.log('Message sent to Discord.');
    }
}

async function getCourseNamesFromTable(table: string): Promise<string[]> {
    var regex = new RegExp('\\"CRSE_CATALOG_DESCR.*\\"\\>(.*)\\<', 'gm');
    var courseNames = [];
    let m: RegExpExecArray = undefined;

    while ((m = regex.exec(table)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match: any, groupIndex: any) => {
            if (groupIndex != 0) courseNames.push(match);
        });
    }

    return courseNames;
}

async function getTestCodesFromTable(table: string): Promise<string[]> {
    var regex = new RegExp('\\"IH_PT_RES_VW_CATALOG_NBR.*\\"\\>(.*)\\<', 'gm');
    var testCodes = [];
    let m: RegExpExecArray = undefined;

    while ((m = regex.exec(table)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match: any, groupIndex: any) => {
            if (groupIndex != 0) testCodes.push(match);
        });
    }

    return testCodes;
}

async function getDatesFromTable(table: string): Promise<string[]> {
    var regex = new RegExp('\\"IH_PT_RES_VW_GRADE_DT.*\\"\\>(.*)\\<', 'gm');
    var dates = [];
    let m: RegExpExecArray = undefined;

    while ((m = regex.exec(table)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match: any, groupIndex: any) => {
            if (groupIndex != 0) dates.push(match);
        });
    }

    return dates;
}

async function getGradesFromTable(table: string): Promise<string[]> {
    var regex = new RegExp('\\"IH_PT_RES_VW_CRSE_GRADE_OFF.*\\"\\>(.*)\\<', 'gm');
    var grades = [];
    let m: RegExpExecArray = undefined;

    while ((m = regex.exec(table)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match: string, groupIndex: any) => {
            if (groupIndex != 0 && match != '&nbsp;') grades.push(match);
        });
    }

    return grades;
}

async function getCourses(table: string): Promise<Course[]> {
    console.log('Retrieving courses from table...');

    var courseNames = await getCourseNamesFromTable(table);
    var testCodes = await getTestCodesFromTable(table);
    var dates = await getDatesFromTable(table);
    var grades = await getGradesFromTable(table);

    var courses: Course[] = [];

    for (var i = 0; i < courseNames.length; i++) {
        courses.push({
            courseName: courseNames[i],
            testCode: testCodes[i],
            date: dates[i],
            grade: grades[i]
        });
    }

    console.log('Courses successfully retrieved from table.');

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

    var browser = await launch({
        executablePath: process.env.CHROME_BIN,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
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
    await new Promise((f) => setTimeout(f, 1000)); // wait cuz js is retarded
    var gradeResultsElement = await page.$(gradeResultsSelector);
    await gradeResultsElement.click();

    await page.waitForSelector(tableSelector);
    await page.$(tableSelector);
    var table = await page.evaluate(() => document.querySelector('*').outerHTML);
    await browser.close();

    console.log('Table successfully retrieved from student portal.');

    return table;
}

async function main(): Promise<void> {
    var table = await getTable();
    var courses = await getCourses(table);
    console.log(courses);

    if (!existsSync('courses.json')) writeFileSync('courses.json', '[]');

    var oldCourses: Course[] = JSON.parse(readFileSync('courses.json').toString());
    if (oldCourses.length != courses.length) {
        console.log('Grades have been updated.');

        var newCourses: Course[] = courses.filter((course) => {
            return !oldCourses.some((oldCourse) => {
                return oldCourse.testCode == course.testCode && oldCourse.date == course.date;
            });
        });

        newCourses.forEach(async (newCourse) => {
            var embed = {
                title: newCourse.courseName,
                url: 'https://studentportal.inholland.nl/',
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: 'Course',
                        value: newCourse.courseName
                    },
                    {
                        name: 'Test Code',
                        value: newCourse.testCode
                    },
                    {
                        name: 'Date of test',
                        value: newCourse.date
                    },
                    {
                        name: 'Grade',
                        value: newCourse.grade
                    }
                ]
            };

            await sendMessageToDiscord('<@985554048935661648>', embed);
        });
    } else {
        console.log('No new grades have been added.');
    }

    writeFileSync('courses.json', JSON.stringify(courses));
}

async function run(): Promise<void> {
    try {
        await main();
    } catch (error) {
        console.log(error);
        await sendMessageToDiscord(`Oops something went wrong! :( \n\`\`\`${error}\`\`\``);
    }
}

run();
setInterval(run, 5 * 60 * 1000);
