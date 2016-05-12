var express = require('express');
var router = express.Router();
var fs = require('fs');
var instasync = require('instasync');
var helpers = instasync.helpers;
var queries = helpers.queries;
var meta = {
	"index":{title:"Watch videos with friends!"},
	"help":{title:"Help"},
	"dmca":{title:"DMCA"},
	"privacy":{title:"Privacy Policy"},
	"settings":{title:"My Settings"},
	"terms":{title:"Terms of Service"},
	"password_reset":{title: "Reset Password"}
};
//set Content type
router.use(function(req,res,next){
	res.header("Content-Type", "text/html");
	res.header("X-Frame-Options","DENY");
	next();
});
/* GET home page. */
router.get('/', function(req,res,next){
	indexRoute(req,res,next);
});
router.get('/pages/index', function(req, res, next) {
	indexRoute(req,res,next);
});
router.get('/pages/password_reset', function(req,res,next){
	var token = req.query.token || "";
	queries.getReset(token).then(function(reset){
		res.render('pages/password_reset', {
			title: 'InstaSync - '+ meta.password_reset.title,
			valid_token: true,
			token: token
		});
	}).catch(function(err){
		if (err.type = "bad_token"){
			res.status(404).render('pages/password_reset', {
				title: 'InstaSync - '+ meta.password_reset.title,
				valid_token: false
			});
		}
		else
			return next(err);
	});
});
router.get('/pages/:page', function(req, res, next) {
	res.render('pages/'+req.param('page'), {
		title: 'InstaSync - '+ (meta[req.param('page')] && meta[req.param('page')].title)
	}, function(err,html){
		if(err) {
			next(); //continues on to middleware as if this router was never called (should lead to 404)
		} else {
			res.end(html);
		}
	});
});
function indexRoute(req,res,next){
	res.render('pages/index', {
		title: 'InstaSync - '+meta['index'].title,
	}, function(err,html){
		if(err) {
			throw err;
		} else {
			res.end(html);
		}
	});
}
module.exports = router;
