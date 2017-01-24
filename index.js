var epub = require('quick-epub');
var needle = require("needle");
var cheerio = require("cheerio")
var express = require("express");
// Required for express post requests
var bodyParser = require("body-parser");
var app = express();

app.use(express.static('books'));
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));

app.post("/epubify", function(req, res) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	console.log("Creating book with: " + req.body.title);
	console.log(req.body)
	// ensure validity of requests
	if (!req.body.contents) {
		res.send("failure");
		return false;
	}
	if (!req.body.title) {
		res.send("failure");
		return false;
	}
	if (!req.body.bookID) req.body.bookID = Math.floor(Math.random()*1000000);
	if (!req.body.data) req.body.data = {}
	
	// book generation methods
	if(req.body.ebookMethod == "links") {
		// POST {data:{}, title:"", contents:[{}, {}, ..], bookID}
		// RETURNS "success" or "failure"
		// ON "success", send GET to [ip]/books/[bookID].epub
		// for links mode, req.body.contents = [{url, selector}]
		var data = {
			lang: req.body.data.language || 'engrish',
			title: req.body.title,
			author: req.body.data.author || ['unknown'],
			publisher: req.body.data.publisher || 'Fanfiction/wattpad via Danielv123',
			description: req.body.data.description || 'Ebook generated by Danielv123',
			contents: [],
			dates: {
				published: req.body.data.publishedDate || new Date().toISOString().split('.')[0]+ 'Z',
				modified: req.body.data.modifiedDate || new Date().toISOString().split('.')[0]+ 'Z'
			},
			appendChapterTitles: true,
			output: "books/" + req.body.bookID + ".epub"
		};
		// download books from pages
		let chapters = req.body.contents.length
		for (i=0; i<req.body.contents.length; i++) {
			let ii = i
			needle.get(req.body.contents[ii].url, function(error, response) {
				if (!error && response.statusCode == 200) {
					var $ = cheerio.load(response.body);
					// console.log("Downloaded chapter " + (ii + 1));
					data.contents[ii] = {};
					data.contents[ii].data = $(req.body.contents[ii].dataSelector).html();
					data.contents[ii].title = "Chapter " + (ii + 1);
					
					// check if we have downloaded enough chapters
					let z = 0;
					for(o=0;o<data.contents.length;o++) {
						if (data.contents[o]) {
							z++;
						}
					}
					// if we have them all, package ebook
					if (z == chapters) {
						epub.createFile(data).then(function(){
							console.log('book done: ' + req.body.bookID);
							res.send("success");
						}).catch(function(error){
							console.error(error);
							res.send("failure");
						});
					}
				}
			});
		}
		
	} else {
		// Default to use old method. This to ensure backwards compat.
		var data = {
			lang: 'engrish',
			title: req.body.title,
			author: ['unknown'],
			publisher: 'Fanfiction.net',
			description: 'Ebook generated by Danielv123',
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
	}
	// res.send("success");
});


var server = app.listen(80, function () {
	console.log("Listening on port %s...", server.address().port);
});
