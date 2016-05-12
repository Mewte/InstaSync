var express = require('express');
var router = express.Router();
var fs = require('fs');
var instasync = require('instasync');
var helpers = instasync.helpers;
var queries = helpers.queries;

//set Content type
router.use(function(req,res,next){
	res.header("Content-Type", "text/html");
	res.header("X-Frame-Options","DENY");
	next();
});
router.param('room_name', function(req,res, next, room_name){
	queries.getRoom(room_name).then(function(room){
		if (!room){
			var error = new Error("Room not found.");
			error.status = 404;
			throw error;
		}
		req.room = room;
		return req.db("rooms").where("room_id",'=',room.room_id).increment("visits", 1);
	}).then(function(){
		next();
	}).catch(function(err){
		return next(err);
	});
});
router.get('/:room_name', function(req, res, next) {
	res.render('rooms/index', {
		title: 'InstaSync - '+req.room.room_name+"'s room!",
		room: req.room
	}, function(err,html){ //not sure this is needed
		if(err) {
			next(err);
		} else {
			res.end(html);
		}
	});
});


module.exports = router;
