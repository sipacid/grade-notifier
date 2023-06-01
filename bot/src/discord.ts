import { Course } from './interfaces';

export async function sendMessageToDiscord(url: string, message: string, embed?: object): Promise<void> {
	const data: any = { content: message };

	if (embed) {
		data['embeds'] = [embed];
	}

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (response.status != 204) {
		console.error(`Error sending message to Discord. Status: ${response.status}`);
	}

	if (response.status === 429) {
		console.warn(`Ratelimited, trying again`);
		const retry = response.headers.get('x-ratelimit-reset-after') as any;
		await new Promise((resolve) => setTimeout(resolve, retry * 1000));
		await sendMessageToDiscord(url, message, embed);
	}
}

export function createCourseEmbed(course: Course) {
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
				value: course.date.toDateString()
			},
			{
				name: 'Grade',
				value: course.grade
			}
		]
	};
}
