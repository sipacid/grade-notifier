import { MongoClient } from 'mongodb';
import { Course } from './interfaces';

export async function getCoursesFromDatabase(): Promise<Course[]> {
    const client = new MongoClient(process.env.MONGODB_URI, {});
    const courses: Course[] = [];

    try {
        await client.connect();
        const db = client.db('grades');
        const collection = db.collection('courses');

        await collection.find<Course>({}).forEach((course) => {
            courses.push(course);
        });
    } finally {
        await client.close();
    }

    return courses;
}

export async function addCourseToDatabase(course: Course): Promise<void> {
    const client = new MongoClient(process.env.MONGODB_URI, {});

    try {
        await client.connect();
        const db = client.db('grades');
        const collection = db.collection('courses');

        await collection.insertOne(course);
    } finally {
        await client.close();
    }
}
