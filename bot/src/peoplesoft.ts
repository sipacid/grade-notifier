import { Browser, Page, PuppeteerLaunchOptions, launch } from 'puppeteer';
import { sendMessageToDiscord } from './discord';
import { Course } from './interfaces';

function filterTableWithRegex(table: string, regex: RegExp): string[] {
	const filtered: any[] = [];
	let m: RegExpExecArray | null;

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

export function getCoursesFromTable(table: string): Course[] {
	const courseNames = filterTableWithRegex(table, new RegExp('\\"CRSE_CATALOG_DESCR.*\\"\\>(.*)\\<', 'gm'));
	const testCodes = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_CATALOG_NBR.*\\"\\>(.*)\\<', 'gm'));
	const dates = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_GRADE_DT.*\\"\\>(.*)\\<', 'gm'));
	const grades = filterTableWithRegex(table, new RegExp('\\"IH_PT_RES_VW_CRSE_GRADE_OFF.*\\"\\>(.*)\\<', 'gm'));

	const courses: Course[] = [];

	for (let i = 0; i < courseNames.length; i++) {
		courses.push({
			courseName: courseNames[i],
			testCode: testCodes[i],
			date: new Date(dates[i]),
			grade: grades[i]
		});
	}

	return courses;
}

export async function getTable(): Promise<string> {
	const loginUrl = 'https://studentportal.inholland.nl/';
	const usernameSelector = '#login';
	const passwordSelector = '#passwd';
	const loginButtonSelector = '#nsg-x1-logon-button';
	const studyResultsSelector = '#win0divPTNUI_LAND_REC_GROUPLET\\$2';
	const gradeResultsSelector = '#win1divPTGP_STEP_DVW_PTGP_STEP_BTN_GB\\$3';
	const tableSelector = '#win0divIH_PT_RES_VW2\\$grid\\$0';
	let table = '';

	const launchOptions: PuppeteerLaunchOptions =
		process.argv[2] == 'production'
			? { headless: 'new', executablePath: 'google-chrome-stable', args: ['--no-sandbox', '--disable-setuid-sandbox'] }
			: { headless: false };

	let browser: Browser;
	let page: Page;

	try {
		browser = await launch(launchOptions);
		page = await browser.newPage();
		await page.goto(loginUrl);

		await page.setExtraHTTPHeaders({
			'Accept-Language': 'en-US,en;q=0.9'
		});

		await page.waitForSelector(usernameSelector);
		const usernameElement = await page.$(usernameSelector);
		if (!usernameElement) throw new Error('Username element not found!');
		await usernameElement.type(process.env.STUDENT_USERNAME!);

		await page.waitForSelector(passwordSelector);
		const passwordElement = await page.$(passwordSelector);
		if (!passwordElement) throw new Error('Password element not found');
		await passwordElement.type(process.env.STUDENT_PASSWORD!);

		await page.waitForSelector(loginButtonSelector);
		const logonButtonElement = await page.$(loginButtonSelector);
		if (!logonButtonElement) throw new Error('Logon button element not found');
		await logonButtonElement.click();

		// shit fix for #2 https://github.com/sipacid/grade-notifier/issues/2
		await page.waitForNavigation();
		await new Promise((resolve) => setTimeout(resolve, 5000));

		const hackPage = await browser.newPage();
		await hackPage.goto(page.url());
		await hackPage.close();

		await page.waitForSelector(studyResultsSelector);
		const studyResultsElement = await page.$(studyResultsSelector);
		if (!studyResultsElement) throw new Error('Study results element not found');
		await studyResultsElement.click();

		await page.waitForNavigation();

		await page.waitForSelector(gradeResultsSelector);
		await new Promise((resolve) => setTimeout(resolve, 1000)); // wait again cause js is slow, this can be fixed by waiting for an element on the toetsAanmeldingen page instead
		const gradeResultsElement = await page.$(gradeResultsSelector);
		if (!gradeResultsElement) throw new Error('Grade results element not found');
		await gradeResultsElement.click();

		await page.waitForSelector(tableSelector);
		await page.$(tableSelector);
		table = await page.evaluate(() => document.querySelector('*')!.outerHTML);
	} catch (error) {
		console.error(`Failed to retrieve table from student portal with error: \n${error}`);
		await sendMessageToDiscord(
			process.env.DISCORD_WEBHOOK_URL!,
			`Failed to retrieve table from student portal with error: \n\`\`\`${error}\`\`\``
		);
	} finally {
		await browser!.close();
	}

	return table;
}
