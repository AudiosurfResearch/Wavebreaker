const { Sequelize, DataTypes, Model } = require('sequelize');
const _ = require('lodash');

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
    type: DataTypes.STRING,
    allowNull: false
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