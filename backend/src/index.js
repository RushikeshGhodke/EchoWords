import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connect } from './db/index.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in the environment variables!");
    process.exit(1);
}

app.use(express.json());
app.use(cors({
    origin: '*',
    credentials: true,
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

connect()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server running on port: ${port}`);
        });
    })
    .catch((err) => {
        console.log(`MongoDB Connection failed: ${err}`);
    });

import userRoutes from './routes/user.routes.js';
app.use("/api/v1/users", userRoutes);