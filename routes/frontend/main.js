var express = require('express');
var router = express.Router();
var database = require('../../database');

router.get("/", (req, res) => {
	res.svelte('home', {
		globalStores: {
			user: req.user
		}
	});
});

router.get("/song/:id", (req, res) => {
	(async function () {
		var songRaw = await database.Song.findByPk(parseInt(req.params.id), {
			include: [
				{
					model: database.Score,
					order: [['score', 'DESC']],
					include: [database.User], raw: true
				}
			]
		});
		if (songRaw) {
			//why sequelize WHYYYYYYYYYYYYYYY
			songRaw = songRaw.get({ plain: true });
		}

		if (songRaw) {
			console.log(songRaw);
			res.svelte('song', {
				globalStores: {
					user: req.user,
					song: songRaw,
				}
			});
		}
		else {
			res.sendStatus(404);
		}
	})();
});

module.exports = router;