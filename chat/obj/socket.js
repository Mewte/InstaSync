var crypto = require('crypto');
var Promise = require("bluebird");
var db = require("instasync").db;


////Just an encapsulated socket object to be stored inside the cluster array
//io is global, just /deowitit for now
//Note: This is sort of a wrapper of the old socket.io object that was past around, this replicates some of the old functionality so can make minimal code changes
function socket(cluster_id,socket_id,handshake){
	this.cluster_id = cluster_id;
	this.socket_id = socket_id;
	this.handshake = handshake;
	this.info = {};
	this.joined = false;
	this.disconnected = false;
}
socket.prototype.emit = function(event,data){
	io.to(this.cluster_id).emit("message",{type:"emit",socket_id: this.socket_id, event:event, data:data});
};
socket.prototype.broadcast = function(room,event,data){
	io.emit("message",{type:"room_broadcast", socket_id: this.socket_id, room: room, event:event, data:data});
};
socket.prototype.disconnect = function(){
	if (!this.disconnected)
		io.to(this.cluster_id).emit("message",{type:"disconnect", socket_id: this.socket_id,room:this.info.room});
	this.disconnected = true;
};
socket.prototype.join = function(room){
	io.to(this.cluster_id).emit("message",{type:"join", socket_id: this.socket_id, room: room});
};
socket.prototype.stillExists = function(){
	return (clusters[this.cluster_id] && clusters[this.cluster_id][this.socket_id] != undefined)
};
socket.prototype.parseUser = function(){
	var self = this;
	return db.select("mods.permissions").from("sessions").leftJoin('mods',function(){ //checks if user is logged in & mod in one query
		this.on("sessions.username","=","mods.username").on("mods.room_name","=",db.raw("?",[self.handshake.room]))
	}).where({
		"sessions.username":self.handshake.username,
		"sessions.cookie":self.handshake.cookie
	}).then(function(user){
		if (user.length == 0){//greyname
			return {username:"unnamed",loggedin:false,permissions:0};
		}
		else{ //logged in
			user = user[0];
			var permissions = 0;
			if (user.permissions == null){ //check if room owner
				if (self.handshake.username.toLowerCase() == self.handshake.room.toLowerCase()) //room owner
					permissions = 2;
			}
			else{
				permissions = user.permissions;
			}
			return {username:self.handshake.username,loggedin:true,permissions:permissions}
		}
	}).then(function(userInfo){
		if (userInfo.loggedin){ //check bans for username or IP
			if (userInfo.permissions > 0)
				return [userInfo,false];
			else{
				return [userInfo,db.select("bans.*", "users.username").from("bans").leftJoin("users","users.id","bans.user_id")
					.where({room_name:self.handshake.room}).where(db.raw("(users.username = ? or bans.ip = ?)",[self.handshake.username,self.handshake.ip]))
					.then(function(row){
						return (row.length > 0);
					}).catch(function(err){throw err;})];
			}
		}
		else{ //check bans for IP
			return [userInfo, db.select("*").from("bans").where({ip:self.handshake.ip}).where({room_name:self.handshake.room}).then(function(row){
				return (row.length > 0);
			}).catch(function(err){throw err;})]
		}
	}).spread(function(userInfo, isBanned){
		if (isBanned){
			var err = new Error("User is banned");
			err.type = "banned";
			throw err;
		}
		else{
			var hashedIp = crypto.createHash('md5').update("Random Salt Value: $34x!20" + self.handshake.ip).digest("hex").substring(0, 16);
			var hashedId = crypto.createHash('md5').update("RandomSaltx2312"+self.socket_id).digest("hex");
			self.info = {username: userInfo.username, permissions: userInfo.permissions, room: self.handshake.room,
						   loggedin: userInfo.loggedin, ip: self.handshake.ip, hashedIp: hashedIp,hashedId: hashedId,
						   skipped: false, voteinfo: {voted: false, option: null}};
		}
	}).then(function(){
		return new Promise.resolve() //force return of a promise which allows .then to be used
	}).catch(function(err){
		throw err;
	});
};
socket.toRoom = function(room,event,data){ //socket static function for broadcasting to room
	io.emit("message",{type:"room_emit", room: room, event:event, data:data});
};
socket.toAll = function(event,data){
	io.emit("message",{type:"emit_all", event:event, data:data});
};
module.exports = socket;