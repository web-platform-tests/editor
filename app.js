// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

var fs = require('fs')
var express = require('express')
var session = require('express-session')
var cookieParser = require('cookie-parser')
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

// init the app
var package = JSON.parse(fs.readFileSync('package.json'));
var app = express();

// settings 
// IMPORTANT: use either environment variables or hidden app.config.js to override
// IMPROTANT: any non-default value should never be commited as part of this file
var CFG = {
	// used when a global url is required
	CURRENT_HOST: 'http://localhost:3000',
	// used to connect to the mongo database, you need to start a local one by default
	MONGO_URL: 'mongodb://localhost:27017/editor',
	// how long a user stays logged in by default
	LOGIN_MAX_AGE: 1000*36e00*24*31*6,
	// used to sign login cookies, don't choose too short
	COOKIE_SECRET: 'UNSECURE_DEFAULT_SECRET',
	// default requires http://localhost:3000/ (get your own at https://github.com/settings/applications/new)
	GITHUB_CLIENT_ID: '63cc96eaf4ce8b5e9c42',
	// see above, remember that you want to change these settings 
	GITHUB_CLIENT_SECRET: 'abc8563f29d336c7da691e2d5c27af0d01d1fcde',
}
if(process && process.env) {
	for(var key in CFG) {
		if(CFG.hasOwnProperty(key) && process.env[key]) {
			CFG[key] = process.env[key];
		}
	}
}
if(fs.existsSync("./app.config.js")) {
	Object.assign(CFG, require('./app.config.js'));
}

// detect if we are in test mode
// test mode is designed to boot, connect to the database, then exit in less than 30s
var isTestModeEnabled = !process.argv.every(arg => arg != '--test');
if(isTestModeEnabled) {
	setTimeout(action => console.log('Test took too long') || process.exit(1), 30000);
}

// connect to mongodb
var db = null, tests = null, authors = null;
var asTestWihtoutTags = { id: 1, author: 1, creationDate: 1, title: 1, fileName: 1, filePath: 1, html: 1, css: 1, jsBody: 1, jsHead: 1, watches: 1, watchValues: 1 };
require('mongodb').connect(CFG.MONGO_URL, function (err, new_db) {

	// ensure success
	if(err || !new_db) throw err;

	// get references to the collections we use
	var new_tests = new_db.collection('tests');
	var new_authors = new_db.collection('authors');

	// verrify that the schema is ready
	new_tests.ensureIndex('id', { unique: true })
	new_tests.ensureIndex('tags', { unique: false });
	new_tests.ensureIndex('author', { unique: false });
	new_tests.ensureIndex('creationDate');
	new_tests.ensureIndex({ title:"text", html:"text", css:"text", jsHead:"text", jsBody:"text" });
	new_authors.ensureIndex('username', { unique: true });
	new_authors.ensureIndex('email', { unique: true });

	// make the collections available for use in the server
	db = new_db;
	tests = new_tests;
	authors = new_authors;

	// in test mode this is sufficient
	if(isTestModeEnabled) {
		setTimeout(action => console.log('Test succeeded') || process.exit(0), 1000);
	}

});

// enable signed cookies
app.use(cookieParser(CFG.COOKIE_SECRET));

// enable https by default if the current host is on https
if(CFG.CURRENT_HOST.indexOf('https://') == 0) {
	app.use(function(req, res, next) {
		var isSecureLocally = req.secure;
		var isSecureOnAzure = req.headers['x-arr-ssl'] !== undefined;
		var isSecureOnAmazon = req.headers['x-forwarded-proto'] === 'https';
		if(!isSecureLocally && !isSecureOnAzure && !isSecureOnAmazon) {
			return res.status(308).redirect('https://' + req.hostname + req.url);
		} else {
			return next();
		}
	});
	app.use(function(req, res, next) {
		res.setHeader("Strict-Transport-Security", "max-age=31536000");
		return next();
	});
}

// enable github authentification
passport.serializeUser((user, setCookie) => setCookie(null, JSON.stringify(user)));
passport.deserializeUser((cookie, setUser) => setUser(null, JSON.parse(cookie)));
passport.use('github', new GitHubStrategy(
	{
		clientID: CFG.GITHUB_CLIENT_ID,
		clientSecret:  CFG.GITHUB_CLIENT_SECRET,
		callbackURL: CFG.CURRENT_HOST + '/login/github/end',
		passReqToCallback: true, // req object on auth is passed as first arg
		scope: [ 'user:email' ], // fetches non-public emails as well
	},
	function (req, accessToken, refreshToken, profile, done) {

		// get the user's email address
		var email = profile._json.email;
		if(!email) {
			var emails = profile.emails.filter(a => a.verified);
			if(emails.length) email = emails[0].value;
		}

		// create the user profile
		var user = {
			id: profile.id,
			username: profile.username,
			email: email
		};

		// update the database
		authors.update({ id: user.id }, user, { upsert: true }, then => done(null, user));
	}
));

// setup authentification urls
app.use(session({ secret: CFG.COOKIE_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.get('/login/github/start', passport.authenticate('github'));
app.get('/login/github/end', passport.authenticate('github', { failureRedirect: '/login/error' }), function(req, res) {
	res.status(303);
	res.cookie('user', JSON.stringify(req.user), { signed: true, maxAge: CFG.LOGIN_MAX_AGE })
	res.redirect(303, '/#/local:save');
});

function getConnectedUser(req) {
	var user = req.signedCookies['user'];
	user = user ? JSON.parse(user) : null;
	return user;
}

// setup debug routes
app.get('/package/name', (req, res) => { res.send(package.name); });
app.get('/package/version', (req, res) => { res.send(package.version); });
app.get('/package/description', (req, res) => { res.send(package.description); });

// setup test short urls
app.get("/:testId(^(?!anonymous)[a-z0-9]*[0-9])", (req, res) => { res.redirect("/#/" + req.params.testId); });

// setup test data urls
app.get("/uploads/:testId([a-z0-9]*[0-9]).json", (req, res) => {
	try {

		var id = req.params.testId; console.log(req.params);
		tests.find({ id: id }, asTestWihtoutTags).toArray(function (err, results) {
			if (err || results.length == 0) {
				console.log(err);
				res.status(404).send("Test not found");
			} else {
				res.status(200).send(JSON.stringify(results[0]));
			}
		});

	} catch (ex) {

		console.log(ex.message);
		res.status(500).send("Database error");

	}
});

// setup shortcut for your user page
app.get('/u/', (req, res) => {
	var user = getConnectedUser(req);
	if(user) {
		res.vary('Cookie').redirect(307, "/u/" + user.username + "/");
	} else {
		res.vary('Cookie').redirect(307, "/login/github/start");
	}
});

// setup list-of-testcases by user url
app.get('/u/:username/', (req, res) => {
	tests.find({ author: req.params.username }, asTestWihtoutTags).sort({ creationDate:-1 }).toArray(function (err, results) {
		if(err || results.length == 0) {
			console.error(err);
			res.status(404).send("No result found");
		} else {
			res.status(200).send(JSON.stringify(results))
		}
	})
})

// setup search url
function toSearchTag(word) {
	var tag = word.replace(/\-[0-9]+/gi,' ').replace(/[^-_a-z]+/gi,'').toLowerCase();
	return tag;
}
app.get('/search', (req, res) => {
	var q = ` ${req.query['q']} `;
	var qSegments = q.split(/ --([a-z]+) /g);
	var qBeforeFlags = qSegments[0].split(/\s+/);
	var qTitle = [], qHtml = [], qCss = [], qJs = [], qAuthor = [];
	for(var i = 1; i<qSegments.length; i+=2) {
		switch(qSegments[i]) {
			case 'author': qAuthor = qSegments[i+1].trim().split(/\s+/); break;
			case 'title': qTitle = qSegments[i+1].trim().split(/\s+/); break;
			case 'html': qHtml = qSegments[i+1].trim().split(/\s+/); break;
			case 'css': qCss = qSegments[i+1].trim().split(/\s+/); break;
			case 'js': qJs = qSegments[i+1].trim().split(/\s+/); break;
			default: throw "INVALID INSTRUCTION: " + qSegments[i];
		}
	}

	var tags = [
		...(qBeforeFlags.map(toSearchTag).filter(x=>x)), 
		...(qTitle.map(toSearchTag).filter(x=>x)), 
		...(qHtml.map(toSearchTag).filter(x=>x)), 
		...(qCss.map(toSearchTag).filter(x=>x)), 
		...(qJs.map(toSearchTag).filter(x=>x))
	];

	if(tags.length == 0 && qAuthor.length == 0) {
		res.status(400).send("Only search queries containing indexable words or an author filter are allowed to run");
		return;
	}

	var searchQuery = {};
	if(tags.length > 0) searchQuery.tags = { $all: tags };
	if(qAuthor.length > 0) searchQuery.author = { $in: qAuthor };

	console.log(searchQuery);

	tests.find(searchQuery, asTestWihtoutTags).sort({ creationDate: -1 }).toArray(function(err, results) {
		var results = results ? results.filter(r => {
			if(qTitle.length && !qTitle.every(q => ~r.title.toLowerCase().indexOf(q.toLowerCase()))) return false;
			if(qHtml.length && !qHtml.every(q => ~r.html.toLowerCase().indexOf(q.toLowerCase()))) return false;
			if(qCss.length && !qCss.every(q => ~r.css.toLowerCase().indexOf(q.toLowerCase()))) return false;
			if(qJs.length && !qJs.every(q => ~r.jsBody.toLowerCase().indexOf(q.toLowerCase()) || ~r.jsHead.toLowerCase().indexOf(q.toLowerCase()))) return false;
			if(qBeforeFlags.length && !qBeforeFlags.every(q => ~r.title.toLowerCase().indexOf(q.toLowerCase()) || ~r.html.toLowerCase().indexOf(q.toLowerCase()) || ~r.css.toLowerCase().indexOf(q.toLowerCase()) || ~r.jsBody.toLowerCase().indexOf(q.toLowerCase()) || ~r.jsHead.toLowerCase().indexOf(q.toLowerCase()))) return false;
			return true;
		}) : [];
		if(results.length) {
			var html = results.map(r => `<a target="_top" href="/#/${r.id}">${r.id}: ${convertAnyHTMLIntoTextOnly(r.title)} (${new Date(r.creationDate)})</a><br/>`).join('')
			res.status(200).send(html);
		} else if (err) {
			res.status(500).send(err.message || err);
		} else {
			res.status(200).send("No result found")
		}
	})

	// ================================================================

	function convertAnyHTMLIntoTextOnly(text) {
		let ret = text.split("<").join("&lt;")
		ret = ret.split(">").join("&gt;")
		return ret
	}


	/*//////////////////////////////////////////////////////////
	// OLD CODE ASSUMING TEXT INDEX IS AVAILABLE
	////////////////////////////////////////////////////////////
	var searchText = (qBeforeFlags + ' ' + qTitle + ' ' + qHtml + ' ' + qCss + ' ' + qJs).trim();
	console.log(searchText);
	tests.find({ "$text": { "$search": searchText } }).toArray(function(err,results) {
		var results = results ? results.filter(r => {
			if(qAuthor.length && !~qAuthor.indexOf(r.author.toLowerCase())) return false;
			if(qTitle.length && qTitle.every(qTitle => !~r.title.toLowerCase().indexOf(qTitle.toLowerCase()))) return false;
			if(qHtml.length && !~r.html.toLowerCase().indexOf(qHtml.toLowerCase())) return false;
			if(qCss.length && !~r.css.toLowerCase().indexOf(qCss.toLowerCase())) return false;
			if(qJs.length && !~r.jsBody.toLowerCase().indexOf(qJs.toLowerCase())) return false;
			return true;
		}) : [];
		if(results.length) {
			var html = results.map(r => `<a target="_top" href="/#/${r.id}">${r.id}: ${r.title} (${new Date(r.creationDate)})</a><br/>`).join('')
			res.status(200).send(html);
		} else if (err) {
			res.status(500).send(err.message || err);
		} else {
			res.status(200).send("No result found")
		}
	})*/
});

// delete user's information and update their tests under an anonymous account
app.delete('/delete/u', (req, res) => {
	let user = getConnectedUser(req);
	let anonUsername = getRandomAnonymousUsername();

	console.log(`Deleting user: ${user.username} and assigning anon username: ${anonUsername}`);
	tests.updateMany(
		{ author: user.username },
		{ $set: { author: anonUsername } },
		(err, doc) => {
			if (err != null) {
				console.log(err)
				res.status(500).send("Database error");
				return
			}
			authors.remove({username: user.username}).then(
				onsuccess => { res.status(200).send(anonUsername); },
				onerror   => { res.status(500).send("Database error"); }
			);
		});

	// ================================================================

	function getRandomAnonymousUsername() {
		let randomInt = Math.floor(Math.random() * Math.floor(100000));
		return `anonymous:${randomInt}`
	}
});

// delete the specified test, where only the authenticated user can delete their own tests or for anonymous tests with assigned anonymous id number
app.delete('/delete/t/:testId/:username', (req, res) => {
	if(!req.params.username.startsWith('anonymous:')) {
		let user = getConnectedUser(req);

		if(user == null) {
			console.log(`Forbidden! No one authenticated to delete this test: ${req.params.testId} by ${req.params.username}.`);
			res.status(403).send("Forbidden! You do not have permissions to delete this test.");
			return
		}

		if(req.params.username != user.username) {
			console.log(`Forbidden! ${req.params.username} does not have permissions to delete this test: ${req.params.testId} by ${user.username}.`);
			res.status(403).send("Forbidden! You do not have permissions to delete this test.");
			return
		}

		tests.remove({id: req.params.testId}).then(
			onsuccess => { res.status(200).send(`Deleted test: ${req.params.testId} by ${req.params.username}`); },
			onerror   => { res.status(500).send("Database error"); }
		);
	} else {
		tests.find({ author: req.params.username,  id: req.params.testId }, asTestWihtoutTags).toArray(function (err, results) {
			if(err || results.length == 0) {
				console.log(`Forbidden! ${req.params.username} does not have permissions to delete this test: ${req.params.testId}.`);
				res.status(403).send("Forbidden! You do not have permissions to delete this test.");
				return
			}

			tests.remove({id: req.params.testId}).then(
				onsuccess => { res.status(200).send(`Deleted test: ${req.params.testId} by ${req.params.username}`); },
				onerror   => { res.status(500).send("Database error"); }
			);
		})
	}
});

// enable support for post requests
app.use(function (req, res, next) {
	if (req.method == 'POST') {
		req.text = '';
		req.setEncoding('utf8');
		req.on('data', function (chunk) { req.text += chunk });
		req.on('end', next);
	} else {
		next();
	}
});

// setup testcase upload url
app.post('/new/testcase', (req, res) => {
	
	// check authentication
	var author = getConnectedUser(req);
	if(!author) {
		res.status(401).send("Only connected users are allowed to save tests");
		return;
	}

	// extend the validity of the login cookie
	res.cookie('user', JSON.stringify(author), { signed: true, maxAge: CFG.LOGIN_MAX_AGE })

	// check posted content is not empty
	if (!req.text) {
		res.status(400).send("BadRequest");
		return;
	}

	// parse the request
	var test = null;
	try {

		// checks that the data themselves are not too big
		if(req.text.length > 10000) throw "TEST TOO LONG";

		// parse and sanitize the test case
		test = JSON.parse(req.text);
		test = {
			id: "new",
			author: author.username,
			creationDate: Date.now(),
			title: String(test.title),
			fileName: String(test.fileName),
			filePath: String(test.filePath),
			html: String(test.html),
			css: String(test.css),
			jsBody: String(test.jsBody),
			jsHead: String(test.jsHead),
			watches: test.watches.map(expr => String(expr)),
			watchValues: test.watchValues.map(expr => String(expr)),
			tags: []
		}

		// generate the tags for the test case
		try {
			test.tags = [ 
				... new Set(
					(test.title + '\n' + test.fileName + '\n' + test.filePath + '\n' + test.html + '\n' + test.css + '\n' + test.jsBody + '\n' + test.jsHead).replace(/\-[0-9]+/gi,' ').replace(/[0-9]+/gi,'').toLowerCase().match(/[-_a-z]*[a-z]([-_a-z]*[a-z])?/g)
				)
			].sort();
		} catch (ex) {
			console.warn(ex);
		}
		console.log(test);
		//throw "Disabled";

	} catch (ex) {

		console.warn(ex);
		res.status(400).send("BadRequest");
		return;

	}

	// insert the test in the database
	assignUniqueId().then(test => tests.insertOne(test)).then(
		onsuccess => { res.status(200).send(JSON.stringify({ id: test.id })); },
		onerror   => { res.status(500).send("Database error"); }
	);

	// ================================================================

	function generateNewId() {
		var id = '';
		var idLetters = 'abcdefghijklmnopqrstuvwxyz0123456789';
		var idDigits = '0123456789';
		for (var i = 5; i--;) {
			id += idLetters[Math.floor(Math.random() * idLetters.length)];
		}
		id += idDigits[Math.floor(Math.random() * idDigits.length)]
		return id;
	}

	function assignUniqueId() {
		// TODO: if test.id is already specified, we should reuse the root and find the next valid id
		return new Promise(resolve => {
			test.id = generateNewId();
			tests.find({ id: test.id },{ id:1 }).toArray().then(conflicts => {
				if(conflicts.length == 0) {
					resolve(test);
				} else {
					resolve(assignUniqueId());
				}
			});
		});
	}

});

// serve the website content for all other urls
app.use(express.static('wwwroot'))

// start the server
app.listen(process.env.port || 3000, function () {
	console.log('Web Platform Test Center listening on port '+(process.env.port || 3000)+'!')
})