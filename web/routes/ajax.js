var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var validator = require('validator');
var crypto = require('crypto');
var moment = require('moment');
var instasync = require('instasync')
var helpers = instasync.helpers;
var queries = helpers.queries;
var email = require("emailjs");
var promise = require("bluebird");
//router.use(function(req,res,next){ //testing only
//	res.set('Access-Control-Allow-Origin',req.headers.origin || req.host);
//	res.set('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');
//	res.set('Access-Control-Allow-Headers', "Content-Type");
//	res.set('Access-Control-Allow-Credentials', "true");
//	next();
//});
router.use(function (req, res, next) {
	res.set('Content-Type', 'application/json');
	var origin = req.headers.origin;
	var host = req.headers.host;
	//if origin is undefined, not cross domain (firefox only), for chrome + safari: make sure host and origin don't equal eachother
	//Note: host only contains domain and port, origin contains http/https
	if (origin != undefined && origin != "http://"+host && origin != "https://"+host){  //check origin i.e. cross domain (the browser sends an origin if it's a cross domain request, which we are blocking)
		var error = new Error("Cross Origin Resource Sharing is not enabled.");
		error.status = 403;
		return next(error);
	}
	else{ //check if user is logged in and set a user object (code reuse is good right?)
		if (!(req.cookies.auth_token && req.cookies.username)){
			req.user = undefined;
			return next();
		}
		else{
			queries.getLoggedInUser(req.cookies.auth_token,req.cookies.username).then(function(user){
				req.user = user;
				return next();
			}).catch(function(err){
				return next(err);
			});
		}
	}
});
router.post('/login', function(req,res,next){
	if (!(req.body.username && req.body.password)){
		var error = new Error("Username and password are both required.");
		error.status = 422;
		return next(error);
	}
	var username = req.body.username;
	username = username.replace(/[^\x00-\x7F]/g, ""); //unicode injection prevention (THIS WILL NEED TO BE DONE ON THE CHAT SERVER AS WELL ZZZ)
	var password = req.body.password;
	queries.login(username, password).then(function(user){
		res.cookie('auth_token', this.user.auth_token, {expires: new Date(Date.now() + 60*60*24*7*52*1000)}); //1000 for milliseconds
		res.cookie('username', username, {expires: new Date(Date.now() + 60*60*24*7*1000)}); //1000 for milliseconds
		res.json(user);
	}).catch(function(err){
		if (err.type == "invalid_credentials"){
			err.status = 403;
			return next(err);
		}
		 return next(err);
	});
});
router.post('/logout', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to access this resource.");
		error.status = 403;
		return next(error);
	}
	else{
		queries.logout(req.user.user_id).then(function(){
			res.cookie('auth_token', "", {expires: new Date(Date.now() - 60*60*24*7*1000)}); //1000 for milliseconds
			res.cookie('username', "", {expires: new Date(Date.now() - 60*60*24*7*1000)}); //1000 for milliseconds
			res.send("");
		}).catch(function(err){
			return next(err);
		});
	}
});
//Todo: turn validation into a seperate function
router.post('/register', function(req,res,next){
	//check if empty
	if (!req.body.username){
		var error = new Error("Username cannot be empty.");
		error.status = 422;
		error.field_name = "username";
		return next(error);
	}
	else if(!req.body.password){
		var error = new Error("Password cannot be empty.");
		error.status = 422;
		error.field_name = "password";
		return next(error);
	}
	else if(!req.body.email){
		var error = new Error("Email address required.");
		error.status = 422;
		error.field = "email";
		return next(error);
	}
	var username = req.body.username;
	var password = req.body.password;
	var email = req.body.email;
	//validate properties
    if(username.match(/^([A-Za-z0-9]|([-_](?![-_]))){3,16}$/) == null){
        var error = new Error("Usernames must be 3-16 characters, A-Z, 1-9, and may include non-repeating hyphens( - ) and underscores( _ ).");
		error.status = 422;
		error.field_name = "username";
        return next(error);
    }
    if(validator.isNumeric(username)){
        var error = new Error("Username must contain at least 1 alpha character.");
		error.status = 422;
		error.field_name = "username";
        return next(error);
    }
	if (password.length < 6){
        var error = new Error("Password must be at least 6 characters.");
		error.status = 422;
		error.field_name = "password";
        return next(error);
	}
	if (!validator.isEmail(email)){
        var error = new Error("Email must be a valid email address.");
		error.status = 422;
		error.field_name = "email";
        return next(error);
	}
	//so much validation, yay now we can actually do the registration portions..
	password = crypto.createHash('sha1').update(password).digest('hex');
	var auth_token = crypto.pseudoRandomBytes(20).toString('hex');
	req.db('users').insert({username: username, hashpw: password, email: email, last_login: moment().format("YYYY-MM-DD HH:mm:ss"), registered_ip: req.cf_ip}).bind({}).then(function(inserted_ids){
		this.user_id = inserted_ids[0];
		return req.db('rooms').insert({room_id: this.user_id, room_name: username});
	}).then(function(){
		return req.db('sessions').insert({user_id:this.user_id,cookie: auth_token,username: username});
	}).then(function(){
		res.cookie('auth_token', auth_token, {expires: new Date(Date.now() + 60*60*24*7*52*1000)}); //1000 for milliseconds
		res.cookie('username', username, {expires: new Date(Date.now() + 60*60*24*7*1000)}); //1000 for milliseconds
		res.json({username: username, user_id: this.user_id});
	}).catch(function(err){
		//fix this
		if (err.code == "ER_DUP_ENTRY"){
			var error = new Error("That username is already registered.");
			error.status = 422;
			error.field_name = "username";
			return next(error);
		}
		return next(err);
	});
});
router.get('/me/user_info', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	else
		res.json(req.user);
});
router.get('/me/room_info', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	else{
		queries.getRoom(req.user.username).then(function(room){
			res.json(room);
		}).catch(function(err){
			next(err);
		});
	}
});
router.get('/me/mods', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	else{
		queries.getMods(req.user.username).then(function(rows){
			res.json(rows);
		}).catch(function(err){return next(err);});
	}
});
router.post('/me/change_password', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to access this resource.");
		error.status = 403;
		return next(error);
	}
	var currentPass = req.body.current || "";
	var newPass = req.body.new || "";
	if (newPass.length < 6){
        var error = new Error("Password must be at least 6 characters.");
		error.status = 422;
		error.field_name = "new";
		error.type = "validation";
        return next(error);
	}
	queries.changePassword(req.user.user_id,currentPass,newPass).then(function(user){
		res.json(user);
	}).catch(function(err){
		if (err.type = "password_mismatch"){
			err.status = 403;
			return next(err);
		}
		return next(err);
	});
});
router.post('/me/send_reset', function(req,res,next){
	var username = req.body.username || "";
	var email_address = req.body.email || "";
	queries.getResets(req.cf_ip).then(function(resets){
		if (resets.length > 4){
			var error = new Error("Max reset request limit reached. You may try send 5 resets per hour.");
			error.status = 422;
			throw error;
		}
		return queries.createReset(email_address,username, req.cf_ip);
	}).then(function(token){
		if (!token){
			var error = new Error("Invalid email/username combination.")
			error.status = 403;
			throw error;
		}
		else{
			var server  = email.server.connect({user:"",password:"",host:"mail.instasync.com",ssl:false});
			var url = "http://pr.instasync.com/"+token;
			var message = {
				text: "",
				from: "InstaSync <donotreply@instasync.com>",
				to: "<"+email_address+">",
				subject: "Password reset for " + username,
				attachment:
					[
						{data: "<html><p>A password reset was requested for: <strong>"+username+"</strong>.</p><p>You may reset the password for this account by going to: <br/> <a href='"+url+"'>"+url+"</a></p><p><br/><br/><font size='2'><em>If you did not request a password reset, simply ignore this email as no changes to your current account have been made.</em></font></p></html>", alternative: true}
					]
			};
			return new promise(function(fulfill, reject){
				server.send(message, function(err, message){
					if (err){
						reject(err);
					}
					else
						fulfill();
				});
			});
		}
	}).then(function(){
		res.json({message: "An email has been sent to: "+email_address+". If you aren't receiving emails, be sure to check your spam folder and allow emails from 'donotreply@instasync.com'."});
	}).catch(function(err){
		return next(err);
	});
});
router.post('/me/password_reset', function(req,res,next){
	var token = req.body.token || "";
	var newPass = req.body.new || "";
	if (newPass.length < 6){
        var error = new Error("Password must be at least 6 characters.");
		error.status = 422;
		error.field_name = "new";
        return next(error);
	}
	queries.resetPassword(token, newPass).then(function(){
		res.json({err: false, message:"Password change successful. You may now long in with the newly created password."});
	}).catch(function(err){
		if (err.type == "bad_token"){
			err.status = 403;
			return next(err);
		}
		return next(err);
	});
});
router.post('/me/room_info', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to access this resource.");
		error.status = 403;
		return next(error);
	}
	var listing = req.body.listing;
	var description = req.body.description;
	var info = req.body.info;

	var valid_listings = ["public","private"]
	if (listing != undefined && valid_listings.indexOf(listing) < 0){//listing is defined, and doesn't equal valid listings
		var error = new Error("Invalid room listing option.");
		error.status = 422;
		error.field_name = "listing";
		error.type = "validation";
		return next(error);
	}
	queries.updateRoom(req.user.username,listing,description,info).then(function(){
		return queries.getRoom(req.user.username);
	}).then(function(room){
		res.json(room);
	}).catch(function(err){
		next(err);
	});
});
router.post('/me/user_info', function(req,res,next){
	if (!req.user){
		var error = new Error("You must be logged in to access this resource.");
		error.status = 403;
		return next(error);
	}
	var avatar = req.body.avatar;
	var bio = req.body.bio;
	var imgurMatch = /(https?:\/\/)?(www\.)?(i\.)?imgur\.com\/(gallery\/)?([a-zA-Z0-9]+)(\.(jpg|jpeg|png|gif))?/i;
	if (avatar != undefined){
		if (!validator.isURL(avatar,{host_whitelist:["i.imgur.com","www.imgur.com","imgur.com"]})){
			var error = new Error("Only IMGUR URLs are allowed.");
			error.status = 422;
			error.field_name = "avatar";
			error.type = "validation";
			return next(error);
		}
		avatar = avatar.replace(imgurMatch,"$5");
	}
	queries.updateUser(req.user.user_id,avatar,bio).then(function(){
		return queries.getUser(req.user.username);
	}).then(function(user){
		res.json(user);
	}).catch(function(err){
		next(err);
	});
});
router.get('/user/:username', function(req,res,next){
	var username = req.param('username');
	queries.getUser(username).then(function(user){
		if (!user){
			var error = new Error("User not found.");
			error.status = 404;
			throw error;
		}
		res.json(user);
	}).catch(function(err){return next(err);});
});
router.get('/rooms', function(req,res,next){
	var page = req.query.page;
	var limit = 24;
	if (!(!isNaN(parseFloat(page)) && isFinite(page))){
		page = 0;
	}
	switch (req.query.sortBy){
		case "random":
			var promise = req.db.select(req.db.raw("room.room_id,room.room_name,room.thumbnail,room.visits,room.title,room.users, least(room.users, 30) * rand() as result FROM rooms as room"))
					.where(req.db.raw("users > 0 and listing = 'public' and title <> 'No Videos' and (NSFW = 0 or NSFW = 1)"))
					.orderBy("result","desc")
					.limit(limit)
					.offset(limit * page);
			break;
		case "users":
			var promise = req.db.select(['room_id','room_name','thumbnail','visits','title','users']).from('rooms')
					.where(req.db.raw("users > 0 and listing = 'public' and title <> 'No Videos' and (NSFW = 0 or NSFW = 1)"))
					.orderBy("users","desc")
					.limit(limit)
					.offset(limit * page);
			break;
		case "visits":
			var promise = req.db.select(['room_id','room_name','thumbnail','visits','title','users']).from('rooms')
					.where(req.db.raw("users > 0 and listing = 'public' and title <> 'No Videos' and (NSFW = 0 or NSFW = 1)"))
					.orderBy("visits","desc")
					.limit(limit)
					.offset(limit * page);
			break;
		default:
			var error = new Error("Invalid sortBy property.");
			error.status = 400;
			return next(error);
	}
	promise.bind({}).then(function(resp) {
		this.rooms = resp; //first element of the array is an array of records I guess
		return [
			req.db.select(req.db.raw("sum(users) as users, count(room_id) as rooms")).from("rooms").where("users",">", 0),
			req.db.select(req.db.raw("count(*) as count")).from("rooms").where(req.db.raw("users > 0 and listing = 'public' and title <> 'No Videos' and (NSFW = 0 or NSFW = 1)"))
		];
	}).spread(function(online_count,num){
			res.json({
				rooms: this.rooms,
				total: num[0].count,
				limit: limit,
				page: page,
				stats:{
					users: online_count[0].users,
					rooms: online_count[0].rooms
				}
			});
	}).catch(function(err){
		next(err);
	});
});
router.get('/room/:room_name', function(req,res,next){
	var room_name = req.param('room_name');
	queries.getRoom(room_name).then(function(room){
		if (!room){
			var error = new Error("Room not found.");
			error.status = 404;
			throw error;
		}
		res.json(room);
	}).catch(function(err){
		return next(err);
	});
});
router.get('/mods/:room_name', function(req,res,next){
	var user = req.user;
	var room = req.param("room_name");
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	if (user.username.toLowerCase() == room.toLowerCase()){ //room owner
		queries.getMods(room).then(function(rows){
			res.json(rows);
		}).catch(function(err){return next(err);});
	}
	else{ //everyone else
		queries.isMod(user.username,room)
		.then(function(isMod){
			if (!isMod){ //not a mod of this room, so deny this resource
				var error = new Error("This resource is for moderators only.");
				error.status = 403;
				throw error;
			}
			return queries.getMods(room);
		})
		.then(function(mods){
			res.json(mods);
		})
		.catch(function(err){
			return next(err);
		});
	}
});
router.post('/mods/add', function(req,res,next){
	var user = req.user;
	var username = req.body.username || "";
	var room = user.username;
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	if (username.toLowerCase() == room.toLowerCase()){
		var error = new Error("You are already a moderator of your own room.");
		error.status = 422;
		return next(error);
	};
	queries.addMod(room,username).then(function(id){
		res.json({success:true});
	}).catch(function(err){
		if (err.errno == 1062){ //duplicate
			var error = new Error("That user is already a moderator.");
			error.status = 422;
			return next(error);
		}
		if (err.errno == 1452){ //foreign key constraint failure
			var error = new Error("Username not found.");
			error.status = 422;
			return next(error);
		}
		else
			return next(err);
	});
});
router.post('/mods/remove', function(req,res,next){
	var user = req.user;
	var username = req.body.username || "";
	var room = user.username;
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	queries.removeMod(room,username).then(function(removed){
		res.json({success:true});
	}).catch(function(err){
		return next(err);
	});
});
router.get('/bans/:room_name', function(req,res,next){
	var user = req.user;
	var room = req.param("room_name");
	if (!req.user){
		var error = new Error("You must be logged in to view this resource.");
		error.status = 403;
		return next(error);
	}
	if (user.username.toLowerCase() == room.toLowerCase()){ //room owner
		queries.getBans(room).then(function(rows){
			res.json(rows);
		}).catch(function(err){return next(err);});
	}
	else{ //everyone else
		queries.isMod(user.username,room)
		.then(function(isMod){
			if (!isMod){ //not a mod of this room, so deny this resource
				var error = new Error("This resource is for moderators only.");
				error.status = 403;
				throw error;
			}
			return queries.getBans(room);
		})
		.then(function(mods){
			res.json(mods);
		})
		.catch(function(err){
			return next(err);
		});
	}
});
router.post('/bans/:room/remove', function(req,res,next){
	//var banId = req.body.ban_id;
});

router.get('/capcha', function(req,res,next){

});
router.use(function (req, res, next) {
	var error = new Error("Resource or method not found.");
	error.status = 404;
	next(error);
});
/*
 * This gets called if no route matches, use this for JSON 404 (instead of the default error handler in app.js
 */
router.use(function (err, req, res, next) {
//err.status = err.status || 500; //insure status property is set, or 500
	var error = jsonFriendlyError(err);
	error.status = err.status || 500;
	error.stack = undefined;
	//error.stack = undefined; //Dont show stack trace, we could for dev, but I'd rather just disable it completely
	if (error.status == 500){
		res.status(500).json({message:"The server encountered an error and was forced to abort the request. Please try again later.", status: 500});
		console.log(err.stack);
		//Todo: Log errors to a database and then return the error_id to the user for reporting
	}
	else
		res.status(error.status).json(error);
	//console.log(error);
});
//Takes a node.js 'error' object and makes it JSONable
//(Trying to JSON an Error object usually results in properties missing.)
//http://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify#answer-20405830
function jsonFriendlyError(err, filter, space) {
	var plainObject = {};
	Object.getOwnPropertyNames(err).forEach(function (key) {
		plainObject[key] = err[key];
	});
	return plainObject;
}
;
module.exports = router;