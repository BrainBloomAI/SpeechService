const { LiveTranscriptionEvents } = require("@deepgram/sdk");
const { deepgramClient } = require("./deepgramClient");

const recognitionModel = (socket, lang, closeFn, res) => {
	const deepgram = deepgramClient.listen.live({
		language: ["en", "zh-CN", "ms", "ta", "hi"][lang],
		punctuate: true,
		smart_format: true,
		model: lang === 3 ? "enhanced" : "nova-2", // only enhanced has support for tamil

		encoding: "opus",
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

		let emptyTranscriptCount = 0
		let transcriptContentPrior; // store the latest non-empty transcribed content here
		deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
			console.log("deepgram: transcript received\n\t", data.type, data.speech_final, data.channel.alternatives[0].transcript);

			if (data.speech_final) {
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
					emptyTranscriptCount += 1
					if (emptyTranscriptCount >= 2) {
						// 2 consecutive empty transcripts
						if (transcriptContentPrior) {
							// guaranteed to have content (where transcriptContentPrior.length >= 1); send end event
							socket.emit("transcription", {
								type: "end",
								content: data.channel.alternatives[0].transcript,
								duration: data.duration
							})
						} else {
							// no prior content to go with; have client retry once current deepgram instance is closed
							socket.emit("transcription-failure")
						}
					}

					closeFn()
				}
			} else {
				// interim results
				emptyTranscriptCount = 0
				transcriptContentPrior = data.channel.alternatives[0].transcript

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