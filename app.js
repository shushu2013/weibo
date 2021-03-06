var express = require('express');
var path = require('path');
var routes = require('./routes/index');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var logger = require('morgan');
var fs = require('fs');
var settings = require('./setting/settings');

var accessLog = fs.createWriteStream('./log/access.log', {flags: 'a'});
var errorLog = fs.createWriteStream('./log/error.log', {flags: 'a'});

var app = module.exports = express();

// disables the "X-Powered-By: Express" HTTP header.
app.disable('x-powered-by');

// view engine setup
app.set('views', path.join(__dirname + '/views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname , 'public')));
app.use(session({
	secret: settings.cookieSecret,
	key: settings.db, //cookie name
	cookie: {maxAge: 1000*60*60*24*30}, // 30days
	saveUninitialized: false, // don't create session until something stored 
    resave: false, //don't save session if unmodified 
	store: new MongoStore({
		url: "mongodb://localhost/microblog",
		db: settings.db,
		host: settings.host,
		port: settings.port
	})
}));
app.use(flash());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// logger
app.use(logger('combined',{stream: accessLog}));


// Test
app.use(function(req, res, next) {
	res.locals.showTests = app.get('env') != 'production' &&
		req.query.test === '1';
	next();
});

// Routes
routes(app);

// 定制 404 页面
app.use(function(req, res) {
 	res.status(404).send('Sorry cant find that!');
});

// 定制 505 页面
app.use(function(err, req, res, next) {
	var meta =  + new Date() + ']' + req.url + '\n';
	errorLog.write(meta + err.stack + '\n');

	res.status(500).send('500 - Server Error');
	next();
});

// 在外部模块调用app.js时，禁用服务器自动启动
if (!module.parent) {
	app.listen(settings.node_dev_port);
	console.log("Express server listening on port " + settings.node_dev_port);
}
