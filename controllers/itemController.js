import { response, request } from 'express';
import * as Minio from 'minio';
import dotenv from 'dotenv';
import connectDB from '../utils/connectdb.js';
dotenv.config();
/**
 * 이미지를 s3(minio)에 업로드
 * @param {request} req
 * @param {response} res
 */
export async function uploadImage(req, res) {
	const { sessionid, uuid, ext } = req.body;
	const minioClient = new Minio.Client({
		endPoint: 's3.mcnal.net',
		port: 443,
		useSSL: true,
		accessKey: process.env.MINIO_ACCESS_KEY,
		secretKey: process.env.MINIO_SECRET_KEY,
	});
	minioClient.presignedPutObject('pickmepickme', `${sessionid}/${uuid}.${ext}`, 60 * 60, (err, presignedUrl) => {
		if (err) {
			console.error(err);
		}
		res.status(200).json({ process: 'done', presignedUrl: presignedUrl });
	});
	return res;
}
/**
 * 각 팀별, 남은 아이템 리스트
 * @param {request} req
 * @param {response} res
 */

export async function getItems(req, res) {
	const db = connectDB();
	const { sessionid, team } = req.query;
	db.all(`select * from item where id = ? and team = ?`, [sessionid, team], (err, rows) => {
		if (err) {
			console.error(err);
			res.status(500).json({ process: 'error' });
		}
		res.status(200).json({ process: 'done', rows });
	});
	return res;
}
/**
 * 아이템에 팀 지정
 * @param {Number} team
 * @param {String} uuid
 */

export async function setItemTeam(team, uuid) {
	const db = connectDB();
	console.log('setItemTeam', team, uuid);
	let stmt1 = db.prepare('update item set team = ? where uuid = ?');
	stmt1.run(team, uuid, (err) => {
		if (err) {
			console.log('setItemTeam error');
			console.log(err.message);
		}
	});
	console.log(stmt1);
	stmt1.finalize();
}

/**
 * nokori 인원수 확인
 * @param {String} sessionid
 */

export async function getNokori(sessionid) {
	const db = connectDB();
	const check = await new Promise((resolve, reject) =>
		db.all(`select * from item where id = ? and team = 0`, [sessionid], (err, rows) => {
			resolve(rows.length);
		})
	);

	return check;
}
