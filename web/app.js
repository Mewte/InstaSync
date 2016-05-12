var instasync = require('instasync');
var config = instasync.config;
var helpers = instasync.helpers;
var cloudflare = require('cloudflare-express');
var express = require('express');
var engine = require('ejs-locals');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');
var fs = require('fs');
var app = express();

var db = instasync.db;
var sanitizeHtml = require('sanitize-html');

//Automaticly create styles.css incase it doesnt exist (nessecary for .less parser)
//because we have it gitignored since its generated at runtime.
fs.appendFileSync("./public/css/styles.css", "");

var routes = {
	pages: require('./routes/pages'),
	rooms: require('./routes/rooms'),
	ajax: require('./routes/ajax'),
	legacy: require('./routes/legacy')
};

app.engine('ejs', engine);
app.disable('etag');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cloudflare.restore());
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public'), {once: config.environment != "dev"}));
app.use(express.static(path.join(__dirname, 'public'), {maxAge: 18000000}));

app.use(helpers.url_formater.removeTrailingSlashes);
app.use(helpers.url_formater.noFileExtensions);

app.use(function(req,res,next){ //remove after converting to helpers.queries
	req.db = db;
	next();
});
app.use(function(req,res,next){ //domain access only
	var host = req.headers.host;
	var hostname = ( req.headers.host.match(/:/g) ) ? req.headers.host.slice( 0, req.headers.host.indexOf(":") ) : req.headers.host;
	if (hostname == "localhost" || host =="instasync.com" || host == "dev.instasync.com"){
		next();
	}
	else{
		res.status(404).send("Invalid Domain.");
	}
});
app.use('/', routes.legacy); //legacy first (redirect old URLs
app.use('/', routes.pages); //fallback to pages first
app.use('/r/', routes.rooms);
app.use('/rooms/', routes.rooms);
app.use('/ajax/', routes.ajax);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next({
		status: 404
	});
});
var error_handler = function(err, req, res, next){
	var pageTitle = "InstaSync - ";
	var status = err.status || 500;
	if (status == 404){
		err.message = "File not found.";
		err.stack = "URL : "+req.url+" could not be located on this server.";
		pageTitle = "InstaSync - Page not found";
	}
	else if(status = 500){
		pageTitle = "InstaSync - Server Error";
		if (config.environment != "dev"){
			err.message = "A server error has occured. Please try again later.";
			err.stack = "";
		}
	}
	res.status(status);
	err.status = status;
	res.render('error', {
		error: err,
		title: pageTitle
	});
};
app.use(error_handler);

/*
 * helper functions
 */
app.locals.commaSeparateNumber = function(val){
	while (/(\d+)(\d{3})/.test(val.toString())){
		val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
	}
	return val;
};
app.locals.sanitizeRoomInfo = function(dirty){
	return sanitizeHtml(dirty,{
		transformTags: {
			'a': sanitizeHtml.simpleTransform('a', {target: '_blank'}),
		}
	});
};
module.exports = app;