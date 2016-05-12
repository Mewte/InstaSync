var utils = new function() {
	this.secondsToTime = function(num){
		var hours   = Math.floor(num / 3600);
		var minutes = Math.floor((num - (hours * 3600)) / 60);
		var seconds = num - (hours * 3600) - (minutes * 60);

		if (hours   < 10) {hours   = "0"+hours;}
		if (minutes < 10) {minutes = "0"+minutes;}
		if (seconds < 10) {seconds = "0"+seconds;}
		var time = "";
		if (hours != 0){ time+= hours + ':' }
		time += minutes+':'+seconds;
		return time;
	};
	this.commaSeperateNumber = function(val){
	/*
	 * Timothy Perez
	 * http://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery#answer-12947816
	 */
		while (/(\d+)(\d{3})/.test(val.toString())){
		  val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
		}
		return val;
	};
	this.parseYTDuration = function(duration) {
		var matches = duration.match(/[0-9]+[HMS]/g);

		var seconds = 0;

		matches.forEach(function (part) {
			var unit = part.charAt(part.length-1);
			var amount = parseInt(part.slice(0,-1));

			switch (unit) {
				case 'H':
					seconds += amount*60*60;
					break;
				case 'M':
					seconds += amount*60;
					break;
				case 'S':
					seconds += amount;
					break;
				default:
					// noop
			}
		});
		return seconds;
	};
};