var appy = require(__dirname + '/appy.js');

appy.bootstrap({
  twitter: {
    consumerKey: 'xxxx',
    consumerSecret: 'xxxx',
    callbackURL: 'http://my.example.com:3000/twitter-auth'
  },
  sessionSecret: 'whatever',
  host: 'my.example.com:3000',
  db: {
    url: 'mongodb://localhost/example',
    name: 'example'
  },
  ready: function(app, db) {
    var poster = db.collection('post');
    app.get('/', function(req, res) {
      poster.find().sort({created: -1}).toArray(function(err, posts) {
        res.send(posts.map(function(post) { return post.message; }).join());
      });
    });
    app.get('/new/:message', function(req, res) {
      var post = { 'message': req.params.message, 'createdAt': new Date() };
      poster.insert(post, function(err) {
        res.send('added');
      });
    });
    appy.listen();
  }
});

