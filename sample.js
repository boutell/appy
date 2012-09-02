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
    url: 'mongodb://localhost/example'
  },
  ready: function(err, app, db) {
    if (err)
    {
      console.log(err);
      process.exit(1);
    }
    app.get('/', function() {
      res.send('Hi there.');
    });
    appy.listen();
  }
});

