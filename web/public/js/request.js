/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/
var request = new function(){
	var base_url = "/ajax/";
	this.register = function(credentials, callback){
		$.post(base_url+"register", credentials).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.login = function(credentials, callback)
	{
		$.post(base_url+"login", credentials).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.logout = function(callback){
		$.post(base_url+"logout").done(function(){
			callback();
		}).fail(function(){
			callback();
		});		
	};
	this.checklogin = function(callback){
		$.get(base_url+"me/user_info").done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.getRoomInfo = function(callback){
		$.get(base_url+"me/room_info").done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.getMods = function(room,callback){
		//todo: if room != null, find mods for that room, else mods for users own room
		$.get(base_url+"me/mods").done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.addMod = function(username,callback){
		$.post(base_url+"mods/add",{username: username}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.removeMod = function(username,callback){
		$.post(base_url+"mods/remove",{username: username}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.changePassword = function(current,newPass,callback){
		$.post(base_url+"me/change_password",{current: current, new: newPass}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.sendReset = function(username, email, callback){
		$.post(base_url+"me/send_reset",{username: username, email: email}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.passwordReset = function(token,newPass,callback){
		$.post(base_url+"me/password_reset",{token: token, new: newPass}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.getUser = function(username, callback)
	{
		$.get(base_url+"user/"+username).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.updateUser = function(avatar, bio, callback)
	{
		$.post("/ajax/me/user_info", {avatar: avatar, bio: bio}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.updateRoom = function(listing, description, info, callback)
	{
		$.post("/ajax/me/room_info", {listing: listing, description: description, info: info}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.roomList = function(page,sortBy,callback){
		$.get("/ajax/rooms", {sortBy: sortBy, page: page}).done(function(response){
			callback(false,response);
		}).fail(errorHandler(callback));
	};
	this.getYoutubeSearch = function(parameters, callback){
		$.get("https://www.googleapis.com/youtube/v3/search",{
			"key":"AIzaSyBfXyKOS32phSgIEDNbaJMNQuXAEVVFBac",
			"part":"snippet",
			"fields":"nextPageToken,prevPageToken,items(id)",
			"type":"video",
			"maxResults":4,
			"q":parameters.query,
			"pageToken":parameters.pageToken
		}).done(function(data){
			var IDs = [];
			for (var i = 0; i < data.items.length; i++){
				IDs.push(data.items[i].id.videoId);
			}
			if (IDs.length == 0){
				return callback(false, IDs);
			}
			else{
				var prevToken = data.prevPageToken;
				var nextToken = data.nextPageToken;
				$.get("https://www.googleapis.com/youtube/v3/videos",{
					"key":"AIzaSyBfXyKOS32phSgIEDNbaJMNQuXAEVVFBac",
					"id":IDs.join(),
					"part":"id,contentDetails,snippet,statistics",
					"fields":"items(id,contentDetails/duration,snippet/title,snippet/channelTitle,statistics/viewCount)"
				}).done(function(data){
					callback(false, data.items,prevToken,nextToken);
				}).fail(function(){
					return callback(true);
				});
			}
		}).fail(function(){
			return callback(true);
		});
	}
	function errorHandler(callback){
		return function(err){
			if (err.status == 0){
				err.responseJSON = {message: "Failed to connect to server. Try again later."}
			}
			callback(err);
		};
	}
};