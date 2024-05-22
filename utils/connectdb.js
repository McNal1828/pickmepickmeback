import sqlite3 from 'sqlite3';

export default function connectDB() {
	/**
	 * @type {sqlite3.Database}
	 */
	let db;
	if (!db) {
		const sqlite3v = sqlite3.verbose();
		db = new sqlite3v.Database('utils/db.sqlite', (err) => {
			console.log('Connect to the database.');
			if (err) {
				console.log('db error');
				console.error(err.message);
			}
		});
	}

	return db;
}
