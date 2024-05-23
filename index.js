import express, { Router } from 'express';
import sessionRouter from './routes/sessionRoutes.js';
import itemRouter from './routes/itemRoutes.js';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { CloudFunctionConfig } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { getNokori, setItemTeam } from './controllers/itemController.js';

const app = express();
const port = 4101;
const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
const wss = new WebSocketServer({ noServer: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/session', sessionRouter);
app.use('/api/item', itemRouter);

server.listen(port, () => {
	console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

server.on('upgrade', (req, socket, head) => {
	if (req.url === '/api/ws') {
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	} else {
		socket.destroy();
	}
});
const rooms = {};
const roomsrsps = {};
const roomsrspp = {};
wss.on('connection', (ws, req) => {
	console.log('WebSocket connected');
	const uuid_ = uuidv4();
	ws.uuid = uuid_;
	ws.on('message', (message) => {
		const { type, room, content, team, state } = JSON.parse(message);
		if (type === 'join') {
			console.log('join');
			if (!rooms[room]) {
				rooms[room] = new Set();
			}
			rooms[room].add(ws);
			console.log(room, '에', rooms[room].size, '명 접속 중');
			ws.room = room;

			ws.send(JSON.stringify({ type }));
		}
		if (type === 'message') {
			console.log('message');
			if (ws.room && rooms[ws.room]) {
				rooms[ws.room].forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify({ type, content }));
					}
				});
			}
		}
		if (type === 'pick') {
			console.log('pick');
			if (ws.room && rooms[ws.room]) {
				rooms[ws.room].forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify({ type }));
					}
				});
			}
		}
		if (type === 'leader') {
			if (!roomsrsps[room]) {
				roomsrsps[room] = [];
			}
			if (!roomsrspp[room]) {
				roomsrspp[room] = [];
			}
			ws.leader = 'team' + team;
			ws.send(JSON.stringify({ type }));
		}
		if (type === 'rsp') {
			console.log('rsp');
			ws.rsp = content;
			roomsrsps[room].push(ws);
			console.log(ws.leader, '가', content, '제출');
			console.log('수신인원수 :', roomsrsps[room].length);
			if (roomsrsps[room].length == 2) {
				const team1rsp = roomsrsps[room].filter((ws) => ws.leader === 'team1')[0].rsp;
				const team2rsp = roomsrsps[room].filter((ws) => ws.leader === 'team2')[0].rsp;
				if (team1rsp === team2rsp) {
					console.log('비김');
					rooms[room].forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(
								JSON.stringify({
									type: 'message',
									content: `1팀이 ${team1rsp}, 2팀이 ${team2rsp}를 내서 비겼습니다. 다시 가위바위보를 진행합니다`,
								})
							);
						}
					});
					setTimeout(() => {
						roomsrsps[room].forEach((client) => {
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify({ type: 'state', content: 'rspwaiting' }));
							}
						});
						roomsrsps[room] = [];
					}, 1000);
				} else if (
					(team1rsp === 'rock' && team2rsp === 'scissors') ||
					(team1rsp === 'paper' && team2rsp === 'rock') ||
					(team1rsp === 'scissors' && team2rsp === 'paper')
				) {
					console.log('team1 승리');
					rooms[room].forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify({ type: 'message', content: `1팀이 ${team1rsp}, 2팀이 ${team2rsp}를 내서 1팀이 이겼습니다` }));
						}
					});
					roomsrsps[room].filter((ws) => ws.leader === 'team1')[0].send(JSON.stringify({ type, content: 'win' }));
					roomsrsps[room].filter((ws) => ws.leader === 'team2')[0].send(JSON.stringify({ type, content: 'loose' }));
					roomsrspp[room].push(roomsrsps[room].filter((ws) => ws.leader === 'team1')[0]);
					roomsrspp[room].push(roomsrsps[room].filter((ws) => ws.leader === 'team2')[0]);
					roomsrspp[room][0].send(JSON.stringify({ type: 'state', content: 'myturn' }));
					roomsrspp[room][1].send(JSON.stringify({ type: 'state', content: 'opturn' }));
				} else {
					console.log('team2 승리');
					rooms[room].forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify({ type: 'message', content: `1팀이 ${team1rsp}, 2팀이 ${team2rsp}를 내서 2팀이 이겼습니다` }));
						}
					});
					roomsrsps[room].filter((ws) => ws.leader === 'team1')[0].send(JSON.stringify({ type, content: 'loose' }));
					roomsrsps[room].filter((ws) => ws.leader === 'team2')[0].send(JSON.stringify({ type, content: 'win' }));
					roomsrspp[room].push(roomsrsps[room].filter((ws) => ws.leader === 'team2')[0]);
					roomsrspp[room].push(roomsrsps[room].filter((ws) => ws.leader === 'team1')[0]);
					roomsrspp[room][0].send(JSON.stringify({ type: 'state', content: 'myturn' }));
					roomsrspp[room][1].send(JSON.stringify({ type: 'state', content: 'opturn' }));
				}
			}
			if (roomsrspp[room].length != 2) {
				ws.send(JSON.stringify({ type: 'state', content: 'oprspwaiting' }));
			}
		}
		if (type === 'state') {
			if (roomsrsps[room].filter((ws) => ws.leader === team).length == 0) {
				ws.send(JSON.stringify({ type, content: 'rspwaiting' }));
			} else if (roomsrsps[room].filter((ws) => ws.leader === team).length != 0 && roomsrsps[room].length != 2) {
				ws.send(JSON.stringify({ type, content: 'oprspwaiting' }));
			} else if (roomsrsps[room].length != 0) {
				if (roomsrspp[room][0] == ws) {
					ws.send(JSON.stringify({ type, content: 'myturn' }));
				}
				if (roomsrspp[room][0] != ws) {
					ws.send(JSON.stringify({ type, content: 'opturn' }));
				}
			}
		}
		if (type === 'turn') {
			console.log('turn');
			setItemTeam(team, content);
			ws.send(JSON.stringify({ type: 'state', content: 'opturn' }));
			rooms[room].forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify({ type: 'refresh' }));
				}
			});
			setTimeout(async () => {
				roomsrspp[room].shift();
				console.log('남은 인원 수 :', roomsrspp[room].length);
				const leftnokori = await getNokori(room);
				console.log('남은 nokori :', leftnokori);
				if (roomsrspp[room].length != 0) {
					roomsrspp[room][0].send(JSON.stringify({ type: 'state', content: 'myturn' }));
				}
				if (roomsrspp[room].length == 0) {
					if (leftnokori == 0) {
						roomsrsps[room].forEach((client) => {
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify({ type: 'state', content: 'done' }));
								client.send(JSON.stringify({ type: 'message', content: '뽑기 완료' }));
							}
						});
					} else {
						roomsrsps[room].forEach((client) => {
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify({ type: 'state', content: 'rspwaiting' }));
							}
						});
						roomsrsps[room] = [];
					}
				}
			}, 1000);
		}
	});

	ws.on('close', () => {
		for (let soc of rooms[ws.room]) {
			if (soc.uuid === ws.uuid) {
				rooms[ws.room].delete(soc);
				break;
			}
		}
		console.log('WebSocket disconnected', ws.uuid);
	});
});

// wss.on('connection', (ws, req) => {
// 	ws.on('message', (message) => {
// 		console.log(message);
// 	});
// 	ws.on('close', () => {
// 		console.log('ws close');
// 	});
// 	console.log(wss.clients);
// });
