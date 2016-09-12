var epub = require('quick-epub');
var express = require("express");
// Required for express post requests
var bodyParser = require("body-parser");
var app = express();

app.use(express.static('books'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.post("/epubify", function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	console.log("Creating book with: " + req.body.title);
	//console.dir(req.body)
	var data = {
		lang: 'engrish',
		title: req.body.title,
		author: ['unknown'],
		publisher: 'Fanfiction.net',
		description: 'Ebook generated by Daniel Vest�l',
		contents: req.body.contents,
		dates: {
			published: new Date().toISOString().split('.')[0]+ 'Z',
			modified: new Date().toISOString().split('.')[0]+ 'Z'
		},
		appendChapterTitles: true,
		output: "books/" + req.body.bookID + ".epub"
	};
	epub.createFile(data).then(function(){
		console.log('book done: ' + req.body.bookID);
		res.send("success");
	}).catch(function(error){
		console.error(error);
		res.send("failure");
	});
	// res.send("success");
});

var server = app.listen(5001, function () {
	console.log("Listening on port %s...", server.address().port);
});
