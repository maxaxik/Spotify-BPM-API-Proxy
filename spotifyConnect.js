const qs = require('qs')
const axios = require('axios')
const request = require('request');

let TokenExpires = 0;
let SpotifyToken;

module.exports = {
	async getSpotifyToken(client_id, client_secret) {
		// If we have a valid token return it
		if (TokenExpires > Date.now()) {
			return SpotifyToken;
		}
		// Else ask Spotify for a token
		const res = await axios.post('https://accounts.spotify.com/api/token', {
			headers: {
				'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
				'Content-Type':'application/x-www-form-urlencoded'
			},
			form: { grant_type : 'client_credentials' }
		})

		TokenExpires = res.data.expires_in * 1000 + Date.now();
		SpotifyToken = res.data.access_token
		// console.log(`New Spotify Token: ${SpotifyToken}`);
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