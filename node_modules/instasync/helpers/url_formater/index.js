var url = require('url');
module.exports = {
	removeTrailingSlashes: function(req, res, next) {//todo create module for this
	   if(req.url.substr(-1) == '/' && req.url.length > 1)
		   res.redirect(301, req.url.slice(0, -1));
	   else
		   next();
	},
	noFileExtensions: function(req, res, next) {//todo create module for this
		if(url.parse(req.url).pathname.indexOf('.') > -1){
			next({
				status: 404
			});
		}
		else
		   next();
	}
};