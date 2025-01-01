import mongoose from 'mongoose';
import {DB_NAME} from '../constants.js';
import 'dotenv/config';

export const connect = async () => {
    console.log(process.env.MONGODB_URI);
    try {
        const conn = await mongoose.connect(
            `${process.env.MONGODB_URI}/${DB_NAME}`
        );
        console.log('DB HOST: ', conn.connection.host);
    } catch (error) {
        console.error('Mongo DB connection failed', error);
    }
};