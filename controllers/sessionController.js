import crypto from 'crypto';
import connectDB from '../utils/connectdb.js';
import { response, request } from 'express';

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
 * @param {request} req
 * @param {response} res
 */
export async function createSession(req, res) {
	const db = connectDB();
	let stmt = db.prepare('INSERT INTO session VALUES (?,0,0,0)');
	const randomString = generateRandomString(20);
	stmt.run(randomString, (err) => {
		if (err) {
			console.log('createSession error');
			console.log(err.message);
		}
	});
	stmt.finalize();
	res.cookie('session_id', randomString, { maxAge: 7 * 24 * 60 * 60 * 1000 });
	res.status(201).json({ process: 'done', sessionid: randomString });
	return res;
}

/**
 * DB에서 세션의 존재유무를 확인합니다
 * @param {request} req
 * @param {response} res
 */
export async function getSession(req, res) {
	const db = connectDB();
	const { sessionid } = req.query;
	// const response_ = await new Promise((resolve, reject) =>
	// 	db.get(`select * from session where id = ?`, [sessionid], (err, row) => {
	// 		if (!!!row) {
	// 			console.log('ddd');
	// 			response = NextResponse.json({ process: 'not proper sesionid' }, { status: 404 });
	// 		}
	// 		if (!!row) {
	// 			response = NextResponse.json({ process: 'done' }, { status: 201 });
	// 			response.cookies.set('session_id', sessionid);
	// 		}
	// 		resolve('성공');
	// 	})
	// );
	db.get(`select * from session where id = ?`, [sessionid], (err, row) => {
		console.log(row);
		if (!!!row) {
			res.status(404).json({ process: 'does not exist' });
		}
		if (!!row) {
			res.cookie('session_id', sessionid, { maxAge: 7 * 24 * 60 * 60 * 1000 });
			res.status(200).json({ process: 'exists' });
		}
	});
	return res;
}

/**
 * 세션의 팀구성을 초기화합니다.
 * @param {request} req
 * @param {response} res
 */
export async function resetSessionTeam(req, res) {
	const db = connectDB();
	const { sessionid } = req.body;
	let stmt1 = db.prepare('update session set done = 0 where id = ?');
	stmt1.run(sessionid, (err) => {
		if (err) {
			console.log('resetSessionTeam error');
			console.log(err.message);
		}
	});
	stmt1.finalize();
	let stmt2 = db.prepare('update item set team = 0 where id = ?');
	stmt2.run(sessionid, (err) => {
		if (err) {
			console.log('resetSessionTeam error');
			console.log(err.message);
		}
	});
	stmt2.finalize();
	res.status(201).json({ process: 'done' });
	return res;
}
/**
 * 세션을 저장합니다.
 * @param {request} req
 * @param {response} res
 */
export async function saveSession(req, res) {
	const db = connectDB();

	/**
	 * @typedef {Object} bodyData
	 * @property {String} sessionid
	 * @property {[{id:String, name:String, introduce:String, detail:Array, picture_url:String, uuid:String, team:Number}]} data
	 */

	/**
	 * @type {bodyData}
	 */
	const { sessionid, data } = req.body;
	let stmt1 = db.prepare('insert into item values(?, ?, ?, ?, ?, ?, ?, 0)');
	data.forEach((obj, index) => {
		const detail_array = JSON.stringify(obj.detail);
		// console.log(detail_array);
		stmt1.run(sessionid, index, obj.name, obj.picture_url, obj.introduce, detail_array, obj.uuid, (err) => {
			if (err) {
				console.log('saveSession error');
				console.log(err.message);
			}
		});
	});
	stmt1.finalize();
	res.status(201).json({ process: 'done' });
	return res;
}
