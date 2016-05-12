/*
 * Chat Server Socket.IO
 * Clients -> Socket.IO Clusters(THIS APPLICATION) -> Server Core
 */
var commandQueue = require("./obj/commandQueue");
var instasync = require("instasync");
var config = instasync.config;
var client = require("socket.io-client");
var os = require("os");
var fs = require('fs');
var logger = instasync.logger;

process.on('uncaughtException', function (error) {
	logger.log(jsonFriendlyError(error));
	logger.log("UNHANDLED ERROR! Logged to file.");
	fs.appendFile("clients_crashlog.log", error.stack + "---END OF ERROR----", function () {});
});

var EventEmitter = require("events").EventEmitter;
var events = new EventEmitter();
events.setMaxListeners(0); //infinite listeners, we will be creating a listener for every socket in 'queue'

ipc = client.connect('http://'+config.chat_clients.ipc.host+':'+config.chat_clients.ipc.port,{
	query: "auth=abc123",
	timeout: 5000,
	transports: ['websocket']
});
var status = 0; //if status is true, sockets can connect, if 0 then no they cannot connect
ipc.on('connect',function() {
	logger.log("Connected to IPC!");
	ipc.emit("online",{},function(response){
		if (response.status == "ok"){
			logger.log("Spawning Server..")
			status = 1;
			events.emit("ipc_connected");
		}
	});
});
ipc.on('message', function(msg,callback){
	switch (msg.type)
	{
		case "emit": //emit to single socket
			io.to(msg.socket_id).emit(msg.event, msg.data);
			break;
		case "emit_all":
			io.emit(msg.event, msg.data);
			break;
		case "room_emit": //all sockets in room
			io.sockets.in(msg.room).emit(msg.event, msg.data);
			break;
		case "room_broadcast": //all sockets in room except 'sender'
			if (io.sockets.connected[msg.socket_id]){
				io.sockets.connected[msg.socket_id].broadcast.to(msg.room).emit(msg.event, msg.data);
			}
			else
				io.sockets.in(msg.room).emit(msg.event, msg.data);
			break;
		case "disconnect": //disconnect socket
			if (io.sockets.connected[msg.socket_id]){
				var socket = io.sockets.connected[msg.socket_id];
				if (msg.room)
					socket.leave(msg.room); //which room to leave is sent with the disconnect event so that we can ensure the user will no longer receive room emits during this disconnect period
				socket.emit('request-disconnect');
				setTimeout(function() //give socket a small delay to disconnect itself before we force boot it
				{
					socket.disconnect();
				}, 500);
			}
			break;
		case "join":
			//join socket.io room
			var socket = io.sockets.connected[msg.socket_id];
			if (socket)
				socket.join(msg.room);
			break;
		default:
			break;
	}
});
ipc.on('disconnect',function(){
	logger.log("Disconnected from IPC!");
	io.emit("sys-message",{message:"IPC connection to chat server lost. We will attempt to reconnect when it is back online.."});
//	for (var socketID in io.sockets.connected){
//		io.sockets.connected[socketID].emit('request-disconnect');
//	};
	status = 0;
});
ipc.on('error_occured', function(){ //chat server encountered an exception and disconnected us.
	logger.log("error_occured");
	setTimeout(function(){
		ipc.connect();
	}, 1000)
});
ipc.on('connect_error', function(e){
	logger.log("connect_error");
});
ipc.on('connect_timeout',function(){
	logger.log('connect_timeout');
});
//var webServer = require('http').createServer(function (req, res) {
//	res.writeHead(404);
//	res.end("No resource found.");
//});

//var express = require('express');
//var http = require('http');
//var webServer = http.createServer(express);
//express.get('/',function(){
//	res.send('hi');
//});
var app = require('express')();
var webServer = require('http').Server(app);
var io = require('socket.io')(webServer);

webServer.listen(config.chat_clients.listen_on);

app.use("*",function(req,res,next){
	res.header('hostname',os.hostname());
	res.send("No resource found.")
});
io.use(function(socket, next,a){
	next();
});
io.on('connection', function(socket) {
	var ip = socket.client.request.headers['cf-connecting-ip'] || socket.client.conn.remoteAddress;
	var joinEmitted = false;
	var ipc_connected_callback = function(){ //saved as variable so we can clear it from the eventemitter (otherwise it leaks)
		if (socket.connected){ //be sure socket is still connected
			ipc.emit("message",{type: "join",socket_id: socket.id,handshake: socket.info});
		}
	};
	socket.on('join', function(data)
	{
		if (joinEmitted == false){// this is a one time emit per socket connection
			if (data.username != undefined && data.cookie != undefined && data.room != undefined && data.room == socket.handshake.query.room)
			{
				socket.info = {
					username: data.username,
					cookie: data.cookie,
					room: data.room,
					ip: ip
				}
				if (status){
					ipc.emit("message",{type: "join",socket_id: socket.id,handshake: socket.info});
				}
				else{ //put user in queue and trigger event when IPC comes back online
					socket.emit("sys-message",{message:"Could not connect to central chat server."});
				}
				events.on("ipc_connected",ipc_connected_callback);
			}
		}
		joinEmitted = true;
	});
	var renameEmitted = false;
	socket.on('rename', function(data)
	{
		if (data.username != undefined && data.username.toLowerCase() != "unnamed" && renameEmitted == false)
		{
			if (data.username.toLowerCase() == "mewte")
			{
				socket.emit("sys-message", {message: "b-but you are not Mewte..."});
			}
			else
			{
				ipc.emit("message",{type: "rename", socket_id: socket.id, data: {username: data.username}});
				renameEmitted = true;
			}
		}
	});
	socket.on('disconnect', function(data)
	{
		ipc.emit("message",{type: "disconnect", socket_id: socket.id});
		events.removeListener("ipc_connected",ipc_connected_callback);
	});
	var currentCharacters = 0;
	var currentMessages = 0;
	var reduceMsgInterval = null; //reduce messages by 1 and characters by 100 every second
	socket.on('message', function(data)
	{
		if ((data.message != undefined) && (data.message.trim() != "")){
			//increment message limits
			currentCharacters += data.message.length;
			currentMessages += 1;

			if (currentCharacters > 260 || currentMessages > 3)
			{
				socket.emit("sys-message", {message: "Please don't spam/flood the chat."});
				currentCharacters = Math.min(600, currentCharacters);
				currentMessages = Math.min(6, currentMessages);
			}
			else
			{
				ipc.emit("message",{type: "chat", socket_id: socket.id, data: {message: data.message}});
			}
			if (reduceMsgInterval === null)
			{
				reduceMsgInterval = setInterval(
				function(){
					currentCharacters -= 60;
					currentMessages -= 1;
					currentCharacters = Math.max(0, currentCharacters);
					currentMessages = Math.max(0, currentMessages);
					if (currentCharacters == 0 && currentMessages == 0)
					{
						clearInterval(reduceMsgInterval);
						reduceMsgInterval = null;
					}
				},1000);
			}
		}

	});
	var queue = commandQueue.create(6);
	socket.on('command', function(data)
	{
		queue.addCommand();
		if (queue.checkFlood()) //too many commands
		{
			socket.emit('sys-message', { message: "Too many commands. Disconnected."});
			socket.emit("request-disconnect");
			socket.disconnect();
			return;
		}
		if (joinEmitted){
			ipc.emit("message",{type: "command", socket_id: socket.id, data: {data: data}});
		}
	});
});
function jsonFriendlyError(err, filter, space) {
	var plainObject = {};
	Object.getOwnPropertyNames(err).forEach(function (key) {
		plainObject[key] = err[key];
	});
	return plainObject;
}
