import { config } from 'dotenv';
import { Course } from './interfaces';
import { createCourseEmbed, sendMessageToDiscord } from './discord';
import { addCourseToDatabase, getCoursesFromDatabase } from './database';
import { getCoursesFromTable, getTable } from './peoplesoft';

config();

async function sendPrivateAnnouncement(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
	const newCourses: Course[] = currentCourses.filter((course) => {
		return !oldCourses.some((oldCourse) => {
			return oldCourse.testCode === course.testCode && oldCourse.date === course.date;
		});
	});

	newCourses.forEach(async (newCourse) => {
		addCourseToDatabase(newCourse);

		const embed = createCourseEmbed(newCourse);
		await sendMessageToDiscord(
			process.env.DISCORD_WEBHOOK_URL!,
			process.env.DISCORD_USER_ID ? `<@${process.env.DISCORD_USER_ID}>` : 'A new grade has been added.',
			embed
		);
	});
}

async function sendPublicAnnouncement(currentCourses: Course[], oldCourses: Course[]): Promise<void> {
	if (!process.env.DISCORD_WEBHOOK_URL_PUBLIC) return;

	const newCourses: Course[] = currentCourses.filter((course) => {
		return !oldCourses.some((oldCourse) => {
			return oldCourse.testCode === course.testCode; // no resits
		});
	});

	newCourses.forEach(async (newCourse) => {
		await sendMessageToDiscord(process.env.DISCORD_WEBHOOK_URL_PUBLIC!, `\`${newCourse.courseName}\` cijfer staat op peoplesoft.`);
	});
}

async function checkGrades(): Promise<void> {
	const table = await getTable();
	const coursesFromWebsite = getCoursesFromTable(table);

	const coursesFromDatabase: Course[] = await getCoursesFromDatabase();
	if (coursesFromDatabase.length == coursesFromWebsite.length) {
		return;
	}

	sendPublicAnnouncement(coursesFromWebsite, coursesFromDatabase);
	sendPrivateAnnouncement(coursesFromWebsite, coursesFromDatabase);
}

async function validateEnviromentVariables() {
	if (!process.env.MONGODB_URI) {
		throw new Error('MONGODB_URI is not set.');
	}

	if (!process.env.DISCORD_WEBHOOK_URL) {
		throw new Error('DISCORD_WEBHOOK_URL is not set.');
	}

	if (!process.env.DISCORD_WEBHOOK_URL_PUBLIC) {
		console.warn('[WARN] DISCORD_WEBHOOK_URL_PUBLIC is not set.');
	}

	if (!process.env.DISCORD_USER_ID) {
		console.warn('[WARN] DISCORD_USER_ID is not set.');
	}

	if (!process.env.STUDENT_USERNAME) {
		throw new Error('STUDENT_USERNAME is not set.');
	}

	if (!process.env.STUDENT_PASSWORD) {
		throw new Error('STUDENT_PASSWORD is not set.');
	}
}

async function run(): Promise<void> {
	validateEnviromentVariables();

	try {
		await checkGrades();
	} catch (error) {
		console.log(error);
		await sendMessageToDiscord(
			process.env.DISCORD_WEBHOOK_URL!,
			`Error occured whilst checking grades on peoplesoft. \n\`\`\`${error}\`\`\``
		);
	}
}

run();
setInterval(run, 5 * 60 * 1000); // run every 5 minutes
