import { config } from 'dotenv';
import { Course } from './interfaces';
import { createCourseEmbed, sendMessageToDiscord } from './discord';
import { addCourseToDatabase, getCoursesFromDatabase } from './database';
import { getCoursesFromTable, getTable } from './peoplesoft';

config();

async function sendPrivateAnnouncement(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
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

async function sendPublicAnnouncement(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
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
    var coursesFromWebsite = getCoursesFromTable(table);

    var coursesFromDatabase: Course[] = await getCoursesFromDatabase();
    if (coursesFromDatabase.length == coursesFromWebsite.length) {
        console.log('No new grades have been added.');
        return;
    }

    console.log('Grades have been updated.');
    sendPublicAnnouncement(coursesFromWebsite, coursesFromDatabase);
    sendPrivateAnnouncement(coursesFromWebsite, coursesFromDatabase);
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
