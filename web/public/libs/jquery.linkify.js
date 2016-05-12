
//Not my code. Property of uudashr on github.
//changes made: linkify opens links in new tab.
function linkify(string, buildHashtagUrl, includeW3, target) {
  target = "_blank";
  includeW3 = true;
  string = string.replace(/((http|https|ftp)\:\/\/|\bw{3}\.)[a-z0-9\-\.]+\.[a-z]{2,3}(:[a-z0-9]*)?\/?([a-z0-9\-\._\?\,\'\/\\\+&amp;%\$#\=~])*/gi, function(captured) {
    var uri;
    if (captured.toLowerCase().indexOf("www.") == 0) {
      if (!includeW3) {
        return captured;
      }
      uri = "http://" + captured;
    } else {
      uri = captured;
    }
	/*
	* Block some domains.
	*/
	if (string.toLowerCase().indexOf("strawpoii.me") > -1){
		captured = captured + " <span style='color: red;'>[This URL is a screamer. Click at your own risk.]</span>";
	}
    return "<a href=\"" + uri+ "\" target=\"" + target + "\" title=\"" + uri + "\">" + captured + "</a>";
  });
  
  if (buildHashtagUrl) {
    string = string.replace(/\B#(\w+)/g, "<a href=" + buildHashtagUrl("$1") +" target=\"" + target + "\">#$1</a>");
  }
  return string;
}

(function($) {
  $.fn.linkify = function(opts) {
    return this.each(function() {
      var $this = $(this);
      var buildHashtagUrl;
      var includeW3 = true;
      var target = '_blank';
      if (opts) {
        if (typeof opts  == "function") {
          buildHashtagUrl = opts;
        } else {
          if (typeof opts.hashtagUrlBuilder == "function") {
            buildHashtagUrl = opts.hashtagUrlBuilder;
          }
          if (typeof opts.includeW3 == "boolean") {
            includeW3 = opts.includeW3;
          }
          if (typeof opts.target == "string") {
            target = opts.target;
          }
        }
      }
      $this.html(linkify($this.html(), buildHashtagUrl, includeW3, target));
    });
  }
})(jQuery);