require("dotenv").config();

var express = require("express"),
  app = express(),
  schedule = require("node-schedule"),
  request = require("request"),
  Twit = require("twit"),
  config = {
    twitter: {
      consumer_key: process.env.CONSUMER_KEY,
      consumer_secret: process.env.CONSUMER_SECRET,
      access_token: process.env.ACCESS_TOKEN,
      access_token_secret: process.env.ACCESS_TOKEN_SECRET
    }
  },
  T = new Twit(config.twitter);

app.use(express.static("public"));

var listener = app.listen(process.env.PORT, function () {
  console.log("Your bot is running on port " + listener.address().port);
});

// Upload new frame every 2 hours
var job = schedule.scheduleJob("0 */2 * * *", function (fireDate) {
  console.log(`Job Fired at ${fireDate}`)
  update();
});

function update() {
  T.get("statuses/user_timeline", { screen_name: process.env.BOT_SCREEN_NAME }, function (error, data, response) {
    if (!error && response.statusCode == 200) {
      if (data.length < 1) {
        postFrame(1);
      } else {
        var tweet = data[0];
        var lastFrame = parseInt(tweet.text.match(/[0-9]+/)[0]);
        if (lastFrame.toString() == process.env.TOTAL_FRAMES)
          return;
        postFrame(lastFrame + 1);
      }
    }
  });
}

function postFrame(n) {
  console.log(`Requesting Frame ${n}`);
  request.get(`${process.env.ASSETS_ENDPOINT}/assets/frame-${n}.jpg`, { encoding: null }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var img = body.toString("base64");
      console.log("Image Acquired");
      T.post("media/upload", { media_data: img }, function (error, data, response) {
        if (!error && response.statusCode == 200) {
          console.log("Image Uploaded");
          var s = {
            status: `Key Frame ${n} / ${process.env.TOTAL_FRAMES}\n#LizToAoiTori #LizAndTheBlueBird`,
            media_ids: data.media_id_string
          }
          T.post("statuses/update", s, function (error, data, response) {
            if (!error && response.statusCode == 200)
              console.log(`${s.status} posted`);
          });
        }
      });
    }
  });
}