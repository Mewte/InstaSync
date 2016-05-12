/*
 * Chat Server Core Code
 * Clients -> Socket.IO Clusters -> Server Core(THIS APPLICATION)
 */
var instasync = require("instasync");
var config = instasync.config;
var commands = require("./obj/commands");
var room = require("./obj/room");
var Socket = require("./obj/socket");
var parser = require("./obj/parsers");
var crypto = require('crypto');
var fs = require('fs');
var EventEmitter = require("events").EventEmitter;
var events = new EventEmitter();
events.setMaxListeners(0);
var db = instasync.db;
var logger = instasync.logger;

process.on('uncaughtException', function (error) {
	logger.log(jsonFriendlyError(error));
	logger.log("UNHANDLED ERROR! Logged to file.");
	fs.appendFile("chat_crashlog.log", error.stack + "---END OF ERROR----", function () {});
});
//object table, clusters is an object of clusters which are objects of sockets.
var webServer = require('http').createServer(function (req, res) {
	res.writeHead(404);
	res.end("No resource found.");
});
global.io = require('socket.io')(webServer);
global.rooms = {};
global.clusters = {};

webServer.listen(config.chat.listen_on);

io.use(function(socket,next){
	var token = socket.handshake.query.auth;
	next();
});
io.set('transports', ['websocket']);

io.on('connection', function(ipc_client){
	ipc_client.on("online",function(data,callback){
		if (clusters[ipc_client.id] == undefined){
			clusters[ipc_client.id] = {};
			callback({status:"ok"});
		}
		else
			callback({status:"notok"});
	});
	ipc_client.on("message",function(msg,callback){
		var socket;
		if (clusters[ipc_client.id][msg.socket_id] == undefined){
			if (msg.handshake != undefined){
				socket = new Socket(ipc_client.id,msg.socket_id,
					{
						username: msg.handshake.username.replace(/[^\x00-\x7F]/g, ""), //strip all unicode and force ascii (since mysql doesnt seem to enforce it)
						cookie: msg.handshake.cookie,
						room: msg.handshake.room.toLowerCase(),
						ip: msg.handshake.ip
					}
				);
				clusters[ipc_client.id][msg.socket_id] = socket;
			}
			else{
				return;//dont continue, handshake data not provided and socket is undefined
			}
		}
		else{
			socket = clusters[ipc_client.id][msg.socket_id];
		}
		switch(msg.type)
		{
			case "join":
					join(socket,callback);
				break;
			case "rename":
				rename(socket, msg.data.username);
				break;
			case "disconnect":
				disconnect(socket);
				break;
			case "chat":
				message(socket, msg.data.message);
				break;
			case "command":
				command(socket, msg.data.data);
				break;
		}

	});
	ipc_client.on("disconnect", function(){
		logger.log("Cluster: "+ipc_client.id+" disconnected!");
		//clean up all sockets
		for (var key in clusters[ipc_client.id]){
			var socket = clusters[ipc_client.id][key];
			if (socket.joined)
			{
				if (rooms[socket.info.room] != undefined)
				{
					rooms[socket.info.room].leave(socket);
				}
			}
		}
		delete clusters[ipc_client.id];
	});
	ipc_client.on("error", function(e){
		ipc_client.emit("error_occured",{});//emit that an error occured, giving the socket a chance to cleanly end itself (and reconnect)
		ipc_client.disconnect();
		throw e;
	});
});
function join(socket){
	if (!socket.joined){
		var roomname = socket.handshake.room;
		if (rooms[roomname] == undefined || rooms[roomname] == "loading"){ //room not in memory or loading
			if (rooms[roomname] == undefined){
				db.select().from("rooms").where({room_name:roomname}).then(function(rows){
					if (rows.length == 0){
						delete rooms[roomname];
						events.emit("room_ready:"+roomname,true);
					}
					else{
						var roomObj = room.create(roomname, function(err){
							if (err != false){
								delete rooms[roomname];
								events.emit("room_ready:"+roomname,true);
							}
							else{ //room is ready, all users waiting for it can now join
								rooms[roomname] = roomObj;
								events.emit("room_ready:"+roomname,false);
							}
						});
					}
				}).catch(function(e){
					delete rooms[roomname];
					events.emit("room_ready:"+roomname,true);
				});
				rooms[roomname] = "loading";
			}
			socket.emit("sys-message",{message:"Loading room.."});
			events.once('room_ready:'+roomname,function(err){
				if (err != false){
					logger.log(err);
					socket.emit("sys-message", { message:"Error connecting to room. Please try again."});
					socket.disconnect();
				}
				else{//join room
					socket.parseUser().then(function(){
						if (rooms[roomname] && socket.stillExists()) //just to be sure it exists I guess? and that sockets still connected?
							rooms[socket.info.room].tryJoin(socket);
					}).catch(function(err){
						if (err.type == "banned"){
							socket.emit("sys-message", { message:"You are banned from this room."});
							socket.disconnect();
						}
						else{
							logger.log(err);
							socket.emit("sys-message", { message:"Error connecting to room. Please try again."});
							socket.disconnect();
						}
					});
				}
			});
		}
		else{ //room in memory
			socket.parseUser().then(function(){
				if (rooms[roomname] && socket.stillExists()) //just to be sure it exists I guess? and that sockets still connected?
					rooms[socket.info.room].tryJoin(socket);
			}).catch(function(err){
				if (err.type == "banned"){
					socket.emit("sys-message", { message:"You are banned from this room."});
					socket.disconnect();
				}
				else{
					logger.log(err);
					socket.emit("sys-message", { message:"Error connecting to room. Please try again."});
					socket.disconnect();
				}
			});
		}
	}
}
function rename(socket, newUsername){
	if (socket.joined)
	{
		if (socket.info.username == "unnamed")
		{
			rooms[socket.info.room].rename(socket, newUsername);
		}
	}
}
function disconnect(socket){
	if (socket.joined)
	{
		if (rooms[socket.info.room] != undefined)
		{
			rooms[socket.info.room].leave(socket);
		}
	}
	socket.disconnected = true;
	if (clusters[socket.cluster_id])
		delete clusters[socket.cluster_id][socket.socket_id];
}
function message(socket, message){
	if (socket.joined && socket.info.username.toLowerCase() != "unnamed")
	{
		rooms[socket.info.room].chatmessage(socket, parser.replaceTags(message));
	}
}
function command(socket, data){
	if (data.command != undefined && commands.commands[data.command] !=  undefined && socket.joined)
	{
		if (data.data !== undefined) //TODO: Check if data is not null for certain commands
		{
			if (data.data === null)
			{
				data.data = {}; //help prevent crash when null is sent but needed.
				//commands.js will see this as an object and thus .property will trigger the undefined checks
			}
			commands.commands[data.command](data.data, socket);
		}
	}
}
function jsonFriendlyError(err, filter, space) {
	var plainObject = {};
	Object.getOwnPropertyNames(err).forEach(function (key) {
		plainObject[key] = err[key];
	});
	return plainObject;
}
