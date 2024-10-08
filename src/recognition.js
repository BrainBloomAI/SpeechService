const { LiveTranscriptionEvents } = require("@deepgram/sdk");
const { deepgramClient } = require("./deepgramClient");

const recognitionModel = (socket, lang, closeFn, res) => {
	const deepgram = deepgramClient.listen.live({
		language: ["en", "zh-CN", "ms", "ta", "hi"][lang],
		punctuate: true,
		smart_format: true,
		model: lang === 3 ? "enhanced" : "nova-2", // only enhanced has support for tamil

		filler_words: true,

		endpointing: 100,
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

		let emptyTranscriptCount = 0
		let transcriptContentPrior; // store the latest non-empty transcribed content here
		deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
			console.log("deepgram: transcript received!!!!abc\n\t", data.type, data.speech_final, data.channel.alternatives[0].transcript);

			if (data.speech_final && data.channel.alternatives[0].transcript.length >= 1) {
				// end of speech
				if (data.channel.alternatives[0].transcript.length >= 1) {
					emptyTranscriptCount = 0
					transcriptContentPrior = null // reset content

					socket.emit("transcription", {
						type: "end",
						content: data.channel.alternatives[0].transcript,
						duration: data.duration
					});

					closeFn() // call close function
				} else {
					// failed
					socket.emit("transcription-failure")
					closeFn() // close deepgram connection (reset it when user re-initiates mic input)

					emptyTranscriptCount = 0
					transcriptContentPrior = null // reset content
				}
			} else {
				// interim results
				console.log("INTERIM", emptyTranscriptCount)
				if (data.channel.alternatives[0].transcript.length >= 1) {
					// has transcription
					emptyTranscriptCount = 0
					transcriptContentPrior = data.channel.alternatives[0].transcript

					socket.emit("transcription", {
						type: "interim",
						content: data.channel.alternatives[0].transcript,
						duration: data.duration
					});
				} else {
					// empty transcription
					console.log("emptyTranscriptCount", emptyTranscriptCount, transcriptContentPrior)
					if (++emptyTranscriptCount >= 2) {
						// reached treshold, send end event
						if (transcriptContentPrior == null) {
							socket.emit("transcription-failure")
							closeFn()

							emptyTranscriptCount = 0
							transcriptContentPrior = null // reset content
						} else {
							// has prior content saved
							socket.emit("transcription", {
								type: "end",
								content: transcriptContentPrior,
								duration: data.duration
							});

							// reset context
							emptyTranscriptCount = 0
							transcriptContentPrior = null // reset content

							closeFn() // call close function
						}
					}
				}
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