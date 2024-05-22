import express, { Router } from 'express';
import sessionRouter from './routes/sessionRoutes.js';

const app = express();
const port = 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/session', sessionRouter);

app.listen(port, () => {
	console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
