const http = require('http')
const axios = require('axios')

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const port = process.env.PORT || 3000; //1025 - 65535

const { getSpotifyToken, getSongs, getSongFeatures } = require('./spotifyConnect')

const server = http.createServer( async (req, res) => {
	// a request comes in, log current time and req.url
	let time = new Date().toISOString();
	console.log(`New request at [${time}]: ${req.url}`);
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	
	// pull out the query from the q= param
	let url = new URL(`a://${req.url}`); // /?q=stuff
	query = url.searchParams.get('q');

	if (!query) {
		// q param missing, send 400
		res.statusCode = 400;
		console.log('Request was missing q parameter, rejected');
		res.end('Error: Missing q parameter');
		return;
	}
	try {
		let songInfo = await fetchSongInfo(query);
		// if songInfo is empty, we received no results, send 404
		if (!songInfo) {
			res.statusCode = 404;
			console.log('Search returned no results');
			res.end('Search returned no results');
			return;
		}
		// else, format the results nice and send them, send 200
		res.statusCode = 200;
		responseMsg = formatSongInfo(songInfo);
		console.log('Request successful');
		res.end(responseMsg);
		return;
	} catch (err) {
		// catch any error we got during the procees, log it and send 500
		res.statusCode = 500;
		console.log('Request failed');
		console.log(err);
		res.end('Request failed');
		return;
	}
});

server.listen(port, () => {
	console.log(`Server running at port ${port}`);
});


function formatSongInfo(songInfo) {
	// is formatting strings always this messy
	let returnString = '';
	// properties returned from the API that we don't want on the second line
	let dontWant = ['artist', 'name', 'type', 'id', 'uri', 'track_href', 'analysis_url'];
	
	songInfo.forEach(song => {
		returnString += `${song.artist} - ${song.name}\n`
		let featuresList = [];
		for (let songFeature of Object.keys(song)) {
			// skip things from dontWant
			if (dontWant.includes(songFeature)) continue;
			
			// push other things into featuresList
			featuresList.push(`${songFeature}:${song[songFeature]}`);
		}
		returnString += featuresList.join(',')+'\n';
	});
	return returnString;
}

async function fetchSongInfo(query) {
	// get a Bearer token from Spotify, reuse the one we have if it's still valid
	token = await getSpotifyToken(client_id, client_secret);

	// get rid of stuff in parentheses and brackets from the query, as that seems to mess up the search
	query = query.replace(/(\[(.*?)\])|(\((.*?)\))/g, '');

	// query Spotify with the string to find the song
	let songs = await getSongs(query, token);
	
	// return if we didn't get any results
	if (songs.tracks.total == 0) return; 

	// format the search results to keep track of which song is which
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/search
	// Map( id:{name:"", bpm:42},id:{name:"", bpm:42},... )
	let songMap = new Map();
	songs.tracks.items
		.forEach(song => songMap.set(song.id, {name: song.name, artist: song.artists[0].name}));
	
	// format the id list for Audio Features search
	// https://developer.spotify.com/documentation/web-api/reference/#/operations/get-several-audio-features
	// "id,id,id,id,id"
	let IDstring = songs.tracks.items
		.map(song => song.id)
		.join(',');

	let songFeatures = await getSongFeatures(IDstring, token);

	// combine info from Audio Features search into the song Map
	songFeatures.audio_features.forEach(song => {
		let existingSong = songMap.get(song.id);
		existingSong = {...existingSong, ...song};
		songMap.set(song.id, existingSong);
	});

	return songMap;
}