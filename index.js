// Modules
import puppeteer from 'puppeteer';
import dotenv from '@dotenvx/dotenvx';
import express from 'express';
import { getAttendanceState, getGrades, getUser, login } from './utils.js';

// Environment variables
dotenv.config();

const app = express();

// Headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

app.get('/info', async (req, res) => {
  // decode user and password from basic auth
  const auth = req.headers.authorization;
  const [user, password] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString()
    .split(':');

  if (!user || !password) {
    res.status(401).json({ error: 'Usuário não autorizado.' });
    return;
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await login({ page, user, password }).catch((error) => {
      throw error;
    });
    const userInfo = await getUser({ page }).catch((error) => {
      throw error;
    });

    const attendanceState = await getAttendanceState({ page }).catch(
      (error) => {
        throw error;
      },
    );
    const grades = await getGrades({ page }).catch((error) => {
      throw error;
    });

    await browser.close();

    res.json({ userInfo, attendanceState, grades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
