import { config } from "dotenv";
import { Course } from "./interfaces";
import { launch } from "puppeteer";
import * as fs from "fs";

config();

async function sendMessageToDiscord(message: string, embed?: object) {
	var data = { content: message };

	if (embed) data["embeds"] = [embed];

	var response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});

	if (response.status != 204) console.log(`Error sending message to Discord. Status: ${response.status}`);
}

async function getCourseNamesFromTable(table: string): Promise<string[]> {
	var regex = new RegExp('\\"CRSE_CATALOG_DESCR.*\\"\\>(.*)\\<', "gm");
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
	var regex = new RegExp('\\"IH_PT_RES_VW_CATALOG_NBR.*\\"\\>(.*)\\<', "gm");
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
	var regex = new RegExp('\\"IH_PT_RES_VW_GRADE_DT.*\\"\\>(.*)\\<', "gm");
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
	var regex = new RegExp('\\"IH_PT_RES_VW_CRSE_GRADE_OFF.*\\"\\>(.*)\\<', "gm");
	var grades = [];
	let m: RegExpExecArray = undefined;

	while ((m = regex.exec(table)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		// The result can be accessed through the `m`-variable.
		m.forEach((match: string, groupIndex: any) => {
			if (groupIndex != 0 && match != "&nbsp;") grades.push(match);
		});
	}

	return grades;
}

async function getCourses(table: string): Promise<Course[]> {
	console.log("Getting courses from table...");

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
			grade: grades[i],
		});
	}

	console.log("Courses successfully retrieved from table.");

	return courses;
}

async function getTable(): Promise<string> {
	var loginUrl = "https://studentportal.inholland.nl/";
	var usernameXpath = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[2]/div[2]/input";
	var passwordXpath = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[3]/div[2]/input";
	var LogonButtonXpath = "/html/body/section[7]/div[3]/div/div[2]/div[2]/div[2]/div[1]/form/div[5]/div[1]/a";
	var StudyResultsXpath =
		"/html/body/form/div[2]/div[4]/div[2]/div/div/div/div/div[4]/section/div/div[3]/div[3]/div/div[3]/div/div[2]/div/div/div/div[3]/div[1]/div";
	var GradeResultsXPath = "/html/body/form/div[2]/div[4]/div[1]/div/div[2]/div[1]/div/div/div/div[2]/div[2]/div/div[2]/div/ul/li[4]/div[2]/div";
	var TableXpath = "/html/body/form/div[2]/div[4]/div[2]/div/div/div/div/div/div/div[1]/div/div[2]/div/div/table";

	console.log("Getting table from student portal...");

	var browser = await launch({ executablePath: process.env.CHROME_BIN, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	var page = await browser.newPage();
	await page.goto(loginUrl);

	await page.waitForXPath(usernameXpath);
	var usernameElement = await page.$x(usernameXpath);
	await usernameElement[0].type(process.env.STUDENT_USERNAME);

	await page.waitForXPath(passwordXpath);
	var passwordElement = await page.$x(passwordXpath);
	await passwordElement[0].type(process.env.STUDENT_PASSWORD);

	await page.waitForXPath(LogonButtonXpath);
	var logonButtonElement = (await page.$x(LogonButtonXpath)) as any;
	await logonButtonElement[0].click();

	await page.waitForXPath(StudyResultsXpath);
	var studyResultsElement = (await page.$x(StudyResultsXpath)) as any;
	await studyResultsElement[0].click();

	await page.waitForXPath(GradeResultsXPath);
	await new Promise((f) => setTimeout(f, 1000));
	var gradeResultsElement = (await page.$x(GradeResultsXPath)) as any;
	await gradeResultsElement[0].click();

	await page.waitForXPath(TableXpath);
	await page.$x(TableXpath);
	var table = await page.evaluate(() => document.querySelector("*").outerHTML);
	await browser.close();

	console.log("Table successfully retrieved from student portal.");

	return table;
}

async function run() {
	var table = await getTable();
	var courses = await getCourses(table);

	if (!fs.existsSync("courses.json")) {
		fs.writeFileSync("courses.json", "");
	}

	var oldCourses = fs.readFileSync("courses.json");
	if (oldCourses.length != 0) oldCourses = JSON.parse(oldCourses.toString());
	if (oldCourses.length != courses.length) {
		console.log("New grade has been added");
		var course = courses[0];
		var embed = {
			title: course.courseName,
			url: "https://studentportal.inholland.nl/",
			timestamp: new Date().toISOString(),
			fields: [
				{
					name: "Course",
					value: course.courseName,
				},
				{
					name: "Test Code",
					value: course.testCode,
				},
				{
					name: "Date",
					value: course.date,
				},
				{
					name: "Grade",
					value: course.grade,
				},
			],
		};

		await sendMessageToDiscord("<@985554048935661648>", embed);
	} else {
		console.log("No new grades have been added.");
	}

	fs.writeFileSync("courses.json", JSON.stringify(courses));
}

setInterval(run, 5 * 60 * 1000);
