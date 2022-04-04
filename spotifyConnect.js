const url = require('url')
const axios = require('axios')

let TokenExpires = 0;
let SpotifyToken;

module.exports = {
	async getSpotifyToken(client_id, client_secret) {
		// If we have a valid token return it
		if (TokenExpires > Date.now()) {
			return SpotifyToken;
		}
		// Else ask Spotify for a token
		const params = new url.URLSearchParams({ 'grant_type': 'client_credentials' });
		const res = await axios.post('https://accounts.spotify.com/api/token', 
			params.toString(),
			{
				headers: {
					'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
					'Content-Type':'application/x-www-form-urlencoded'
				}
			}
		)

		TokenExpires = res.data.expires_in * 1000 + Date.now();
		SpotifyToken = res.data.access_token;
		return SpotifyToken;
	},

	async getSongs(query, token) {
		const res = await axios.get('https://api.spotify.com/v1/search', {
			params: {
				type: 'track',
				q: query
			},
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		return res.data;
	},

	async getSongFeatures(query, token) {
		const res = await axios.get('https://api.spotify.com/v1/audio-features', {
				params: {
					ids: query
				},
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

		return res.data;
	}
}