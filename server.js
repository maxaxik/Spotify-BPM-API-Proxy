const http = require('http')
const axios = require('axios')

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const port = process.env.PORT || 3000; //1025 - 65535

const { getSpotifyToken, getSongs, getSongFeatures } = require('./spotifyConnect')

const server = http.createServer( async (req, res) => {
	let time = new Date().toISOString();
	console.log(`New request at [${time}]: ${req.url}`);
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	
	let url = new URL(`a://${req.url}`); // /?q=stuff
	query = url.searchParams.get('q');
	if (!query) {
		// we don't like the input
		res.statusCode = 400;
		console.log(`Request was missing q parameter, rejected`);
		res.end('Error: Missing q parameter');
		return;
	}
	try {
		let songInfo = await fetchSongInfo(query);
		if (!songInfo) {
			res.statusCode = 404;
			console.log(`Search returned no results`);
			res.end(`Search returned no results`);
			return;
		}
		responseMsg = formatSongInfo(songInfo);
		console.log(`Request successful`);
		res.end(responseMsg);
		return;
	} catch (err) {
		res.statusCode = 500;
		console.log(`Request failed`);
		console.log(err);
		res.end(`Request failed`);
		return;
	}
});

server.listen(port, () => {
	console.log(`Server running at port ${port}`);
});


function formatSongInfo(songInfo) {
	let returnString = "";
	songInfo.forEach(song => {
		returnString += `${song.artist} - ${song.name}\n`
		returnString += `bpm:${song.bpm},time_signature:${song.time_signature},danceability:${song.danceability}\n`
	});
	return returnString;
}

async function fetchSongInfo(query) {
	// get a Bearer token from Spotify, reuse the one we have if we do
	token = await getSpotifyToken(client_id, client_secret);

	// query Spotify with the string to find the appropriate song
	let songs = await getSongs(query, token);
	
	// return if we didn't get any results
	if (songs.tracks.total == 0) return; 

	// Format the search results to keep track of which song is which
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/search
	// Map( id:{name:"", bpm:42},id:{name:"", bpm:42},... )
	let songMap = new Map();
	songs.tracks.items
		.forEach(song => songMap.set(song.id, {name: song.name, artist: song.artists[0].name}));
	
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
		existingSong.danceability = song.danceability;
	});

	return songMap;
}