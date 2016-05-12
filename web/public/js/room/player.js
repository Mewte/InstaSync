/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/

function player(containerID){
	var container = $("#"+containerID);
	var self = this;
	//var triggeredByAPI = true; //all calls are assumed to be triggered by the user unless set to false by API action
	this.video = null;
	this.loadedVideo = null;
	if (localStorage.volume === undefined){
		localStorage.volume = 0.1;
	}
	if (localStorage.muted === undefined){
		localStorage.muted = false;
	}

	this.on = {};
	this.on["userSeeked"] = function(){
		console.log("user seeked");
	};
	this.on["userPlayed"] = function(){
		console.log("user played");
	};
	this.on["userPaused"] = function(){
		console.log("user paused");
	};
	this.on['resynchNeeded'] = function(){

	};
	this.trigger = function(event,data){
	};
	var vidContainerShown = false;
	this.play = function(info, time, playing){
		if (info == null){
			return; //aparently an empty playlist still emits the play event with an empty info
		}
		if (!vidContainerShown){
			container.show();
			vidContainerShown = true;
		}
		//triggeredByAPI = false; //to force a resynch
		switch (info.provider){
			case "youtube":
				loadYoutube(info.id, time, playing);
				break;
			case "vimeo":
				var src = "http://vimeo.instasync.com/video.php?id="+info.id+"&type=vimeo&redirect=1";
				var destination = "http://vimeo.com/"+info.id;
				loadMP4(src, time, playing, "/images/icons/vimeo.png",destination);
				break;
			case "dailymotion":
				loadDailymotion(info.id, time, playing);
				break;
			case "twitch":
				loadTwitch(info.channel);
				break;
		}
		self.loadedVideo = info;
	};
	this.resume = function(){
		if (self.video != null){
			//triggeredByAPI = true;
			self.video.play();
			this.on['resynchNeeded']();
		}
	};
	this.pause = function(){
		if (self.video != null){
			//triggeredByAPI = true;
			self.video.pause();
		}

	};
	this.seekTo = function(time){
		if (self.video != null){
			//triggeredByAPI = true;
			self.video.currentTime(time + 0.5);//compensate for buffer time
		}
	};
	this.time = function(){

	};
	this.destroy = function(){
		removePlayer();
	};
	function loadYoutube(id, time, playing){
		var isLeader = room.user.isLeader;
		var showYTcontrols = room.showYTcontrols;
		var src = "http://www.youtube.com/watch?v="+id+"";
		if (self.video === null || self.video.mediaType != "youtube"){
			removePlayer();
			createVideoTag("youtube");
			self.video = videojs("youtube", {
					"techOrder": ["youtube"],
					"src": src,
					"blockClick":isLeader, //temporary
					"forceHTML5":true,
					ytcontrols: showYTcontrols
				}).ready(function(){
					var p = this;
					if (isLeader){ //be sure video.js controls are on if leader
						p.controls(true);
					}
					attachGenericEvents(p);
					this.one('playing', function(){
						p.currentTime(time);
					});
					this.on('play', function(){

					});
					this.on('pause', function(){
						//resynchNeeded = true;
					});
					this.on('playing', function(){

						//todo: add a buffer bool in case were playing after pausing to buffer
						if (p.firstPlay){
							if (localStorage.muted == "true"){ //localStorage stores booleans as strings -_-
								p.muted(true);
							}
							else{
								p.volume(localStorage.volume);
							}

							self.on['resynchNeeded'](); //resynch after loading
							p.firstPlay = false;
						}
					});
					this.on('error', function(event){
						//alert('error');
					});
					this.on('loadstart', function(){
						p.trigger('play');
					});
					this.on('timeupdate', function(){

					});
					this.on('stalled', function(){

					});
					this.on('ready', function(){
						p.volume(localStorage.volume);
					});
					if (playing)
						p.play();
					this.progressTips();
			});
			self.video.logobrand().initialize({
				"image":"/images/icons/youtube.png",
				"destination":src
			});
			self.video.mediaType = "youtube";
		}
		else{
			var hasFocus = $("#cin").is(":focus");
			self.video.src(src);
			self.video.play();
			self.video.logobrand().loadImage("/images/icons/youtube.png");
			self.video.logobrand().setDestination(src);
			if (hasFocus){
				setTimeout(function(){ //fixes chatbox losing focus when vide changes in chrome on OSX
					document.getElementById("cin").focus();
				},0);
			}
		}
		self.video.firstPlay = true;
	}
	function loadDailymotion(id, time, playing){
		var src = "http://www.dailymotion.com/video/"+id+"";
		if (self.video === null || self.video.mediaType != "dailymotion"){
			removePlayer();
			createVideoTag("dailymotion");
			self.video = videojs("dailymotion", {
					"techOrder": ["dailymotion"],
					"src": src
				}).ready(function(){
					var p = this;
					attachGenericEvents(p);
					this.one('playing', function(){
						p.currentTime(time);
					});
					this.on('play', function(){});
					this.on('pause', function(){});
					this.on('playing', function(){
						if (p.firstPlay){
							if (localStorage.muted == "true")//localStorage stores booleans as strings -_-
								p.muted(true);
							else
								p.volume(localStorage.volume);
							self.on['resynchNeeded'](); //resynch after loading
							p.firstPlay = false;
						}
					});
					this.on('error', function(event){});
					this.on('timeupdate', function(){

					});
					this.on('ready', function(){
					});
					p.on('userinactive', function(){
						this.trigger('useractive');
					});
					p.bigPlayButton.hide();
					p.controlBar.show();
					if (playing){
						p.play();
					}
					this.progressTips();
			});
			self.video.logobrand().initialize({
				"image":"/images/icons/dailymotion.png",
				"destination":src
			});
			self.video.mediaType = "dailymotion";
		}
		else{
			self.video.src(src);
			self.video.play();
			self.video.logobrand().loadImage("/images/icons/dailymotion.png");
			self.video.logobrand().setDestination(src);
		}
		self.video.firstPlay = true;
	}
	function loadMP4(src, time, playing, brand, destination){
		if (self.video === null || self.video.mediaType != "mp4"){
			removePlayer();
			createVideoTag("mp4");
			var srcEle = $("<source/>", {
				"src":src,
				"type":"video/mp4"
			});
			$("#mp4").attr("src", src);
			$("#mp4").html(srcEle);
			self.video = videojs("mp4", {
					"techOrder": ["html5","flash"],
					"controls":"true"
				}).ready(function(){
					var p = this;
					attachGenericEvents(p);
					this.one('playing', function(){
						p.currentTime(time);
					});
					this.on('playing', function(){
						if (p.firstPlay){ //resynch after loading
							if (localStorage.muted == "true")//localStorage stores booleans as strings -_-
								p.muted(true);
							else
								p.volume(localStorage.volume);
							self.on['resynchNeeded'](); //resynch after loading
							p.firstPlay = false;
						}
					});
					this.on('pause', function(){

					});
					this.on('error', function(event){
						//alert('error');
					});
					this.on('loadstart', function(){
						p.trigger('play');

					});
					this.on('timeupdate', function(){

					});
					this.on('stalled', function(){

					});
					if (playing)
						p.play();
					this.progressTips();
			});
			self.video.logobrand().initialize({
				"image": brand,
				"destination":destination
			});
			self.video.mediaType = "vimeo";
		}
		else{
			self.video.src(src);
			self.video.play();
			self.video.poster("");
			self.video.logobrand().loadImage(brand);
			self.video.logobrand().setDestination(destination);
		}
		self.video.firstPlay = true;
	}
	function loadTwitch(channel){
		removePlayer();
        var embed = '<object class="twitch-video" width="1280" height="720" type="application/x-shockwave-flash" id="live_embed_player_flash" data="https://www-cdn.jtvnw.net/swflibs/TwitchPlayer.swf?channel=' + channel +'" bgcolor="#000000"><param name="allowFullScreen" value="true" /><param name="allowScriptAccess" value="always" /><param name="allowNetworking" value="all" /><param name="movie" value="http://www.twitch.tv/widgets/live_embed_player.swf" /><param name="wmode" value="opaque" /><param name="flashvars" value="hostname=www.twitch.tv&channel='+channel+'&auto_play=true&start_volume=25" /></object>';
        //var embed = '<iframe class="videoplayer" src="http://www.twitch.tv/embed?channel=rothmaw" height="478" width="800" frameborder="0" scrolling="no"></iframe>';
		$(container).html(embed);
	}
	function createVideoTag(id){
		var video = $("<video/>", {
			"id":id,
			"class":"video-js vjs-default-skin",
			"controls":"",
			"preload":"auto"
		});
		video.attr("width", "100%");
		video.attr("height", "100%");
		$(container).html(video);
	}
	function removePlayer(){
		if (self.video !== null){
			self.video.dispose();
		}
		$(container).empty();
		self.video = null;
		self.loadedVideo = null;
	}
	function attachGenericEvents(video){
		video.controlBar.progressControl.seekBar.on('userSeeked', function(event){
			var time = (Math.round(event.time));
			self.on["userSeeked"](time);
		});
		video.on("volumechange", function(){
			if (!self.video.firstPlay){//first play adjusts volume and triggers this event which resets the volume/muted
				if (video.muted()){
					localStorage.muted = true;
				}
				else{
					localStorage.volume = video.volume();
					localStorage.muted = false;
				}
			}
		});
		video.on("userPlayed", function(){
			self.on["userPlayed"]();
		});
		video.on("userPaused", function(){
			self.on["userPaused"]();
		});
	}
}