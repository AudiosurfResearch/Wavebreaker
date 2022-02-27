const { Sequelize, DataTypes, Model, Op } = require('sequelize');
const _ = require('lodash');
let dotenv = require('dotenv').config();

var SpotifyWebApi = require('spotify-web-api-node');
const { result } = require('lodash');
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
    type: DataTypes.STRING
  },
  steamid32: {
    type: DataTypes.INTEGER
  },
  locationid: {
    type: DataTypes.INTEGER
  },
  gamepassword: {
    type: DataTypes.TEXT
  },
  //1 = Regular user
  //2 = Moderator
  //3 = Wavebreaker Team
  accounttype: {
    type: DataTypes.INTEGER
  }
}, {
  // Don't expose game password hash by default
  defaultScope: {
    attributes: {
      exclude: 'gamepassword'
    }
  },
  scopes: {
    initialized: {
      where: {
        username: {
          [Op.ne]: null
        }
      }
    },
    nopassword: {
      attributes: {
        exclude: 'gamepassword'
      }
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
Score.belongsTo(Song, {
  foreignKey: 'songid'
});

User.hasMany(Score, {
  foreignKey: 'userid'
});
Score.belongsTo(User, {
  foreignKey: 'userid'
});

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
module.exports.getOrCreateSong = function (artist, title) {
  var song;
  Song.findOne({
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
  }).then(function (result) {
    song = result;
  });

  var apiResult;
  var searchString = artist + " " + title;
  searchString = searchString.Replace("feat.", string.Empty);
  searchString = searchString.Replace("ft.", string.Empty);
  searchString = searchString.Replace("featuring", string.Empty);
  if (song == null) {
    spotifyApi.searchTracks(searchString, { limit: 1, locale: 'en_US' }).then(function (result) {
      apiResult = result;
    });
    console.log('Search for ' + searchString + ' returned ' + apiResult.body.tracks.total + ' tracks');
  }

  if (song == null) {
    if (apiResult.body.tracks.items[0]) {
      Song.create({
        title: title,
        artist: artist,
        spotifyid: apiResult.body.tracks.items[0].id,
        spotifytitle: apiResult.body.tracks.items[0].name,
        spotifyartists: apiResult.body.tracks.items[0].artists.map(artist => artist.name).join(", "),
        coverurl: apiResult.body.tracks.items[0].album.images[0].url
      }).then(function (result) {
        song = result;
      });
    }
    else {
      Song.create({
        title: title,
        artist: artist
      }).then(function (result) {
        song = result;
      });
    }
  }
  return song;
}

/**
 * Attempts finding a user by their SteamID64
 * @param {any} steamID The user's SteamID64
 * @param {boolean} create Create profile if it doesn't exist
 * @param {boolean} raw Should the resulting object be raw JSON?
 * @returns {User} The user result
 */
module.exports.findUserSteam = function (steamID, create, raw) {
  console.log("OpenID Identifier: " + steamID);
  if (create) {
    return User.findOrCreate({
      where: {
        steamid64: steamID
      },
      defaults: {
        steamid64: steamID,
        steamid32: BigInt(steamID) - 76561197960265728n
      },
      raw: raw
    }).then(function (user) {
      console.log("User created: " + user[0].get({ plain: true }));
      return user[0].get({ plain: true });
    });
  }
  else {
    return User.findOne({
      where: {
        steamid64: steamID
      },
      raw: raw
    }).then(function (user) {
      console.log("User found: " + user.get({ plain: true }));
      return user.get({ plain: true });
    });
  }
}

/**
 * Attempts finding a user by their username
 * @param {string} username Username to search
 * @param {boolean} raw Should the resulting object be raw JSON?
 * @returns {User} The user result
 */
module.exports.findUserByUsername = function (username, raw) {
  return User.findOne({
    where: {
      username: username
    },
    plain: true,
    raw: raw
  });
}

/**
 * Attempts finding a user by their Wavebreaker ID
 * @param {number} id User ID to look up
 * @param {boolean} raw Should the resulting object be raw JSON?
 * @returns {User} The user result
 */
module.exports.findUserById = function (id, raw) {
  return User.findByPk(id, {
    where: {
      username: username
    },
    raw: raw
  });
}

/**
 * @typedef {Object} InitializationResult
 * @property {boolean} success
 * @property {string} message Contains the error message if initialization failed, empty otherwise
 */
/**
 * Initializes an account
 * @param {number} id ID of user to initialize
 * @param {string} username Username to set
 * @returns {Promise<InitializationResult>} The result of the initialization
 */
module.exports.initializeAccount = function (id, username, password, location) {
  return (async function () {
    if (!id || !username || !password || !location || location < 1 || location > 272) {
      return {
        success: false,
        message: "One or more of the arguments were invalid"
      };
    }

    if (username.length > 20) {
      return {
        success: false,
        message: "Username is too long"
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        message: "Password is too short"
      };
    }

    try {
      var user = await User.findOne({
        where: {
          username: username
        },
      });
      if (user) throw new Error("User " + username + " already exists");

      user = await User.unscoped().findByPk(id);
      if (!user) throw new Error("User with ID " + id + " doesn't exist");

      await user.update({
        username: username,
        gamepassword: require('crypto').createHash('md5').update(password).digest("hex"),
        locationid: location,
        accounttype: 1
      });

      return {
        success: true,
        message: ""
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  })();
}