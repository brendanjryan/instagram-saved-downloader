const fs = require("fs");
const Promise = require("bluebird");
const _ = require("lodash");
const https = require("https");
const config = require("./config.json");
const Client = require("instagram-private-api").V1;

const MEDIA_PAGE_SIZE = 10000;
const DIR = './images';

class Post {
  constructor(id, webLink, caption, urls) {
    this.id = id;
    this.webLink = webLink;
    this.caption = caption;
    this.urls = urls;
  }

  get path() {
    return `${__dirname}/images/${this.id}.jpg`;
  }
}

// parse username and password from config file
const username = config.username;
const password = config.password;

if (!username || !password) {
  console.log("you must provide both a password and a username");
  return;
}

const device = new Client.Device(username);
const storage = new Client.CookieMemoryStorage();

Client.Session
  .create(device, storage, username, password)
  .then(function(session) {
    console.log("fetching saved photos from instagram...");
    // instragam-private-api currently doesn't support paging on saved media.
    // In order to circumvent this we have to fetch an insane number of images
    // upfront.
    return new Client.Feed.SavedMedia(session, MEDIA_PAGE_SIZE).all();
  })
  .then(posts => {
    const postModels = posts.map(post => {
      const webLink = post.params.webLink;
      const caption = post.params.caption;

      const extractImageURLS = imgs => {
        return imgs.map(img => {
          return obj.url;
        });
      };

      const urls = post.params.images.map(img => {
        return img.url;
      });
      return new Post(post.id, webLink, caption, urls);
    });

    return new Promise((resolve, reject) => {
      resolve(postModels);
    });
  })
  .then(posts => {
    return new Promise((resolve, reject) => {
      console.log(`Fetched ${posts.length} saved images...`);
      const newPosts = posts.filter(post => {
        return !fs.existsSync(post.path);
      });

      console.log(`Saving ${newPosts.length} new images`);

      if (!fs.existsSync(DIR)){
        console.log("Creating an /images directory to save your images.")
        fs.mkdirSync(DIR);
      }

      newPosts.forEach(post => {
        // check if the model is full
        if (!(post.urls && post.urls.length && post.urls[0])) {
          return;
        }

        const f = fs.createWriteStream(post.path);
        https.get(post.urls[0], res => {
          res.on("data", chunk => {
            f.write(chunk);
          });
          res.on("end", () => {
            console.log(`File saved at ${post.path}`);
            f.end();
          });
        });
      });

      return new Promise((resolve, reject) => {
        resolve(newPosts);
      });
    });
  })
  .then(posts => {
    console.log(`Saved ${posts.length} Images!`);
  })
  .catch(err => {
    console.log(err);
  });
