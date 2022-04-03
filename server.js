const http = require('http')
const axios = require('axios')
const request = require('request');

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

	let songInfo = await fetchSongInfo(query);
	responseMsg = formatSongInfo(songInfo);
	res.end(responseMsg);
});

server.listen(port, () => {
	console.log(`Server running at port ${port}`);
});


function formatSongInfo(songInfo) {
	let returnString = "";
	// console.log(songInfo);
	songInfo.forEach(song => {
		returnstring += `${song.name}\n${song.bpm}\n`
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
	let songList = [];
	// let songMap = new Map();
	songs.tracks.items
		.forEach(song => songList.append({id: song.id, name: song.name}));
		// .forEach(song => songMap.set(song.id, {name: song.name}));
	
	// Format the id list for Audio Features search
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/get-several-audio-features
	// "id,id,id,id,id"
	let IDstring = songs.tracks.items
		.map(song => song.id)
		.join(',');

	let songFeatures = await getSongFeatures(IDstring);
	// Combine info from Audio Features search into the song map
	songFeatures.audio_features.forEach(song => {
		let thatOne = songList.find(({id}) => id === song.id);
		thatOne.bpm = song.tempo;
		// songMap.set(song.id, {})
		// songMap.get(song.id).set(song.id, {name: song.name, bpm: song.tempo })
	});

	return songList;
}