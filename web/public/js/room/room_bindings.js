/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/
function onReady(room, socket){
	$('#cin')['focus'](function () {
		room.unreadMessages = 0;
		document.title = 'InstaSync - '+ room.roomName + "'s room";
	});
	$("#tabs_chat").click(function(){
		room.unreadTabMessages = 0;
		$("#tabs_chat .unread-msg-count").text("");
		setTimeout(function(){
			var textarea = document.getElementById('chat_messages');
			textarea.scrollTop = textarea.scrollHeight;
		}, 100);
	});
	$("#tabs_polls").click(function(){
		$("#tabs_polls").removeClass("attention");
		if ($(".poll.active").length == 0){
			$("#poll_message").text("No active polls.");
			$("#poll_message").show();
		}
		else if (!room.user.userinfo.loggedin){
			$("#poll_message").text("You must be logged in to vote.");
			$("#poll_message").show();
		}
		else{
			$("#poll_message").hide();
		}
	});
	$("#create_poll_btn_tab,#create_poll_btn_column").click(function(){
		room.poll.showCreateModal();
	});
	//(C) BibbyTube, (C) Faqqq
	//https://github.com/Bibbytube/Instasynch/blob/master/Chat%20Additions/Autoscroll%20Fix/autoscrollFix.js
	$('#chat_messages').on('scroll',function(){
		var scrollHeight = $(this)[0].scrollHeight,
			scrollTop = $(this).scrollTop(),
			height = $(this).height();
		if ((scrollHeight - scrollTop) < height*1.3){
			room.autoscroll = true;
		}else{
			room.autoscroll = false;
		}
	});
	$("#cin").on("keypress", function(e){
		if (e.which == 13){
			if ($(this).val().trim() != ''){
				socket.sendmsg(($(this).val()));
				$(this).val('');
			}
		}
	});
	$('#join_btn').click(function(){
		join();
	});
	$("#join_username").on("keypress", function(e){
		if (e.which == 13)
			join();
	});
	$("#add_video_btn").click(function(){
		var url = $("#add_video_url").val();
		if (url.trim() != '')
		{
			socket.sendcmd('add', {URL: url});
		}
		$('#add_video_url').val('');
	});
	$("#skip_button").click(function(){
		if (room.user.userinfo.loggedin)
			socket.sendcmd('skip');
		else
			room.addMessage({username: ""},"You must be logged in to vote to skip.","errortext");
	});
	function join(){
		var username = $('#join_username').val().trim();
		if (username != '' && username['match'](/^([A-Za-z0-9]|([-_](?![-_]))){1,16}$/) != null)
		{
			for (var i = 0; i < room.userlist.users['length']; i++)
			{
				if (username['toLowerCase']() == room.userlist.users[i]['username']['toLowerCase']())
				{
					alert('Name in use.');
					return false;
				}
			}
			socket.rename(username);
		}
		else
		{
			alert('Input was not a-z, A-Z, 1-16 characters.');
		}
		$('#join_username').val('');
	};
	$("#user_list").on("mousedown","li",showProfileModal);
	$("#chat_messages").on("mousedown",".chat-message .username",showProfileModal);
	function showProfileModal(e){ //reuse code
		if (e.which == 1){ //left click
			var user = null;
			var type = $(this)[0].localName
			if (type == "li") //clicked from userlist
				user = $(this).data("user");
			if (type == "span") //clicked from the chat
				user = $(this).parent().data("user");
			var modal = $('#user_profile_modal');
			var bio = $(".modal-body .bio", modal);
			var avatar = $(".modal-body .avatar img",modal);
			$(".modal-title",modal).text(user.username);
			bio.text("");
			avatar.attr("src","");
			$('#profile_modal_kick').data('id', user.id);
			$('#profile_modal_ban').data('id', user.id);
			$('#profile_modal_toggle_mute').data('ip', user.ip);
			if (room.isMuted(user.ip))
			{
				$("#profile_modal_toggle_mute").text("Unmute");
			}
			else
			{
				$("#profile_modal_toggle_mute").text("Mute");
			}
			if (user.loggedin){
				request.getUser(user.username, function(err, user){
					if (!err){
						avatar.attr("src","http://i.imgur.com/"+user.avatar+".jpg");
						bio.text(user.bio);
					}
				});
			}
			else{
				bio.html("<em class='text-muted'>Not Registered</em>");
			}
			modal.modal('show');
		}
	}
	$("#profile_modal_toggle_mute").click(function(){
		var ip = $(this).data('ip');
		if (room.isMuted(ip)){
			room.unmute(ip);
			$(this).text("Mute");
		}
		else{
			room.mute(ip);
			$(this).text("Unmute")
		}
	});
	$('#profile_modal_ban').click(function () {
		room.sendcmd('ban', {userid: $(this).data('id')});
		$('#user_profile_modal').modal("hide");
	});
	$('#profile_modal_kick').click(function () {
		room.sendcmd('kick', {userid: $(this).data('id')});
		$('#user_profile_modal').modal("hide");
	});
	$("#user_list").on("mouseenter","li",function(e){
		return;
		var thisElement = $(this);
		var profileElement = $("#user_profile");
		thisElement.data('hover', setTimeout(function (){
			profileElement.css('top', thisElement.offset().top - $(".chat").offset().top + 20);
			//reset
			$('#ban').data('id', "");
			$('#kick').data('id', "");
			$('#mute-button').data('ip', "");
			//
			profileElement.show();
		}, 600));
	});
	$("#user_list").on("mouseout","li",function(e){
		return;
		clearTimeout($(this).data('hover'));
		setTimeout(function () {
			if (!room.mouseOverBio) {
				$('#user_profile').hide();
			}
		}, 50);
	});
	$('#user_profile').hover(function () {
		room.mouseOverBio = true;
	}, function () {
		$('#user_profile').hide();
		room.mouseOverBio = false;
	});
	$("#playlist").on("click","li .remove-video",function(e){
		if (e.which == 1){ //left click
			var video = $(this).parent().parent().data("video");
			socket.sendcmd("remove", {info: video.info});
		}
	});
	$("#playlist").on("click","li",function(e){
		if (e.which == 1){ //left click
			var css = $(e.target).attr("class") || "";
			if (e.target === this || css.indexOf("title") > -1 || css.indexOf("pl-video-info") > -1){
				if ($("#playlist").hasClass("noclick")){
					$("#playlist").removeClass("noclick");
				}
				else{
					if (room.user.isLeader)
					{
						socket.sendcmd('play', {info: $(this).data("video").info});
					}
				}
			}
		}
	});
	$("#poll_tab,#poll_column").on("click",".poll.active .poll-options .poll-votes",function(e){
		if (e.which == 1){ //left click
			var option = $(this).data("option");
			if (room.user.userinfo.loggedin)
			{
				socket.sendcmd("poll-vote", {vote: option});
			}
			else
			{
				room.addMessage({username: ""},"You must be logged in to vote on polls.","errortext");
			}
		}
	});
	$("#poll_tab,#poll_column").on("click",".poll.active .poll-controls .poll-end",function(e){
		if (e.which == 1){ //left click
			socket.sendcmd("poll-end");
		}
	});
	$("#poll_tab,#poll_column").on("click",".poll .poll-controls .poll-edit",function(e){
		if (e.which == 1){ //left click
			var poll = $(this).parents(".poll").data('poll');
			var options = [];
			for (var i = 0; i < poll.options.length; i++){ //turn every element from an object to a string
				options.push(poll.options[i].option);
			}
			room.poll.showCreateModal(poll.title, options);
		}
	});
	$("#poll_tab,#poll_column").on("click",".poll .poll-ended .delete-poll",function(e){
		if (e.which == 1){ //left click
			$(this).parents('.poll').remove();
		}
	});
	$("#create_poll_modal").on("click",".remove-option", function(e){ //remove poll option
		if (e.which == 1){ //left click
			$(this).parent().remove();
		}
	});
	$("#create_poll_modal .add-poll-option").click(function(e){ //remove poll option
		room.poll.addPollOption();
	});
	$("#create_poll").click(function(){
		var title = $("#create_poll_title").val();
		if (title.trim() == ""){
			$("#create_poll_title").parent().addClass("has-error");
			return;
		}
		else{
			$("#create_poll_title").parent().removeClass("has-error");
		}
		var optionsEle = $("#create_poll_modal .poll-options input");
		var options = [];
		for (var i = 0; i<optionsEle.length; i++){
			var val = $(optionsEle[i]).val();
			if (val.trim() != "")
				options.push(val)
		}
		socket.sendcmd("poll-create", {title: title, options:options});
		$("#create_poll_modal").modal('hide');
	});
	$("#playlist_lock").click(function(){
		socket.sendcmd('toggleplaylistlock', null);
	});
	$("#tabs_users").click(function(e){
		e.stopPropagation();
		var userlist = $("#user_list");
		if (userlist.css("right") == "0px"){//already visible
			$(this).removeClass("visible");
			userlist.animate({right: "-"+userlist.width()+"px"});
		}
		else{
			$(this).addClass("visible");
			userlist.animate({right: "0px"});
		}
	});
	$("#toggle_leader").click(function(){
		if (!room.user.isLeader)
			socket.sendcmd("lead");
		else
			socket.sendcmd("unlead");
	});
	$("#create_poll_modal .poll-options").sortable({
		"handle":".input-group-addon"
	});
	/*
	 * Player Settings Buttons
	 */
	$('#reload_btn').click(function () {
		room.video.destroy();
		socket.sendcmd('reload');
		room.playerDisabled = false;
	});
	$('#resync_btn').click(function () {
		socket.sendcmd('resynch');
	});
	$("#disable_player").click(function(){
		$("#media").html("");
		room.playerDisabled = true;
	});
	$("#toggle_autosync_box").prop("checked", true);
	$("#toggle_autosync_box").on("change", function(){
		var checked = $(this).is(":checked");
		room.autosync = checked;
		if (checked){
			socket.sendcmd('resynch');
		}
	});
	$("#toggleYTcontrols_box").prop("checked", false);
	$("#toggleYTcontrols_box").click(function(){
		room.showYTcontrols = $(this).is(":checked");
		room.video.destroy();
		room.sendcmd('reload', null);
	});
	$("#shuffle_btn").click(function(){
		socket.sendcmd('shuffle');
	});
	$("#clearchat_btn").click(function(){
		$("#chat_messages").html("");
	});
	$("#toggle_greyname_chat").prop("checked", true);
	$("#toggle_greyname_chat").click(function(){
		room.filterGreyname = !$(this).is(":checked");
	});
	/*
	 * VIDEO SEARCH
	 */
	$("#video_search_text").keypress(function (e) {
		if (e.which == 13) {
			$("#search_videos").data("page", 0);
			room.videoSearch($(this).val(), 0);
		}
	});
	$("#video_search_submit").click(function () {
		$("#search_videos").data("page", 0);
		room.videoSearch($("#video_search_text").val());
	});
	$("#video_search_previous").click(function () {
		var videoSearchEl = $("#search_videos");
		var prevPage = videoSearchEl.data("prevToken");
		room.videoSearch($("#video_search_text").val(), prevPage);
	});
	$("#video_search_next").click(function () {
		var videoSearchEl = $("#search_videos");
		var nextPage = videoSearchEl.data("nextToken");
		room.videoSearch($("#video_search_text").val(), nextPage);
	});
	$("#search_videos").on("click",".add",function(){
		room.sendcmd('add', {URL: "http://youtube.com/v/"+$(this).parent().parent().data("videoID")});
	});
//	$('#playlist').on('dragenter', function (event) {
//		if (event.target === this) {
//			console.log('dragenter');
//		}
//	});
//	$('#playlist').on('dragleave', function (event) {
//		if (event.target === this) {
//			console.log('dragenter');
//		}
//	});
	//------------
	//* dark style stuff
	$("body").addClass("dim"); //permenant dim looks nice
//	if(typeof(Storage) !== "undefined") {
//		var dim = localStorage.getItem("dim");
//		if (dim == 1) {
//			$("#toggle_dim").prop("checked", true);
//			$("body").addClass("dim");
//		}
//		else
//			$("#toggle_dim").prop("checked", false);
//	}
//	else
//		$("#toggle_dim").prop("checked", false);
//	$("#toggle_dim").click(function(){
//		if ($(this).is(":checked")){
//			$("body").addClass("dim");
//			if(typeof(Storage) !== "undefined")
//				localStorage.setItem("dim", "1");
//		}
//		else{
//			$("body").removeClass("dim");
//			if(typeof(Storage) !== "undefined")
//				localStorage.setItem("dim", "0");
//		}
//	});
	//------------
}