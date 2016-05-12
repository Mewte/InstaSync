function commands(socket,room){
	var self = this;
	this.list = {
		"'ban": function (data) {
			var banUserID = null;
			for (var i = 0; i < room.userlist.users['length']; i++) {
				if (room.userlist.users[i].username.toLowerCase() === data[1].toLowerCase()) {
					banUserID = room.userlist.users[i].id;
				}
			}
			socket.sendcmd('ban', {userid: banUserID});
		},
		"'unban": function (data) {
			socket.sendcmd('unban', {username: data[1]});
		},
		"'clearbans": function (data) {
			socket.sendcmd('clearbans', null);
		},
		"'kick": function (data) {
			var kickUserID = null;
			for (var i = 0; i < room.userlist.users['length']; i++) {
				if (room.userlist.users[i].username.toLowerCase() === data[1]['toLowerCase']()) {
					kickUserID = room.userlist.users[i]['id'];
				}
			}
			socket.sendcmd('kick', {userid: kickUserID});
		},
		"'next": function (data) {
			socket.sendcmd('next', null);
		},
		"'remove": function (data) {
			if (!isNaN(data[1])) {
				socket.sendcmd('remove', {info: playlist[data[1]].info});
			}
		},
		"'purge": function (data) {
			socket.sendcmd('purge', {username: data[1]});
		},
		"'play": function (data) {
			if (!isNaN(data[1])) {
				socket.sendcmd('play', {
					info: room.playlist.videos[data[1]].info
				});
			}
		},
		"'pause": function (data) {
			socket.sendcmd('pause', null);
		},
		"'resume": function (data) {
			socket.sendcmd('resume', null);
		},
		"'seekto": function (data) {
			if (!isNaN(data[1])) {
				socket.sendcmd('seekto', {time: data[1]});
			}
		},
		"'seekfrom": function (data) {
			if (!isNaN(data[1])) {
				socket.sendcmd('seekfrom', {time: data[1]});
			}
		},
		"'setskip": function (data) {
			if (!isNaN(data[1])) {
				socket.sendcmd('setskip', {skip: data[1]});
			}
		},
		"'resynch": function (data) {
			socket.sendcmd('resynch', null);
		},
		"'motd": function (data) {
			data.splice(0, 1);
			socket.sendcmd('motd', {MOTD: data.join(' ')});
		},
		"'mod": function (data) {
			socket.sendcmd('mod', {username: data[1]});
		},
		"'demod": function (data) {
			socket.sendcmd('demod', {username: data[1]});
		},
		"'banlist": function (data) {
			socket.sendcmd('banlist', null);
		},
		"'modlist": function (data) {
			socket.sendcmd('modlist', null);
		},
		"'move": function (data) {
			if (!isNaN(data[1]) && !isNaN(data[2])) {
				socket.sendcmd('move', {info: room.playlist.videos[data[1]].info, position: data[2]});
			}
		},
		"'clean": function (data) {
			socket.sendcmd('clean', null);
		},
		"'leaverban": function (data) {
			socket.sendcmd("leaverban", {username: data[1]});
		},
		"'lead": function (data) {
			socket.sendcmd("lead", null);
		},
		"'unlead": function (data) {
			socket.sendcmd("unlead", null);
		}
	}
};