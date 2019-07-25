/**
 * @type {WebSocket}
 */
var socket = null;
var app = null;

function queue() {
	if ($("#name")[0].value != "") {
		socket.send(JSON.stringify({ "method": "queue", "name": $("#name")[0].value }));
		app.$data.created = true;
		app.$data.room = $("#name")[0].value;
	}
}

window.onload = function () {
	app = new Vue({
		el: "#app",
		data: {
			created: false,
			room: undefined,
			rooms: []
		},
		methods: {
			join(room) {
				socket.send(JSON.stringify({ "method": "join", "name": room }));
				window.location.href = "index.html";
			}
		}
	});
	$("#created").alert();
	socket = connect();
	socket.onopen = () => {
		socket.send(JSON.stringify({ "method": "getRooms" }));
	}
	socket.onmessage = (e) => {
		const data = JSON.parse(e.data);
		console.log(data);
		if (data.clientId) {
			document.cookie = data.clientId;
		}
		if (data.rooms) {
			app.$data.rooms = Object.keys(data.rooms);
		}
	}
}

