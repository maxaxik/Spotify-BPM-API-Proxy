const http = require('http')
const axios = require('axios')

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const port = process.env.PORT || 3000; //1025 - 65535

const { getSpotifyToken, getSongs, getSongFeatures } = require('./spotifyConnect')

const server = http.createServer( async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	
	let url = new URL(`a://${req.url}`); // /?q=stuff
	query = url.searchParams.get('q');
	if (!query) {
		// we don't like the input
		res.statusCode = 400;
		res.end('Error: Missing q parameter');
		return;
	}
	try {
		throw err;
		let songInfo = await fetchSongInfo(query);
		responseMsg = formatSongInfo(songInfo);
		res.end(responseMsg);
	} catch (err) {
		res.statusCode = 500;
		console.log(err);
		return;
	}
});

server.listen(port, () => {
	console.log(`Server running at port ${port}`);
});


function formatSongInfo(songInfo) {
	let returnString = "";
	songInfo.forEach(song => {
		returnString += `${song.name}\n${song.bpm}\n`
	});
	return returnString;
}

async function fetchSongInfo(query) {
	// get a Bearer token from Spotify, reuse the one we have if we do
	token = await getSpotifyToken(client_id, client_secret);

	// query Spotify with the string to find the appropriate song
	let songs = await getSongs(query, token);
	
	// Format the search results to keep track of which song is which
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/search
	// [ {id:"", name:"", bpm:42},{id:"", name:"", bpm:42},... ]
	// Map( id:{name:"", bpm:42},id:{name:"", bpm:42},... )
	// let songList = [];
	let songMap = new Map();
	songs.tracks.items
		// .forEach(song => songList.push({id: song.id, name: song.name}));
		.forEach(song => songMap.set(song.id, {name: song.name}));
	
	// Format the id list for Audio Features search
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/get-several-audio-features
	// "id,id,id,id,id"
	let IDstring = songs.tracks.items
		.map(song => song.id)
		.join(',');

	let songFeatures = await getSongFeatures(IDstring, token);
	// Combine info from Audio Features search into the song map
	songFeatures.audio_features.forEach(song => {
		const existingSong = songMap.get(song.id);
		existingSong.bpm = song.tempo;
		existingSong.time_signature = song.time_signature;
	});

	return songMap;
}