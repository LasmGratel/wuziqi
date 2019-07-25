const fs = require('fs');
const WebSocket = require('ws');
const uuid = require('uuid/v4');

const wss = new WebSocket.Server({
    host: '0.0.0.0',
    port: 8888
});

const connections = {};
const rooms = {};
const clientPair = {};

function createData() {
    const data = {
        name: undefined,
        boardSize: 15,
        board: [],
        chats: [],
        player: 0,
        gaming: true,
        winner: 0,
        clients: []
    };
    for (let i = 0; i < data.boardSize; i++) {
        data.board.push(new Array(data.boardSize).fill(-1));
    }
    return data;
}

wss.on('listening', ws => {
    console.log("Server started");
});

wss.on('error', (ws, err) => {
    console.error("Socket " + ws + " throws an error " + err);
});

wss.on('connection', ws => {
    ws.on('message', message => {
        const data = JSON.parse(message);
        switch (data.method) {
            case 'sendData':
                Object.assign(clientPair[data.client], data.data);
                clientPair[data.client].clients.map(client => connections[client]).filter(conn => conn).forEach(conn => conn.send(JSON.stringify(clientPair[data.client])));
                break;
            case "getData":
                ws.send(JSON.stringify(clientPair[data.client]));
                connections[data.client] = ws;
                break;
            case "getRooms":
                ws.send(JSON.stringify({
                    rooms
                }));
                console.log("Client queryed rooms");
                break;
            case "join":
                if (rooms[data.name]) {
                    const clientId = uuid();
                    clientPair[clientId] = rooms[data.name];
                    rooms[data.name].name = data.name;
                    rooms[data.name].clients.push(clientId);
                    ws.send(JSON.stringify({
                        clientId,
                        player: 1
                    }));
                } else {
                    ws.send(JSON.stringify({
                        errorId: 1,
                        errorDesc: "Rooms not exist!"
                    }));
                }
                case "queue":
                    if (rooms[data.name]) {
                        ws.send(JSON.stringify({
                            errorId: 0,
                            errorDesc: "Cannot create same room again!"
                        }));
                    } else {
                        rooms[data.name] = createData();
                        const clientId = uuid();
                        ws.send(JSON.stringify({
                            clientId,
                            rooms,
                            player: 0
                        }));
                        clientPair[clientId] = rooms[data.name];
                        rooms[data.name].clients.push(clientId);
                        console.log("Created room: " + data.name);
                    }
        }
    });
});