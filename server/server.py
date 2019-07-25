from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import socket
import threading
import sys
import base64
import hashlib
import struct

ts = []
roomPair = {}
rooms = {}
host=('', 8888)

def newRoom():
    return [None,None]
def handshake(conn):
    key = None
    data = conn.recv(8192)
    if not len(data):
        return False
    data = str(data)

    for line in data.split('\\r\\n\\r\\n')[0].split('\\r\\n')[1:]:
        k, v = line.split(': ')
        if k == 'Sec-WebSocket-Key':
            key = base64.b64encode(hashlib.sha1((v+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest())
            if not key:
                conn.close()
                return False
            response = 'HTTP/1.1 101 Switching Protocols\r\n' \
                       'Upgrade: websocket\r\n' \
                       'Connection: Upgrade\r\n' \
                       'Sec-WebSocket-Accept:' + key.decode('utf-8') + '\r\n\r\n'
            conn.send(response.encode('utf-8'))
            return True

def senddata(self, d):
    if "data" in d:
        self.data['chats'] = d["data"]["chats"]
        self.data['player'] = d["data"]["player"]
        self.data['board'] = d["data"]["board"]
        self.data['winner'] = d["data"]["winner"]
        self.data['gaming'] = d["data"]["gaming"]

def getData(self, d):
    return self.data

methods = {
    'senddata': senddata,
    'getdata': getData
}


def initBoard(data):
    for i in range(data['boardSize']):
        row = []
        for j in range(data['boardSize']):
            row += [-1]
        data['board'] += [row]

class Th(threading.Thread):
    def __init__(self, connection):
        threading.Thread.__init__(self)
        self.con = connection
        self.type = ''
        self.room = {}
    
    def recv_data(self, num):
        try:
            all_data = self.con.recv(num)
            if not len(all_data):
                return False
        except:
            return False
        else:
            code_len = all_data[1] & 127
            if code_len == 126:
                masks = all_data[4:8]
                data = all_data[8:]
            elif code_len == 127:
                masks = all_data[10:14]
                data = all_data[14:]

            else:
                masks = all_data[2:6]
                data = all_data[6:]
        raw_str=""
        i=0
        for d in data:
            raw_str += chr(d ^ masks[i%4])
            i+=1
        return raw_str

    def run(self):
        s = self.recv_data(1048576)
        if s == 'queue' or s == 'client':
            self.type = s
        if self.type == 'queue':
            self.send_data(json.dumps(rooms))
        elif self.type == 'client':
            self.room = rooms[roomPair[self.con.getpeername()[0]]]
            self.send_data(json.dumps(self.room))
        while True:
            try:
                s = self.recv_data(1048576)
                try:
                    d = json.loads(s)
                    print(d)
                    if self.type == 'queue':
                        if "method" in d:
                            if d["method"] == 'join':
                                print(rooms)
                                print(roomPair)
                                if len(rooms[d["name"]]['addresses']) == 2:
                                    self.send_data(json.dumps({"error_id": 0, "error_desc": "Room is full!"}))
                                else:
                                    roomPair[self.con.getpeername()[0]] = d["name"]
                                    rooms[d["name"]]['addresses'] += [self.con.getpeername()[0]]
                                    initBoard(rooms[d["name"]])
                            elif d["method"] == 'queue':
                                roomPair[self.con.getpeername()[0]] = d["name"]
                                rooms[d["name"]] = {
                                    'addresses': [self.con.getpeername()[0]],
                                    'boardSize': 15,
                                    'board': [],
                                    'chats': [],
                                    'player': 0,
                                    'gaming': True,
                                    'winner': 0,
                                    'rooms': []
                                }
                                print(rooms)
                                print(roomPair)
                    else:
                        if "method" in d:
                            if d["method"] == "senddata":
                                self.room['chats'] = d["data"]["chats"]
                                self.room['player'] = d["data"]["player"]
                                self.room['board'] = d["data"]["board"]
                                self.room['winner'] = d["data"]["winner"]
                                self.room['gaming'] = d["data"]["gaming"]
                except:
                    continue
            except:
                continue
        self.con.close()

    def send_data(self, data):
        if data:
            data = str(data)
        else:
            return False
        token = b"\x81"
        length = len(data)
        if length < 126:
            token += struct.pack("B", length)
        elif length <= 0xFFFF:
            token += struct.pack("!BH", 126, length)
        else:
            token += struct.pack("!BQ", 127, length)
        self.con.send(token + data.encode('utf-8'))
        return True
    
    def process(self, params):
        
        if (params['method'] == 'senddata'):
            data['board'][int(params[2])][int(params[3])]=int(params[4])
            if data['player'] == 0:
                data['player'] = 1
            else:
                data['player'] = 0
        if (params['method'] == 'sendplayer'):
            data['player'] = int(params[2])
        if (params[1] == 'sendchat'):
            data['chats'] += [params[2]]
        if (params[1] == 'win'):
            data['winner'] = int(params[2])
        if (params[1] == 'restart'):
            data['gaming'] = True
            data['player'] = 0
            initBoard()


def new_service(host):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(host)
        sock.listen(1000)
    except:
        sys.exit()
    while True:
        connection, address = sock.accept()
        print("Connection from ", address)
        if handshake(connection):
            print("Handshake success")
            try:
                t = Th(connection)
                ts.append(t)
                t.start()
            except:
                connection.close()
            

if __name__ == '__main__':
    new_service(host)