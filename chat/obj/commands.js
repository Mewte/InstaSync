//Note for comparing permissions with eachother, Use if (parseInt(socket.info.permissions) > parseInt(OTHERSOCKET.info.permissions))
//Also, Alot of problems with comparisons.. using parseInt(num,10) for alot of stuff to be sure they're getting casted properly
//I.E. 10 is not greater than 0, but 9 is?
var parser = require("./parsers");

var yt = require('youtube-node');
var Youtube = new yt();
Youtube.setKey("AIzaSyAeh6mQ9y2qV1OARN04Z1NKfHDifSlblQs");
var instasync = require('instasync');
var Socket = require("./socket");
var video = require('n-vimeo').video;
var db = instasync.db;
var logger = instasync.logger;

var request = require('request');

//Array.prototype.isArray = true; //use to check if variable is an array - WHY DOES THIS ALWAYS BREAK EVERYTHING

module.exports.commands = 
	{
		"broadcast":function(data, socket){
			if (socket.info.username.toLowerCase() === "mewte" && socket.info.loggedin)
			{
				if (data.message !== undefined)
				{
					Socket.toAll('sys-message',{message: data.message});
				}
			}
		},
		"reload":function(data, socket){
			socket.emit('play', {info: rooms[socket.info.room].nowPlaying.info, time: rooms[socket.info.room].time(), playing: rooms[socket.info.room].playing});
		},
		"add":function(data, socket){
			if (data.URL === undefined || data.URL === null)
			{
				return;
			}
			if (socket.info.loggedin)
			{
				if (rooms[socket.info.room].playListLock)
				{
					if (!(socket.info.permissions > 0)) //if user isn't mod
					{
						socket.emit('sys-message', {message: "Playlist locked."});
						return;
					}
				}
				if (data.URL != "") //trim it now that we know it's not undefined
				{

					var vidinfo = parser.parseURL(data.URL);
					if (vidinfo)
					{
						if (vidinfo.provider === "youtube"){
							Youtube.getById(vidinfo.id,function( err, data ) {
								if(err)
								{
									logger.log("Failed to add video error: " + err.message);
									socket.emit('sys-message', {message: 'Failed to add video.. :-/'});
								}
								else
								{
									if (data.items.length > 0){
										var vid = data.items[0];
										if (vid.status.embeddable != true){
											socket.emit('sys-message', {message: 'That video does not allow embeding.'});
										}
										else{
											var duration = parser.parseYTDuration(vid.contentDetails.duration)
											if (duration === 0)
												duration = 86400; //It's a live stream, make it 24 hours
											var info =
											{
												info:
												{
													provider: vidinfo.provider,
													mediaType: vidinfo.mediaType,
													id: vidinfo.id,
													channel: vidinfo.channel,
													thumbnail: "https://img.youtube.com/vi/" + vidinfo.id + "/0.jpg"
												},
												addedby: socket.info.username,
												duration: duration,
												title: parser.replaceTags(vid.snippet.title)
											};
											socket.emit('sys-message', {message: rooms[socket.info.room].addVideo(info)});
										}
									}
									else{
										socket.emit('sys-message', {message: 'Video not found.'});
									}
								};
							});
						}
						else if (vidinfo.provider === "vimeo")
						{
							video(vidinfo.id, function(err,data)
							{
								if(err !== null)
								{
									logger.log("Failed to add video error: " + err.message);
									socket.emit('sys-message', {message: 'Failed to add video.. :-/'});
								}
								else
								{
									if (data.statusCode !== 200) //404 = not found
									{
										socket.emit('sys-message', {message: 'Video not found.'});
									}
									else
									{
										var info =
										{
											info:
											{
												provider: vidinfo.provider,
												mediaType: vidinfo.mediaType,
												id: vidinfo.id,
												channel: vidinfo.channel,
												thumbnail: data.raw.thumbnail_small
											},
											addedby: socket.info.username,
											duration: data.raw.duration, //millieconds
											title: parser.replaceTags(data.raw.title)
										}
										socket.emit('sys-message', {message: rooms[socket.info.room].addVideo(info)});
									}
								}
							})
						}
						else if (vidinfo.provider === "twitch")
						{
							if (vidinfo.mediaType === "stream")
							{
								var url = 'http://api.twitch.tv/channels/' + vidinfo.channel // input your url here

								// use a timeout value of 10 seconds
								var timeoutInMilliseconds = 10*1000
								var opts = {
								  url: url,
								  timeout: timeoutInMilliseconds
								}

								request(opts, function (err, res, body) {
								  if (err) {
									socket.emit('sys-message', {message: "Failed to add video."});
									return;
								  }
								  var statusCode = res.statusCode
								  if (statusCode !== 200)
								  {
									  socket.emit("sys-message", {message: "Video not found."});
								  }
								  else
								  {
										var info =
										{
											info:
											{
												provider: vidinfo.provider,
												mediaType: vidinfo.mediaType,
												id: vidinfo.id,
												channel: vidinfo.channel,
												thumbnail: "http://www-cdn.jtvnw.net/images/xarth/header_logo.png"
											},
											addedby: socket.info.username,
											duration: 60*60*24,
											title: parser.replaceTags(vidinfo.channel)
										};
										socket.emit('sys-message', {message: rooms[socket.info.room].addVideo(info)});
								  }
								});
							}
							else
							{
								socket.emit('sys-message', {message: "Twitch.tv non stream media is not supported yet."});
							}
						}
						else if (vidinfo.provider === "dailymotion"){
								var url = "https://api.dailymotion.com/video/"+vidinfo.id+"?fields=duration,allow_embed,title,thumbnail_180_url";
								// use a timeout value of 10 seconds
								var timeoutInMilliseconds = 10*1000;
								var opts = { url: url, timeout: timeoutInMilliseconds};
								request(opts, function (err, res, body) {
								  if (err) {
									socket.emit('sys-message', {message: "Failed to add video. Try again later."});
									return;
								  }
								  var statusCode = res.statusCode;
								  if (statusCode !== 200)
								  {
									  socket.emit("sys-message", {message: "Video not found."});
								  }
								  else
								  {
										body = JSON.parse(body);
										if (body.allow_embed != true){
											socket.emit("sys-message", {message: "This video does not allow embeding."});
											return;
										}
										var info =
										{
											info:
											{
												provider: vidinfo.provider,
												mediaType: vidinfo.mediaType,
												id: vidinfo.id,
												channel: vidinfo.channel,
												thumbnail: body.thumbnail_180_url
											},
											addedby: socket.info.username,
											duration: body.duration,
											title: parser.replaceTags(body.title)
										};
										socket.emit('sys-message', {message: rooms[socket.info.room].addVideo(info)});
								  }
								});
						}
					}
					else
					{
						socket.emit('sys-message', {message: "Invalid URL."});
					}
				}
			}
			else
			{
				socket.emit('sys-message', {message: "You must be logged in to add videos."});
			}
		},
		"ban":function(data, socket){
			if (data.userid === undefined){ return;}
			var indexOfUser = rooms[socket.info.room].indexOfUserByHashedID(data.userid);
			if (indexOfUser > -1){
				var banUser = rooms[socket.info.room].users[indexOfUser]; //user and socket object are structured differently
				if (banUser === undefined)
					return; //Can cause issue where socket is undefined (For now on, anytime accessing sockets.sockets[socket.id] check for undefined)
				var banSocket = clusters[banUser.cluster_id][banUser.id];
				if (banSocket === undefined)
					return;
				if (parseInt(socket.info.permissions,10) > parseInt(banSocket.info.permissions,10))
				{
					if (banSocket.info.loggedin){
						db("bans").insert(db.raw(
							"(user_id, username, room_name, ip, loggedin) " + db.select(db.raw("id as user_id, username, ? as room_name, ? as ip, 1 as loggedin",
							[banSocket.info.room,banSocket.info.ip])).from("users").where("username", banSocket.info.username).toString()))
						.then(function(){
							socket.emit("sys-message",{message:"User banned."});
						}).catch(function(e){
							if (e.errno == 1062){ //duplicate
								socket.emit("sys-message",{message:"That user is already banned."});
							}
							else
								socket.emit("sys-message",{message:"Failed to ban user."});
						});	
					}
					else{
						db("bans").insert({user_id:null, username:banSocket.info.username,room_name:banSocket.info.room,ip:banSocket.info.ip, loggedin:0}).then(function(){
							socket.emit("sys-message",{message:"User banned"});
						}).catch(function(e){
							if (e.errno == 1062){ //duplicate
								socket.emit("sys-message",{message:"That user is already banned."});
							}
							else
								socket.emit("sys-message",{message:"Failed to ban user."});
						});
					}
					banSocket.emit('sys-message', {message: "You've been banned."});
					banSocket.disconnect();
					rooms[socket.info.room].kickAllByIP(banSocket.info.ip);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " has banned a user."});
				}
			}
		},
		"leaverban":function(data, socket){
			if (data.username === undefined){ return;}
			if (socket.info.permissions > 0)
			{
				var user = rooms[socket.info.room].lastUserByUsername(data.username);
				if (user != -1)
				{
						if (user.loggedin){
							db("bans").insert(db.raw(
								"(user_id, username, room_name, ip, loggedin) " + db.select(db.raw("id as user_id, username, ? as room_name, ? as ip, 1 as loggedin",
								[socket.info.room,user.ip])).from("users").where("username", user.username).toString()))
							.then(function(){
								socket.emit("sys-message",{message:"User leaver banned."});
							}).catch(function(e){
								if (e.errno == 1062){ //duplicate
									socket.emit("sys-message",{message:"That user is already banned."});
								}
								else
									socket.emit("sys-message",{message:"Failed to leaver ban user."});
							});
						}
						else{
							db("bans").insert({user_id:null, username:user.username,room_name:socket.info.room,ip:user.ip, loggedin:0}).then(function(){
								socket.emit("sys-message",{message:"User leaver banned banned"});
							}).catch(function(e){
								if (e.errno == 1062){ //duplicate
									socket.emit("sys-message",{message:"That user is already banned."});
								}
								else
									socket.emit("sys-message",{message:"Failed to leaver ban user."});
							});
						}
						rooms[socket.info.room].kickAllByIP(user.ip);
						Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " leaverbanned a user."});
				}
				else
				{
					socket.emit("sys-message", {message: "Username not found."});
				}
			}
		},
		"unban":function(data, socket){
			if (data.username === undefined){ return;} //argument 1 missing
			if (socket.info.permissions > 0)
			{
				db("bans").where({room_name:socket.info.room}).where({username:data.username}).del().then(function (affected) {
					if (affected){
						socket.emit('sys-message', {message: "User unbanned."});
					}
					else{
						socket.emit('sys-message', {message: "User not found."});
					}
				}).catch(function (e) {
					socket.emit('sys-message', {message: "Failed to remove ban."});
				});
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " has unbanned a user."});
			}
		},
		"clearbans":function(data, socket){
			if (socket.info.permissions > 0)
			{
				db("bans").where({room_name:socket.info.room}).del().then(function (affected) {
					socket.emit('sys-message', {message: "Bans cleared."});
				}).catch(function (e) {
					socket.emit('sys-message', {message: "Failed to clear bans."});
				});
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " has cleared the ban list"});
			}
		},
		"kick":function(data, socket){
			if (data.userid === undefined){ return;}
			var indexOfUser = rooms[socket.info.room].indexOfUserByHashedID(data.userid)
			if (indexOfUser > -1)
			{
				var kickUser = rooms[socket.info.room].users[indexOfUser]; //user and socket object are structured differently
				if (kickUser === undefined)
					return; //Can cause issue where socket is undefined (For now on, anytime accessing sockets.sockets[socket.id] check for undefined)
				var kickSocket = clusters[kickUser.cluster_id][kickUser.id];
				if (kickSocket === undefined)
					kickSocket;
				if (parseInt(socket.info.permissions,10) > parseInt(kickSocket.info.permissions,10))
				{

					kickSocket.emit('sys-message', {message: "You've been kicked."});
					kickSocket.disconnect();
					socket.emit("sys-message", {message: "User kicked."});
					rooms[socket.info.room].kickAllByIP(kickSocket.info.ip);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " has kicked a user."});
				}
			}

		},
		"skip":function(data, socket){
			if (socket.info.loggedin && socket.info.skipped === false)
			{
				socket.info.skipped = true;
				rooms[socket.info.room].addSkip();
			}
		},
		"next":function(data, socket){
			if (socket.info.permissions > 0)
			{
				rooms[socket.info.room].nextVid();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " used next."});
			}
		},
		"remove":function(data, socket){
			if (socket.info.permissions > 0)
			{
				if (data.info != undefined)
				{
					rooms[socket.info.room].removeVideo(data.info, true);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " removed a video."});
				}
			}
		},
		"purge":function(data, socket){
			if (socket.info.permissions > 0)
			{
				if (data.username != undefined)
				{
					rooms[socket.info.room].purge(data.username);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " has purged " + data.username + "'s videos."});
				}
			}
		},
		"toggleplaylistlock":function(data, socket){
			if (socket.info.permissions > 0)
			{
				rooms[socket.info.room].togglePlaylistLock();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " toggled playlist lock."});
			}
		},
		"setskip":function(data, socket){
			if (socket.info.permissions > 0)
			{
				if ((data.skip != undefined) && (!isNaN(data.skip)) && (parseInt(data.skip,10) > 0) && (parseInt(data.skip[1]),10) < 100)
				{//defined, a number, 1-100
					rooms[socket.info.room].setSkip(parseInt(data.skip, 10) / 100);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " modified the skip ratio."});
				}
			}
		},
		"resynch":function(data, socket){
			if (rooms[socket.info.room].playing)
				socket.emit('seekTo', {time: rooms[socket.info.room].time()})
			else
			{
//
			}
		},
		"motd":function(data, socket){

			if (data.MOTD != undefined && socket.info.permissions > 0 )
			{
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " changed the MOTD."});
				rooms[socket.info.room].setMOTD("MOTD:" + parser.replaceTags(data.MOTD).substring(0,240));
			}
		},
		//TEMPORARY COMMANDS (HOPEFULLY) ------------------------------------
		"mod":function(data, socket){
			socket.emit('sys-message', {message: "The mod command has been removed. You can add/remove moderators by using the settings dropdown menu."});
		},
		"demod":function(data, socket){
			socket.emit('sys-message', {message: "The demod command has been removed. You can add/remove moderators by using the settings dropdown menu."});
		},
		"banlist":function(data, socket){
			if (socket.info.permissions > 0){
				db.select(["username","loggedin"]).from('bans').where({room_name:socket.info.room}).then(function(bans){
					//possibly check if socket still exists?
					//					if (clusters[socket.cluster_id][socket.socket_id] != undefined){ //check for rare instance that socket disconnected
					var banlist = "";
					if (bans.length == 0){
						banlist = "Ban list is empty.";
					}
					else{
						for (var i = 0; i < bans.length; i++){
							var ban = bans[i].username + (bans[i].loggedin == 1 ? " " : "(greyname) ");
							banlist += ban;
						}
					}
					socket.emit('sys-message', {message: banlist});
				}).catch(function(err){
					socket.emit('sys-message', {message: "Error getting ban list."});
				});
			}
		},
		"modlist":function(data, socket){
			if (socket.info.permissions > 0){
				db.select(["username"]).from('mods').where({room_name:socket.info.room}).then(function(mods){
					//possibly check if socket still exists?
					//					if (clusters[socket.cluster_id][socket.socket_id] != undefined){ //check for rare instance that socket disconnected
					var modlist = socket.info.room+" ";
					for (var i = 0; i < mods.length; i++) {
						var mod = mods[i].username + " ";
						modlist += mod;
					}
					socket.emit('sys-message', {message: modlist});
				}).catch(function(err){
					socket.emit('sys-message', {message: "Error getting mod list."});
				});
			}
		},
		"move":function(data, socket){
			if ((data.info != undefined && data.position != undefined) && (!isNaN(data.position)) && (socket.info.permissions > 0))
			{
				rooms[socket.info.room].moveVideo(data.info, parseInt(data.position));
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " moved a video."});
			}
		},
		"shuffle":function(data,socket){
			if (socket.info.permissions > 0){
				var now = new Date().getTime() / 1000;
				if (now > rooms[socket.info.room].lastShuffle + 30){
					rooms[socket.info.room].shufflePlaylist();
					socket.emit("sys-message",{message:"Playlist shuffled."});
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " shuffled the playlist."});
				}
				else{
					socket.emit("sys-message",{message:"The playlist can only be shuffled every 30 seconds."});
				}
			}
		},
		"clean":function(data, socket){
			if (socket.info.permissions > 0)
			{
				rooms[socket.info.room].clean();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " cleaned the playlist."});
			}
		},
		"poll-create":function(data, socket){
			if (socket.info.permissions > 0 )
			{
				if (data.title != undefined && data.title.trim() != "" && data.options != undefined && data.options instanceof Array && data.options.length > 0 && data.options.length <= 10)
				{
					var title = parser.replaceTags(data.title.toString().substring(0, 240)); //validate title text
					var options = new Array();
					for (var i = 0; i < data.options.length; i++)
					{
						if (data.options[i].trim() != "")
							options.push(parser.replaceTags(data.options[i].toString().substring(0, 240)));
					}
					var poll = {title: title, options: options};
					rooms[socket.info.room].createPoll(poll);
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " created a poll."});
				}
			}
		},
		"poll-vote":function(data, socket){
			if (socket.info.loggedin === true && socket.info.voteinfo.voted === false && data.vote != undefined)
			{
				socket.info.voteinfo.voted = true;
				socket.info.voteinfo.option = data.vote;
				rooms[socket.info.room].addPollVote(data.vote)
			}
		},
		"poll-end":function(data, socket){
			if (socket.info.permissions > 0 )
			{
				rooms[socket.info.room].endPoll();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " ended a poll."});
			}
		},
		"lead": function(data, socket){
			if (socket.info.permissions > 0)
			{
				rooms[socket.info.room].makeLead(socket.info.hashedId);
			}
		},
		"unlead": function(data, socket){
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId)) //is user leader of room
			{
				rooms[socket.info.room].makeLead(null);
			}
		},
		"seekto":function(data, socket){
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId))
			{
				if ((data.time !== undefined) && (!isNaN(data.time)))
				{
					rooms[socket.info.room].seekTo(parseInt(data.time));
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " seekedto."});
				}
			}
		},
		"seekfrom":function(data, socket){
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId))
			{
				if ((data.time !== undefined) && (!isNaN(data.time)))
				{
					rooms[socket.info.room].seekFrom(parseInt(data.time,10));
					Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " seekedfrom."});
				}
			}
		},
		"play":function(data, socket){
			if (data.info === undefined){ return;}
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId))
			{
				rooms[socket.info.room].play(data.info);
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " played a video."});
			}
		},
		"pause":function(data, socket){
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId))
			{
				rooms[socket.info.room].pause();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " paused the video."});
			}
		},
		"resume":function(data, socket){
			if (socket.info.permissions > 0 && rooms[socket.info.room].isLeader(socket.info.hashedId))
			{
				rooms[socket.info.room].resume();
				Socket.toRoom(socket.info.room,"log",{message: socket.info.username + " resumed the video."});
			}
		}
		//---
	}
