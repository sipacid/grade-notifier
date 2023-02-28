import { Course } from './interfaces';

export async function sendMessageToDiscord(url: string, message: string, embed?: object): Promise<void> {
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
                value: course.date
            },
            {
                name: 'Grade',
                value: course.grade
            }
        ]
    };
}
