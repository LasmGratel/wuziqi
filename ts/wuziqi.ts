let size = 15;
const cellSize = 40;
var board = [];

let ctx = null;
var player = 0;
let gaming = true;
let re = 3;

var data: any = {};
let socket = null;

/**
 * @param func function(x, y, player)
 */
function eachBoard(func) {
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			func(i, j, board[i][j]);
		}
	}
}

function sendMsg() {
	if (document.getElementById("message").value != "") {
		app.$data.chats.push(document.getElementById("message").value);
		sync();
	}
}

function drawLine(beginX, beginY, endX, endY) {
	ctx.moveTo(beginX, beginY);
	ctx.lineTo(endX, endY);
	ctx.stroke();
}

function drawBoard() {
	ctx.clearRect(0, 0, size * cellSize + 100, size * cellSize + 100);
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
			if (board[i][j] != -1) {
				ctx.beginPath();
				ctx.arc(i * cellSize + cellSize / 2, j * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
				if (board[i][j] == 1)
					ctx.stroke();
				else
					ctx.fill();
			}
		}
	}
}

function depth(x, y, dist, player, s) {
	if (x < 0 || x >= size || y < 0 || y >= size || board[x][y] != player)
		return s;
	s += 1;
	return depth(x + dist[0], y + dist[1], dist, player, s);
}

function checkBoard(x, y, player) {
	if (depth(x, y, [-1, -1], player, 0) + depth(x, y, [1, 1], player, 0) - 1 == 5)
		return true;
	if (depth(x, y, [-1, 0], player, 0) + depth(x, y, [1, 0], player, 0) - 1 == 5)
		return true;
	if (depth(x, y, [0, 1], player, 0) + depth(x, y, [0, -1], player, 0) - 1 == 5)
		return true;
	if (depth(x, y, [-1, 1], player, 0) + depth(x, y, [1, -1], player, 0) - 1 == 5)
		return true;
	return false;
}

function playerStr(p) {
	return p == 0 ? "黑棋" : "白棋";
}

function offset(e) {
	if (e == undefined)
		return [0,0];
	let arr = [e.offsetLeft,e.offsetTop];
	if (e.parentElement != undefined) {
		let p = offset(e.parentElement);
		arr[0] += p[0];
		arr[1] += p[1];
	}
	return arr;
}

function sync() {
	data.board = board;
	data.player = player;
	data.gaming = gaming;
	data.chats = app.$data.chats;
	socket.send(JSON.stringify({"method": "senddata", data}));
}

var app = null;

window.onload = () => {
	app = new Vue({
		el: "#app",
		data: {
			chats: []
		}
	});
	socket = connect();
	socket.onmessage = (e) => {
		data = JSON.parse(e.data);
		console.log(data);
		board = data.board;
		player = data.player;
		gaming = data.gaming;
		app.$data.chats = data.chats;
		
		document.getElementById("inf").innerHTML = playerStr(player) + "走";
		drawBoard();
		if (!data.gaming) {
			document.getElementById("inf").innerHTML = playerStr(data.winner) + "赢";
		}
	};
	socket.onopen = (e) => {
		socket.send(JSON.stringify({"method": "getdata"}));
	};
	const canvas = document.getElementById("c");
	canvas.height = size * cellSize;
	canvas.width = size * cellSize;
	ctx = canvas.getContext("2d");
	document.getElementById("app").appendChild(canvas);
	/**
	 * @param {MouseEvent} e 
	 */
	canvas.onmousemove = (e) => {
		
		drawBoard();
		if (!gaming) return;
		const off = canvas.getBoundingClientRect();
		
		let x = Math.ceil((e.clientX - off.left) / cellSize) - 1;
		let y = Math.ceil((e.clientY - off.top) / cellSize) - 1;
		if (board[x][y] != -1)
			return;
		ctx.clearRect(x * cellSize + cellSize / 16, y * cellSize + cellSize / 16, cellSize - cellSize / 8, cellSize - cellSize / 8);
		ctx.beginPath();
		ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, cellSize / 4, 0, 2 * Math.PI);
		if (player == 1)
			ctx.stroke();
		else
			ctx.fill();
		
	}
	canvas.onclick = (e) => {
		if (!gaming) return;
		const off = canvas.getBoundingClientRect();
		
		let x = Math.ceil((e.clientX - off.left) / cellSize) - 1;
		let y = Math.ceil((e.clientY - off.top) / cellSize) - 1;
		
		if (board[x][y] == -1) {
			board[x][y] = player;
			if (checkBoard(x, y, player)) {
				document.getElementById("inf").innerHTML = playerStr(player) + "赢";
				gaming = false;
				data.winner = player;
			} else {
				player = !player + 0;
				document.getElementById("inf").innerHTML = playerStr(player) + "走";
			}
			drawBoard();
		}
		sync();
	}
	drawBoard();
}