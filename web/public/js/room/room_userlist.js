/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/
function userlist(room, socket){
	var self = this;
	this.users = new Array();
	this.addUser = function(user) {
		if (user instanceof Array){
			var users = [];
			for (var i = 0; i < user.length; i++) {
				users.push(createUser(user[i]));
			}
			$('#user_list').html(users);
		}
		else{
			$('#user_list').append(createUser(user));
		}
		sortUserlist();
		$('.user-count').text(self.users.length);
	};
	function createUser(user){
		var css = '';
		css += user.permissions > 0 ? "mod " : "";
		css += user.loggedin ? "registered " : "unregistered";
		css += room.isMuted(user.ip) ? "muted" : "";
		user.css = css;
		self.users.push(user);
		var userElement = $('<li/>', {
			"class": css,
			"text": user.username,
			"data": {user: user},
			"title": user.username
		});
		return userElement;
	};
	this.removeUser = function(id) {
		for (var i = 0; i < self.users.length; i++)
		{
			if (id === self.users[i].id)
			{
				self.users.splice(i, 1);
				$($('#user_list').children('li')[i]).remove();
				break;
			}
		}
		$('.user-count').text(self.users.length);
	};
	this.load = function(userlist){
		$('#user_list').empty();
		self.users = new Array();
		self.addUser(userlist);
	};
	this.renameUser = function(id, username) {
		for (var i = 0; i < self.users.length; i++)
		{
			if (self.users[i].id == id)
			{
				self.users[i].username = username;
				$($('#user_list li')[i]).text(username);
				$($('#user_list li')[i]).data('user', self.users[i]);
				break;
			}
		}
		if (id == room.user.userinfo.id) {//this user renamed themself
			room.user.userinfo.username = username;
			$("#join").hide();
			$('#cin').show();
			$('#cin').removeAttr('disabled');
			$('#cin').focus();
		}
		sortUserlist();
	};
	function sortUserlist() {
		var userlist = $('#user_list li')['clone'](true);
		userlist.sort(function (a, b) {
			var dataA = $(a).data('user');
			var dataB = $(b).data('user');
			var keyA = dataA.css + " "+dataA.username.toLowerCase();
			var keyB = dataB.css + " "+dataB.username.toLowerCase();
			if (keyA < keyB) {
				return -1;
			}
			if (keyA > keyB) {
				return 1;
			}
			return 0;
		});
		$('#user_list').empty();
		$('#user_list').html(userlist);
		self.users.sort(function (a, b) {
			var keyA = a.css + " "+a.username.toLowerCase();
			var keyB = b.css + " "+b.username.toLowerCase();
			if (keyA < keyB) {
				return -1;
			}
			if (keyA > keyB) {
				return 1;
			}
			return 0;
		});
	}
};