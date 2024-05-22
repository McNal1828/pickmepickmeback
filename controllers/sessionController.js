import crypto from 'crypto';
import connectDB from '../utils/connectdb.js';

/**
 * 랜덤한 16비트 문자열을 생성합니다
 * @param {number} length 생성하려는 문자열 길이
 * @returns
 */
function generateRandomString(length) {
	const bytes = Math.ceil(length / 2);
	const randomBytes = crypto.randomBytes(bytes);
	return randomBytes.toString('hex').slice(0, length);
}

/**
 * 세션을 생성합니다
 * @param {Request} req
 * @param {Response} res
 */
export async function createSession(req, res) {
	const db = connectDB();
	let stmt = db.prepare('INSERT INTO session VALUES (?,0,0)');
	const randomString = generateRandomString(20);
	stmt.run(randomString, (err) => {
		if (err) {
			console.log('createSession error');
			console.log(err.message);
		}
	});
	stmt.finalize();
	res.status(200).json({ process: 'done', sessionid: randomString });
	return res;
}
