var epub = require('quick-epub');
var epubGen = require("epub-gen");
var pdf = require('html-pdf');
var fs = require("fs");
var needle = require("needle");
var cheerio = require("cheerio")
var express = require("express");
// Required for express post requests
var bodyParser = require("body-parser");
var cors = require("cors");

var app = express();

app.use(cors())
app.use(express.static('books'));
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// Prevents timeouts with needle during high concurrency
needle.defaults({ open_timeout: 120 * 000 })

app.post("/epubify", async function (req, res) {
	// res.header("Access-Control-Allow-Origin", "*");
	// res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	// console.log(req.body)
	// ensure validity of requests
	if (req.body.ebookMethod == "links" && !req.body.contents) {
		res.send("failure");
		return false;
	}
	if (!req.body.title) {
		res.send("failure");
		return false;
	}
	console.log(`Creating book with title: ${req.body.title} and method ${req.body.ebookMethod}`);
	if (!req.body.bookID) req.body.bookID = Math.floor(Math.random() * 1000000);
	if (!req.body.data) req.body.data = {}

	// book generation methods
	if (req.body.ebookMethod == "links") {
		// POST {data:{}, title:"", contents:[{title, url, dataSelector}, {title, url, dataSelector}, ..], bookID}
		// RETURNS "success" or "failure"
		// ON "success", send GET to [ip]/[bookID].epub
		var data = {
			language: req.body.data.language || 'en',
			title: req.body.title,
			author: req.body.data.author || req.body.author || ['unknown'],
			publisher: req.body.data.publisher || req.body.publisher || 'Fanfiction/wattpad/ao3 via Danielv123',
			description: req.body.data.description || req.body.description || 'Ebook generated by Danielv123',
			contents: [],
			appendChapterTitles: true,
			output: "books/" + req.body.bookID + ".epub"
		};
		// download books from pages
		let chapters = req.body.contents.length;
		let downloadedChapters = 0;
		for (let ii = 0; ii < req.body.contents.length; ii++) {
			let chapter = req.body.contents[ii];
			new Promise(resolve => {
				needle.get(chapter.url, {
					headers: {
						'Accept-Encoding': 'gzip', // fanfiction.net now defaults to Deflate, which has too many terrible implementations.
					}
				}, function (error, response) {
					if (error) console.log("Error", error)
					// console.log(response)
					if (!error && response.statusCode == 200) {
						var $ = cheerio.load(response.body);
						console.log("Downloaded chapter " + (ii + 1) + `, got ${downloadedChapters + 1} out of ${chapters}`);
						data.contents[ii] = {};
						if (!req.body.contents[ii].dataSelector) {
							data.contents[ii].content = response.body;
						} else {
							data.contents[ii].content = $(chapter.dataSelector).html();
						}
						data.contents[ii].title = chapter.title || "Chapter " + (ii + 1);

						// if we have them all, package ebook
						if (++downloadedChapters == chapters) {
							console.log("All chapters downloaded")
							// patch up for later versions
							data.chapters = data.contents
							delete data.contents
							console.log({ ...data, chapters: ["not logged"] })

							// Process HTML
							data.chapters = data.chapters.map(chapter => {
								chapter.content = htmlTools.removeChapterLinks(chapter.content)
								return chapter
							})


							// Create files
							epub.createFile(data).then(function () {
								console.log('book done: ' + req.body.bookID);
								res.send("success");
							}).catch(function (error) {
								console.error(error);
								res.send("failure");
							});


							["A4", "A5"].forEach(format => {
								console.time("Created PDF in " + format);
								pdf.create(data.chapters.map(x => `<h1>${x.title.toLowerCase().includes("ch") ? x.title : "Chapter " + x.title}</h1><div>${x.content}</div>`).join(), {
									format: format,
									orientation: "portrait",
									border: {
										top: "2cm",            // default is 0, units: mm, cm, in, px
										right: "2cm",
										bottom: "1cm",
										left: "2cm"
									},
									paginationOffset: 1, // Page number offset
									footer: {
										height: "10mm",
										contents: {
											// first: 'Cover page',
											default: '<span style="color: #444; width: 100%; text-align: center;">Page {{page}}</span> of <span>{{pages}}</span>', // fallback value
											// last: 'Last Page'
										}
									},
									timeout: 30 * 60 * 1000,
									resourceTimeout: 2000, // Time to download extra resources
								}).toFile(data.output.replace(".epub", format) + ".pdf", function (err, res) {
									if (err) console.error(err)
									console.log(res)
									console.timeEnd("Created PDF in " + format)
								})
							})

							// HTML
							fs.writeFile(data.output + ".html", data.chapters.map(x => `<h1>${x.title.toLowerCase().includes("ch") ? x.title : "Chapter " + x.title}</h1><div>${x.content}</div>`).join("\r\n"), () => {

							})
						}
						resolve()
					}
				});
			})
			// await sleep(0.1)
		}

	} else {
		// Default to use old method. This to ensure backwards compat.
		var data = {
			title: req.body.title,
			author: ['unknown'],
			description: 'Ebook generated by Danielv123',
			content: req.body.contents.map(chapter => {
				return {
					...chapter,
					data: htmlTools.removeChapterLinks(chapter.data)
				}
			}),
			dates: {
				published: new Date().toISOString().split('.')[0] + 'Z',
				modified: new Date().toISOString().split('.')[0] + 'Z'
			},
			appendChapterTitles: true,
			output: "books/" + req.body.bookID + ".epub"
		};
		data.chapters = data.content.map(x => {
			return {
				...x,
				content: x.data,
			}
		})

		try {
			let result = await new epubGen(data).promise
			console.log(result)
			console.log('book done: ' + req.body.bookID);
			createOtherFormats()
			res.send("success");
		} catch (e) {
			console.error(e)
			res.send("failure");
		}
		function createOtherFormats() {
			["A4", "A5"].forEach(format => {
				console.time("Created PDF in " + format);
				pdf.create(data.chapters.map(x => `<h1>${x.title.toLowerCase().includes("ch") ? x.title : "Chapter " + x.title}</h1><div>${x.content}</div>`).join(), {
					format: format,
					orientation: "portrait",
					border: {
						top: "2cm",            // default is 0, units: mm, cm, in, px
						right: "2cm",
						bottom: "1cm",
						left: "2cm"
					},
					paginationOffset: 1, // Page number offset
					footer: {
						height: "10mm",
						contents: {
							// first: 'Cover page',
							default: '<span style="color: #444; width: 100%; text-align: center;">Page {{page}}</span> of <span>{{pages}}</span>', // fallback value
							// last: 'Last Page'
						}
					},
					timeout: 30 * 60 * 1000,
					resourceTimeout: 2000, // Time to download extra resources
				}).toFile(data.output.replace(".epub", format) + ".pdf", function (err, res) {
					if (err) console.error(err)
					console.log(res)
					console.timeEnd("Created PDF in " + format)
				})
			})

			// HTML
			try {
				fs.writeFile(data.output + ".html", data.chapters.map(x => `<h1>${x.title.toLowerCase().includes("ch") ? x.title : "Chapter " + x.title}</h1><div>${x.content}</div>`).join("\r\n"), () => {

				})
			} catch (e) {
				console.error("writeFile", e)
			}
		}
	}
	// res.send("success");
});

const htmlTools = {
	removeChapterLinks: function (html) {
		let stack = ""
		let keywords = ["next chapter", "previous chapter", "last chapter", "sharedaddy"] // Sharedaddy is a common embedd for social share buttons
		let lowercaseHtml = html.toLowerCase()
		let newHtml = html
		let maxIterations = 0
		fs.writeFileSync("text.html", newHtml)
		// While there are keywords in the text, remove them
		while (keywords.find(x => lowercaseHtml.includes(x)) && ++maxIterations < 1000) {
			let position = lowercaseHtml.indexOf(keywords.find(x => lowercaseHtml.indexOf(x) > -1))
			// console.log("Keyword position", position)
			// Loop backwards to find <a
			let foundTagStart = false
			for (let i = 0; i > -500 && !foundTagStart; i--) {
				if (lowercaseHtml[position + i] === "<") {
					position += i
					foundTagStart = true
					// console.log("Found tagstart at ", position)
				}
			}
			// Loop forwards and find correct >
			let level = 1
			let length = 0
			for (let i = 5; i < 1000 && level > 0; i++) {
				// Found opening tag
				if (lowercaseHtml[position + i] === "<" && lowercaseHtml[position + i + 1] !== "/") level++
				// Found closing tag
				if (lowercaseHtml[position + i] === "<" && lowercaseHtml[position + i + 1] === "/") {
					level--
					if (level === 0) {
						// Find > (finishing part of closing tag)
						for (let o = 0; o < 1000 && length === 0; o++) {
							if (lowercaseHtml[position + i + o] === ">") length = i + ++o
						}
						// console.log("Found taglength at ", length, `(${position + length})`)
					}
				}
			}

			// Remove string from both normal and lowercase html
			// console.log("Removing", newHtml.substr(position, length))
			newHtml = newHtml.substr(0, position) + newHtml.substr(position + length, newHtml.length - length)
			lowercaseHtml = lowercaseHtml.substr(0, position) + lowercaseHtml.substr(position + length, lowercaseHtml.length - length)
		}
		return newHtml
	}
}

sleep = async s => new Promise(r => setTimeout(r, s * 1000))

var server = app.listen(80, function () {
	console.log("Listening on port %s...", server.address().port);
});
