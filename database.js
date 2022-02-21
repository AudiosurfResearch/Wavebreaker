const { Sequelize, DataTypes, Model } = require('sequelize');
const _ = require('lodash');
let dotenv = require('dotenv').config();

var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

function refreshSpotifyToken() {
  spotifyApi.clientCredentialsGrant().then(
    function (data) {
      console.log("Spotify access token: " + data.body['access_token']);
      console.log('The access token expires in ' + data.body['expires_in']);
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function (err) {
      console.log("Failed to obtain Spotify token: " + err)
    }
  );
}
refreshSpotifyToken();
tokenRefreshInterval = setInterval(refreshSpotifyToken, 1000 * 60 * 60);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'audioexpress.sqlite'
});
exports.sequelize = sequelize;

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING
  },
  steamid64: {
    type: DataTypes.INTEGER
  },
  steamid32: {
    type: DataTypes.INTEGER
  },
  locationid: {
    type: DataTypes.INTEGER
  },
  gamepassword: {
    type: DataTypes.STRING
  }
}, {
  // Don't expose game password hash by default
  defaultScope: {
    attributes: {
      exclude: 'gamepassword'
    }
  }
});
exports.User = User;

const Song = sequelize.define('Song', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING
  },
  artist: {
    type: DataTypes.STRING
  },
  fullTitle: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.artist} - ${this.title}`;
    },
    set(value) {
      throw new Error('Do not try to set the `fullTitle` value!');
    }
  },
  spotifyid: {
    type: DataTypes.STRING
  },
  spotifytitle: {
    type: DataTypes.STRING
  },
  spotifyartists: {
    type: DataTypes.TEXT
  },
  coverurl: {
    type: DataTypes.TEXT
  },
  fullSpotifyTitle: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.spotifyartists} - ${this.spotifytitle}`;
    },
    set(value) {
      throw new Error('Do not try to set the `fullTitle` value!');
    }
  }
}, {
  // Other model options go here
});
exports.Song = Song;

const Score = sequelize.define('Score', {
  rideid: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  songid: {
    type: DataTypes.INTEGER
  },
  userid: {
    type: DataTypes.INTEGER
  },
  leagueid: {
    type: DataTypes.INTEGER
  },
  trackshape: {
    type: DataTypes.TEXT
  },
  xstats: {
    type: DataTypes.TEXT
  },
  density: {
    type: DataTypes.INTEGER
  },
  vehicleid: {
    type: DataTypes.INTEGER
  },
  score: {
    type: DataTypes.INTEGER
  },
  ridetime: {
    type: DataTypes.INTEGER
  },
  feats: {
    type: DataTypes.STRING
  },
  songlength: {
    type: DataTypes.INTEGER
  },
  goldthreshold: {
    type: DataTypes.INTEGER
  },
  iss: {
    type: DataTypes.INTEGER
  },
  isj: {
    type: DataTypes.INTEGER
  }
}, {
  // Other model options go here
});
exports.Score = Score;

Song.hasMany(Score, {
  foreignKey: 'songid'
});
Score.belongsTo(Song);

User.hasMany(Score, {
  foreignKey: 'userid'
});
Score.belongsTo(User);

(async function () {
  await User.sync();
  await Song.sync();
  await Score.sync();
})();

/**
 * Attempts getting a song by artist + title and creates it if it doesn't exist
 * @param {string} artist Artist string
 * @param {string} title Title string
 * @returns {Song} The found or newly created Song instance.
 */
function getOrCreateSong(artist, title) {
  var song = await Song.findOne({
    where: {
      [Op.or]: [
        {
          [Op.and]: [
            { artist: artist },
            { title: title }
          ]
        },
        {
          [Op.and]: [
            { spotifyartists: artist },
            { spotifytitle: title }
          ]
        }
      ]
    }
  });

  var apiResult;
  var searchString = artist + " " + title;
  searchString = searchString.Replace("feat.", string.Empty);
  searchString = searchString.Replace("ft.", string.Empty);
  searchString = searchString.Replace("featuring", string.Empty);
  if (song == null) {
    apiResult = await spotifyApi.searchTracks(searchString, { limit: 1, locale: 'en_US' });
    console.log('Search for ' + searchString + ' returned ' + apiResult.body.tracks.total + ' tracks');
  }

  if (song == null) {
    if (apiResult.body.tracks.items[0]) {
      song = await Song.create({
        title: title,
        artist: artist,
        spotifyid: apiResult.body.tracks.items[0].id,
        spotifytitle: apiResult.body.tracks.items[0].name,
        spotifyartists: apiResult.body.tracks.items[0].artists.map(artist => artist.name).join(", "),
        coverurl: apiResult.body.tracks.items[0].album.images[0].url
      });
    }
    else {
      song = await Song.create({
        title: title,
        artist: artist
      });
    }
  }
  return song;
}
exports.getOrCreateSong = getOrCreateSong;

/**
 * Attempts finding a user by their SteamID64
 * @param {any} steamID The user's SteamID64
 * @param {boolean} create Create profile if it doesn't exist?
 * @returns {User} The user result.
 */
function findUserSteam(steamID, create) {
  console.log("OpenID Identifier: " + steamID);
  var user = await User.findOne({
    where: {
      steamid64: parseInt(steamID)
    }
  });

  if (!user && create) {
    var user = await User.create({
      steamid64: parseInt(steamID)
    });
  }
  return user;
}
exports.findUserSteam = findUserSteam;