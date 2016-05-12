var express = require('express');
var router = express.Router();



/* GET home page. */
router.get('/rooms/:room', function(req,res,next){
	res.redirect('/r/'+req.param('room'));
});

module.exports = router;
