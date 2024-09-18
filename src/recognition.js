const { LiveTranscriptionEvents } = require("@deepgram/sdk");
const { deepgramClient } = require("./deepgramClient");

const recognitionModel = (socket, closeFn, res) => {
	const deepgram = deepgramClient.listen.live({
		language: "en",
		punctuate: true,
		smart_format: true,
		model: "nova-2",

		filler_words: true,

		interim_results: true,
		utterance_end_ms: "1000",
		vad_events: true
	});

	deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
		if (res) {
			// resolve promise on open
			res()
		}
		console.log("deepgram: connected!!", res);

		deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
			console.log("deepgram: transcript received\n\t", data.speech_final, data.channel.alternatives[0].transcript);

			if (data.speech_final) {
				// End of speech
				if (data.channel.alternatives[0].transcript.length >= 1) {
					socket.emit("transcription", {
						type: "end",
						content: data.channel.alternatives[0].transcript,
						duration: data.duration
					});

					closeFn() // call close function
				}
			} else {
				// Interim results
				socket.emit("transcription", {
					type: "interim",
					content: data.channel.alternatives[0].transcript,
					duration: data.duration
				});
			}
		});

		deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
			console.log("deepgram: disconnected");
			deepgram.finish();
		});

		deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
			console.log("deepgram: error received");
			console.error(error);
		});

		deepgram.addListener(LiveTranscriptionEvents.Warning, async (warning) => {
			console.log("deepgram: warning received");
			console.warn(warning);
		});

		deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
			console.log("deepgram: packet received");
			console.log("deepgram: metadata received");
			console.log("ws: metadata sent to client");
		});
	});

	return deepgram;
};

module.exports = {
	recognitionModel
}