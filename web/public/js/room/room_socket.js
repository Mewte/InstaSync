/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/
//Use this to have the socket in a file seperate from the room file, but it's still a part of it (or rather an extension of it)
room.setSocket(new function (room){
	var server = "";
	var usingFailOver = false;
	var firstConnect = true;
	if (location.protocol.toLowerCase() == "http:"){
		server = CHAT_SERVER.host +":"+ CHAT_SERVER.port;
	}
	else{
		server = SECURE_CHAT_SERVER.host + ":" + SECURE_CHAT_SERVER.port;
	}
	var socket = io(server,
	{
		query: {room:room.roomName,seed:Math.floor((Math.random() * 10000) + 1)},
		"autoConnect": false
	});
	var commandList = new commands(this,room);
	this.sendmsg = function (message) {
		var d = new Date();
		message = message.substring(0, 240);
		if (message[0] == "'")
		{
			var arguments = message['split'](' ');
			if (commandList.list[arguments[0].toLowerCase()] != undefined) {
				commandList.list[arguments[0].toLowerCase()](arguments);
			}
		}
		else
		{
			socket.emit('message', {message: message});
		}
	};
	this.sendcmd = function (command, data) {
		if (data == undefined){
			data = null;
		}
		socket.emit('command', {command: command, data: data});
	};
	this.rename = function (username) {
		socket.emit('rename', {username: username});
	};
	this.disconnect = function () {
		socket.disconnect();
	};
	this.connect = function () {
		socket.open();
	};
	function toggleFailOver(){
		if (!usingFailOver){
			room.addMessage({username:""},"Attempting failover..","text-danger");
			socket.io.uri = FAIL_OVER.host+":"+FAIL_OVER.port; //located in room/index.ejs
			usingFailOver = true;
		}
		else{
			if (location.protocol.toLowerCase() == "http:"){
				socket.io.uri = CHAT_SERVER.host +":"+ CHAT_SERVER.port;
			}
			else{
				socket.io.uri = SECURE_CHAT_SERVER.host + ":" + SECURE_CHAT_SERVER.port;
			}
			room.addMessage({username:""},"Attempting failover..","text-danger");
			socket.io.uri = FAIL_OVER.host+":"+FAIL_OVER.port;
			usingFailOver = false;
		}

	};
	socket.on('sys-message', function (data) {
		room.addMessage({username: ""}, data.message, 'text-info');
	});
	socket.on('rename', function (data) {
		room.userlist.renameUser(data.id, data.username);
	});
	socket.on('connect', function () {
		firstConnect = false;
		if ($['cookie']('username') === undefined || $['cookie']('auth_token') === undefined)
		{
			socket.emit('join', { username: '', cookie: '', room: room.roomName});
		}
		else
		{
			socket.emit('join', {username: $['cookie']('username'),cookie: $['cookie']('auth_token'), room: room.roomName});
		}
		room.e.trigger('connected');
		room.e.trigger('joining');
	});
	socket.on('reconnecting', function (attempt){
		if (firstConnect){ //do less attemps on the first try before switching to failover
			if (!usingFailOver){
				toggleFailOver();
			}
		}
		else{
			room.e.trigger('reconnecting',[attempt]);
			if (attempt > 3 && !usingFailOver){
				toggleFailOver();
			}
		}
	});
	socket.on('reconnect', function (data) {
		room.e.trigger('reconnect');
	});
	socket.on('request-disconnect', function()
	{
		socket.disconnect();
	});
	socket.on('disconnect', function (data){
		room.e.trigger('disconnect');
	});
	socket.on('userinfo', function (data) {
		room.userinfo(data);
		room.e.trigger('joined');
	});
	socket.on('playlist', function (data) {
		room.playlist.load(data.playlist);
	});
	socket.on('shuffled', function(data){ //same as playlist, but this one resets the 'active' video in the playlist
		room.playlist.load(data.playlist);
		if (room.video.loadedVideo){
			var indexOfVid = room.playlist.indexOf(room.video.loadedVideo);
			if (indexOfVid > -1){
				$('#playlist .active').removeClass('active');
				$($('#playlist').children('li')[indexOfVid]).addClass('active');
				//Scroll to currently playing video
				var container = $('#playlist');
				var scrollTo = $("#playlist .active");
				container.animate({
					scrollTop: scrollTo.offset().top - container.offset().top + container.scrollTop()
				});
			}
		}
	});
	socket.on('userlist', function (data) {
		room.userlist.load(data.userlist);
	});
	socket.on('room-event', function (data)
	{
		//TODO: data.data should ALWAYS BE DATA, why is it sometimes data.data and sometimes data.poll? etc.
		room.event(data.action, data);
	});
	socket.on('add-user', function (data)
	{
		room.userlist.addUser(data.user, true);
	});
	socket.on('remove-user', function (data)
	{
		room.userlist.removeUser(data['userId']);
	});
	socket.on('chat', function (data)
	{
		room.addMessage(data.user, data.message, '');
	});
	socket.on('add-vid', function (data) {
		room.playlist.addVideo(data.info);
	});
	socket.on('remove-vid', function (data) {
		for(var i = 0; i < data.videos.length; i++){
			room.playlist.removeVideo(data.videos[i]);
		}
	});
	socket.on('move-vid', function (data) {
		room.playlist.moveVideo(data.info, data.position);
	});
	socket.on('play', function (data) {
		room.playVideo(data.info, data.time, data.playing);
	});
	socket.on('resume', function (data) {
		room.resume();
	});
	socket.on('pause', function (data) {
		room.pause();
	});
	socket.on('seekTo', function (data) {
		room.seekTo(data.time);
	});
	socket.on('skips', function (data) {
		room.setSkips(data.skips, data.skipsneeded);
	});
	socket.on('purge', function (data) {
		room.playlist.purge(data.username);
	});
	socket.on('log', function (data) {
		console.log(data.message);
	});
	return this;
}(room));