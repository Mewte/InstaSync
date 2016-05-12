/*
 * Todo: pull out bindings that are for specific pages and put them in their own
 * .js file. Only stuff that fires for every page should be in here.
 */
$(function() {
	$("#register").click(function(){register();});
	var pendingRegistration = false;
	function register(){
		if (pendingRegistration){
			return;
		}
		$("#invalid_register_message").text("");
		$(".register-form .has-error").removeClass("has-error");
		var username = $("#register_username").val();
		var password = $("#register_password").val();
		var confirmPass = $("#register_confirm_password").val();
		var email = $("#register_email").val();
		if (password != confirmPass)
		{
			$("#invalid_register_message").text("Passwords do not match.");
			addError("register_password");
			addError("register_confirm_password");
			return;
		}
		request.register({username: username, password: password, email: email}, function(err,data){
			pendingRegistration = false;
			if (err){
				outputError(err.responseJSON.message);
				if (err.responseJSON.field_name){
					var field = err.responseJSON.field_name;
					if (field == "username"){
						addError("register_username");
					}
					if (field == "password"){
						addError("register_password");
						addError("register_confirm_password");
					}
					if (field == "email"){
						addError("register_email");
					}
				}
			}
			else{
				//register success, refresh page (In the future, login without refresh)
				//window.location = document.URL;
				location.reload();
			}
		});
		function outputError(text){
			$("#invalid_register_message").text(text);
		}
		function addError(field){
			$("#"+field+"_box").addClass("has-error");
		};
	}
	$("#login").click(function(){login();});
	$("#login_inputs").keypress(function(e){
		if (e.which == 13)
			login();
	});
	var pendingLogin = false;
	function login(){
		if (pendingLogin){
			return;
		}
		$("#invalid_login_message").text("");
		$(".login-form .has-error").removeClass("has-error");
		var username = $("#login_username").val();
		var password = $("#login_password").val();
		pendingLogin = true;
		request.login({username: username, password: password}, function(err,data){
			pendingLogin = false;
			if (err || !(data && data.user_id)){ //err is set, or data.user_id is missing. (server returns user on success)
				outputError(err.responseJSON.message);
				if (err.status == 403 || err.status == 422){ //invalid username or password, or bad format
					addError();
				}
			}
			else{
				location.reload();
				//window.location = document.URL;
			}
		});
		function outputError(text){
			$("#invalid_login_message").text(text);
		}
		function addError(){
			$("#login_inputs").addClass("has-error");
		};
	}
	function checklogin(){
		request.checklogin(function(err,data){
			if (err || !(data && data.user_id)){ //err: 403 if not logged in, or user_id not set
				$("#login_dropdown").fadeIn(500);
				$("#register_dropdown").fadeIn(500);
			}
			else{
				$("#logged_in_as").text($.cookie("username"));
				$("#settings_username").text($.cookie("username"));
				$("#my_room_link").attr("href", "/r/"+$.cookie("username"));
				$("#user_dropdown").show();
			}
		});
	}
	checklogin();
	$("#logout").click(function(){
		request.logout(function(){
			location.reload();
			//window.location = document.URL;
		});
		return false;
	});
	$("#forgot_password_modal [data-name='submit']").click(function(){
		var self = $(this);
		var output = $("#forgot_password_modal [data-name='output']");
		var email = $("#forgot_password_modal [data-name='email']");
		var username = $("#forgot_password_modal [data-name='username']");
		output.removeClass();
		output.addClass("text-info");
		output.text("Sending..");
		self.attr("disabled",true);
		request.sendReset(username.val(),email.val(), function(err, response){
			self.attr("disabled",false);
			if (err){
				output.removeClass();
				output.addClass("text-danger");
				output.text(err.responseJSON.message);
			}
			else{
				output.removeClass();
				output.addClass("text-success");
				output.text(response.message);
				email.val("");
				username.val("");
			}
		});
	});
	$('#settings_modal .panel .panel-heading').on("click", function (e) {
		var panel = $(this).parent();
		panel.children(".panel-body").slideToggle();
		if (panel.hasClass("open")){
			panel.removeClass("open");
		}
		else{ //opening
			panel.addClass("open");
			switch(panel.data("id")){
				case "user_info_panel":
					request.checklogin(function (err, data) {
						if (err || !(data && data.user_id)) { //err: 403 if not logged in, or user_id not set

						}
						else {
							$("#settings_modal input[data-id='avatar']").val("http://imgur.com/"+data.avatar);
							$("#settings_modal textarea[data-id='bio']").val(data.bio);
						}
					});
					break;
				case "room_info_panel":
					request.getRoomInfo(function (err, data) {
						if (err) { //err: 403 if not logged in

						}
						else {
							$('#settings_modal input[name=listing]').val([data.listing]);
							$("#settings_modal textarea[data-id='room_description']").val(data.description);
							$("#settings_modal textarea[data-id='room_info']").val(data.info);
						}
					});
					break;
				case "room_mods_panel":
					request.getMods(null,function (err, mods) {
						if (err) { //err: 403 if not logged in, or user_id not set

						}
						else {
							var modList = $("#settings_modal ul[data-id='mod_list']");
							modList.empty();
							for (var i = 0; i < mods.length; i++){
								modList.append($("<li/>",{
									"text":mods[i].username,
									"data":{username:mods[i].username}
								}).append($("<i/>",{class:"fa fa-close remove"})));
							}
							var a = modList.children("li").sort(function (a, b) { //sort mods
								var dataA = $(a).data("username").toLowerCase();
								var dataB = $(b).data("username").toLowerCase();
								if (dataA < dataB) {
									return -1;
								}
								if (dataA > dataB) {
									return 1;
								}
								return 0;
							});
							a.detach().appendTo(modList);
						}
					});
					break;
				default:
					break;
			}
		}
	});
	$('#settings_modal').on("propertychange input textInput", "textarea.max-limit", function (e) {
		var limit = $(this).data("limit");
		var current = $(this).val().length;
		var counter = $($(this).siblings(".character-counter")[0]);
		counter.attr("data-content", current + "/" + limit);
		if (current > limit) {
			counter.addClass("text-danger");
		}
		else {
			counter.removeClass("text-danger");
		}
		$(this).addClass("unsaved");
	});
	$("#settings_modal button[data-id='change_password']").click(function(){
		var self = this;
		var outputEle = $(this).siblings("div[data-type='output']");
		outputEle.removeClass();
		outputEle.text("");
		$(this).parent().children('.has-error').removeClass("has-error");
		var currentEle = $("#settings_modal input[data-id='current_password']");
		var newEle = $("#settings_modal input[data-id='new_password']");
		var confirmEle = $("#settings_modal input[data-id='confirm_new_password']");
		if (newEle.val() != confirmEle.val()){
			outputEle.addClass("text-danger");
			outputEle.text("Passwords do not match. Please try again.");
			newEle.parent().addClass("has-error");
			confirmEle.parent().addClass("has-error");
			return;
		}
		$(this).attr("disabled",true);
		request.changePassword(currentEle.val(),newEle.val(), function(err, response){
			$(self).attr("disabled",false);
			if (err){
				outputEle.addClass("text-danger");
				outputEle.text(err.responseJSON.message);
				if (err.responseJSON.type == "password_mismatch"){
					currentEle.parent().addClass("has-error");
				}
				else if (err.responseJSON.field_name == "new"){
					newEle.parent().addClass("has-error");
					confirmEle.parent().addClass("has-error");
				}
			}
			else{
				outputEle.addClass("text-info");
				outputEle.text("Password change successful.");
				currentEle.val("");
				newEle.val("");
				confirmEle.val("");
			}
		});
	});
	$("#settings_modal button[data-id='update_user']").click(function(){
		var self = this;
		var outputEle = $(this).siblings("div[data-type='output']");
		outputEle.removeClass();
		outputEle.text("");
		outputEle.stop(true,true);
		outputEle.show();
		$(this).parent().children('.has-error').removeClass("has-error");
		var avatarEle = $("#settings_modal input[data-id='avatar']");
		var bioEle = $("#settings_modal textarea[data-id='bio']");
		$(this).attr("disabled",true);
		request.updateUser(avatarEle.val(),bioEle.val(),function(err,response){
			$(self).attr("disabled",false);
			if (err){
				var err = err.responseJSON;
				outputEle.addClass("text-danger");
				outputEle.text(err.message);
				if (err.type == "validation" && err.field_name == "avatar"){
					avatarEle.parent().addClass("has-error");
				}
				outputEle.fadeOut(2500);
			}
			else{
				outputEle.addClass("text-info");
				outputEle.text("User info updated.");
				$(self).parent().find('.unsaved').removeClass("unsaved");
				outputEle.fadeOut(2500);
			}
		});
	});
	$("#settings_modal button[data-id='update_room']").click(function(){
		var self = this;
		var outputEle = $(this).siblings("div[data-type='output']");
		outputEle.removeClass();
		outputEle.text("");
		outputEle.stop(true,true);
		outputEle.show();
		$(this).parent().children('.has-error').removeClass("has-error");
		var listing = $('#settings_modal input[name=listing]:checked').val();
		var descEle = $("#settings_modal textarea[data-id='room_description']");
		var infoEle = $("#settings_modal textarea[data-id='room_info']");
		$(this).attr("disabled",true);
		request.updateRoom(listing, descEle.val(),infoEle.val(),function(err,response){
			$(self).attr("disabled",false);
			if (err){
				var err = err.responseJSON;
				outputEle.addClass("text-danger");
				outputEle.text(err.message);
				outputEle.fadeOut(2500);
			}
			else{
				outputEle.addClass("text-info");
				outputEle.text("Room info updated.");
				$(self).parent().find('.unsaved').removeClass("unsaved");
				outputEle.fadeOut(2500);
			}
		});
	});
	$("#settings_modal input[data-id='mod_username']").keypress(function (e) {
		if (e.which == 13)
			$("#settings_modal button[data-id='add_mod']").trigger("click");
	});
	$("#settings_modal button[data-id='add_mod']").click(function(){
		var username = $("#settings_modal input[data-id='mod_username']").val();
		var output = $("#settings_modal div[data-id='room_mods_panel'] .panel-body").children("div[data-type='output']");
		output.removeClass();
		output.text("");
		output.stop(true,true);
		output.show();
		request.addMod(username, function(err,response){
			if (err){
				var err = err.responseJSON;
				output.addClass("text-danger");
				output.text(err.message);
				output.fadeOut(2500);
			}
			else{
				if (response.success == true){
					output.addClass("text-info");
					output.text(username+" added!");
					output.fadeOut(2500);
					$("#settings_modal input[data-id='mod_username']").val("");
					var modList = $("#settings_modal ul[data-id='mod_list']");
					modList.append($("<li/>",{
						"text":username,
						"data":{username:username}
					}).append($("<i/>",{class:"fa fa-close remove"})));
					var a = modList.children("li").sort(function (a, b) { //sort mods
						var dataA = $(a).data("username").toLowerCase();
						var dataB = $(b).data("username").toLowerCase();
						if (dataA < dataB) {
							return -1;
						}
						if (dataA > dataB) {
							return 1;
						}
						return 0;
					});
					a.detach().appendTo(modList);
				}
			}
		});
	});
	$("#settings_modal ul[data-id='mod_list']").on("click", "li .remove", function (e) {
		var self = this;
		if (e.which == 1){
			var username = $(this).parent().data("username");
			var output = $("#settings_modal div[data-id='room_mods_panel'] .panel-body").children("div[data-type='output']");
			output.removeClass();
			output.text("");
			output.stop(true,true);
			output.show();
			request.removeMod(username,function(err,response){
				if (err) {
					var err = err.responseJSON;
					output.addClass("text-danger");
					output.text(err.message);
					output.fadeOut(2500);
				}
				else{
					if (response.success == true){
						output.addClass("text-info");
						output.text(username + " removed!");
						output.fadeOut(2500);
						$(self).parent().remove();
					}
				}
			});
		}
	});
	buildRoomList(0,"random"); //build the front page on page load
	$("#sort_by").change(function(){
		buildRoomList(0,$("#sort_by").val());
	});
	$("#roomlist_pagination_pages").on("click",".page",function(e){
		buildRoomList($(this).data('page'),$("#sort_by").val());
	});
	function buildPagination(currentPage,total,limit){
		$("#roomlist_pagination_pages").empty();
		var outputArray = [];
		var numPages = Math.ceil(total / limit);
		for (var i = 0; i < numPages; i++){
			outputArray.push($("<li/>",{
				class: currentPage == i ? "page active" : "page",
				data:{
					page:i
				},
				html:$("<a/>",{
					href:"javascript:void(0)",
					text: i+1,
				})
			}));
		}
		$("#roomlist_pagination_pages").append(outputArray);
	};
	function buildRoomList(page,sortBy){
		$("#room_list").empty();
		$("#room_list_loading").show();
		request.roomList(page, sortBy,function(err,data){
			if (err){

			}
			else{
				$("#room_list_loading").hide();
				var roomsArray = [];
				for (var i = 0; i < data.rooms.length; i++){
					var room = data.rooms[i];
					var roomEle = $("<div/>",{
						class:"col-lg-2 col-md-3 col-sm-4 col-xs-6 clean-break room"
					}).append([
						$("<div/>",{
							class:"room-thumbnail",
							html:$("<a/>",{
									href:"/r/"+room.room_name
								}).append($("<img>",{
									class:"img-responsive",
									css: {
										width:"100%",
										height:"100%"
									},
									src:room.thumbnail
								}))
						}),
						$("<div/>",{
							class:"title",
							html:$("<a/>",{
								href:"/r/"+room.room_name,
								text:room.title.substring(0,64)
							})
						}),
						$("<div/>",{
							class:"room-name",
							html:$("<a/>",{
								href:"/r/"+room.room_name,
								html:$("<strong/>",{
									text:room.room_name
								})
							})
						}).prepend("in "),
						$("<div/>",{
							class:"watching",
							html:$("<strong/>",{
								text:room.users
							})
						}).append(" watching")
					]);
					roomsArray.push(roomEle);
				}
				$("#room_list").append(roomsArray);
				buildPagination(page,data.total,data.limit);
				$("#users_online").text(data.stats.users)
				$("#rooms_online").text(data.stats.rooms);
			}
		});
	}
});