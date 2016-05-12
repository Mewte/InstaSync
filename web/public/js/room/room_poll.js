/*
    <InstaSync - Watch Videos with friends.>
    Copyright (C) 2015  InstaSync
*/
function poll(room, socket){
	var self = this;
	this.create = function(poll){
		$(".poll.active").removeClass("active");
		var pollEle = $("<div>",{class: "poll active"});
		if (room.user.isMod){ //mod controls
			pollEle.append($("<div>",{
				class:"mod poll-controls",
				html: $("<i>",{class:"fa fa-pencil poll-edit"}).prop('outerHTML') +" "+ $("<i>",{class: "fa fa-close poll-end"}).prop('outerHTML') //ALL THIS JUST TO ADD A SPACE
			}));
		}
		var title = $("<div>",{
			class:"poll-title"
		});
		title.html(linkify(title.text(poll.title).html())); //->text()->html() filters out < > etc.
		pollEle.append(title);
		var pollOptionsEle = $("<div>",{class:"poll-options"});
		for (var i = 0; i < poll.options.length; i++){
			var voteEle = $("<span>",{class:"poll-votes",text:poll.options[i].votes});
			voteEle.data("option",i);
			var textEle = $("<div>",{class:"poll-text"});
			textEle.html(linkify(textEle.text(poll.options[i].option).html()));
			pollOptionsEle.append($("<div>",{class: "poll-option",}).append(voteEle).append(textEle));
		}
		pollEle.append(pollOptionsEle);
		pollEle.append($("<div/>",{
			class: "text-danger poll-ended",
			html:$("<i/>",{class:"fa fa-trash-o delete-poll"})
		}));
		pollEle.data('poll',poll);
		$("#poll_tab").prepend(pollEle);
		$("#poll_column").prepend(pollEle.clone(true));
		if (!$("#tabs_polls").parent().hasClass("active")){ //tab is not selected, so highlight it
			$("#tabs_polls").addClass("attention");
		}
	};
	this.end = function(){
		$(".poll.active").removeClass("active");
	};
	this.addVote = function(option){
		//update tab poll
		var element = $("#poll_tab .poll.active .poll-options .poll-option .poll-votes")[option];
		$(element).text(parseInt($(element).text(), 10) + 1);

		//update column poll
		var element = $("#poll_column .poll.active .poll-options .poll-option .poll-votes")[option];
		$(element).text(parseInt($(element).text(), 10) + 1);
	};
	this.removeVote = function(option){
		//update tab poll
		var element = $("#poll_tab .poll.active .poll-options .poll-option .poll-votes")[option];
		$(element).text(parseInt($(element).text(), 10) - 1);

		//update column poll
		var element = $("#poll_column .poll.active .poll-options .poll-option .poll-votes")[option];
		$(element).text(parseInt($(element).text(), 10) - 1);
	};
	this.showCreateModal = function(title, options){ //create poll dropdown modal logic
		title = title || "";
		options = options || ["",""]; //default is two options
		$("#create_poll_title").val(title);
		$("#create_poll_modal .poll-options .input-group").remove();
		for (var i = 0; i < options.length; i++){
			self.addPollOption(options[i]);
		}
		$('#create_poll_modal').modal('show');
	};
	this.addPollOption = function(text){
		if ($("#create_poll_modal .poll-options .input-group").length < 10){
			var option = $('<div class="input-group input-group-sm"><span class="input-group-addon">Option</span><input type="text" class="form-control"><i class="fa fa-close remove-option"></i></div>');
			$(option).find('input').val(text);
			$("#create_poll_modal .poll-options").append(option);
		}
	};
	return this;
}