let pc;
let sendChannel;
let receiveChannel;

const signaling = new BroadcastChannel("webrtc");
signaling.onmessage = (e) => {
  console.log("signaling.onmessage", e.data.type);
  switch (e.data.type) {
    case "offer":
      console.log("handleOffer");
      handleOffer(e.data);
      break;
    case "answer":
      console.log("handleAnswer");
      handleAnswer(e.data);
      break;
    case "candidate":
      console.log("handleCandidate");
      handleCandidate(e.data);
      break;
    case "ready":
      console.log("ready");
      // A second tab joined. This tab will enable the start button unless in a call already.
      if (pc) {
        console.log("already in call, ignoring");
        return;
      }
      break;
    case "bye":
      console.log("bye");
      if (pc) {
        hangup();
      }
      break;
    default:
      console.log("unhandled", e);
      break;
  }
};
signaling.postMessage({ type: "ready" });

const startConnection = async () => {
  console.log("startConnection");
  await createPeerConnection();

  const offer = await pc.createOffer();
  signaling.postMessage({ type: "offer", sdp: offer.sdp });
  await pc.setLocalDescription(offer);
};

const endConnection = async () => {
  console.log("endConnection");
  hangup();
  signaling.postMessage({ type: "bye" });
};

async function hangup() {
  console.log("hangup");
  if (pc) {
    pc.close();
    pc = null;
  }
  sendChannel = null;
  receiveChannel = null;
  console.log("Closed peer connections");
}

function createPeerConnection() {
  console.log("createPeerConnection");
  pc = new RTCPeerConnection();

  pc.onerror = (event) => {
    console.error("PeerConnection error:", event);
  };

  pc.onicecandidateerror = (event) => {
    console.error("ICE candidate error:", event);
  };

  pc.onicegatheringstatechange = () => {
    console.log(`ICE gathering state: ${pc.iceGatheringState}`);
  };

  pc.onsignalingstatechange = () => {
    console.log(`Signaling state change: ${pc.signalingState}`);
  };

  // Log state changes
  pc.oniceconnectionstatechange = (e) => {
    console.log(`ICE connection state change: ${pc.iceConnectionState}`, e);
    console.log(`ICE gathering state: ${pc.iceGatheringState}`);
  };

  pc.onconnectionstatechange = (e) => {
    console.log(`Connection state change: ${pc.connectionState}`, e);
    if (pc.connectionState === "connected") {
      console.log("Peer connection established!");
    } else if (pc.connectionState === "failed") {
      console.error("Peer connection failed!");
      // Handle retry or cleanup logic here
    }
  };

  pc.onsignalingstatechange = () => {
    console.log(`Signaling state change: ${pc.signalingState}`);
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("ICE candidate:", e.candidate);
      // Send candidate to remote peer via signaling channel
    } else {
      console.log("ICE candidate gathering complete");
    }
    const message = {
      type: "candidate",
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    signaling.postMessage(message);
    console.log("peer connection signaling", message);
  };

  sendChannel = pc.createDataChannel("sendDataChannel");
  sendChannel.onopen = onSendChannelStateChange;
  sendChannel.onmessage = onSendChannelMessageCallback;
  sendChannel.onclose = onSendChannelStateChange;

  console.log("sendChannel", sendChannel);
}

async function handleOffer(offer) {
  console.log("handleOffer");
  if (pc) {
    console.error("existing peerconnection");
    return;
  }
  await createPeerConnection();
  pc.ondatachannel = receiveChannelCallback;
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  signaling.postMessage({ type: "answer", sdp: answer.sdp });
  await pc.setLocalDescription(answer);
  console.log("set local description", answer);
}

async function handleAnswer(answer) {
  console.log("handleAnswer");
  if (!pc) {
    console.error("no peerconnection");
    return;
  }
  pc.ondatachannel = receiveChannelCallback;
  if (pc.signalingState !== "have-local-offer") {
    console.error("no local offer");
    return;
  }
  await pc.setRemoteDescription(answer);
  console.log("set remote description", answer);
}

async function handleCandidate(candidate) {
  console.log("handleCandidate");
  if (!pc) {
    console.error("no peerconnection");
    return;
  }
  if (!candidate.candidate) {
    try {
      await pc.addIceCandidate(null);
      console.log("added null candidate (end of candidates)");
    } catch (e) {
      console.error("Error adding null candidate:", e);
    }
  } else {
    try {
      await pc.addIceCandidate(candidate);
      console.log("added candidate:", candidate);
    } catch (e) {
      console.error("Error adding candidate:", e);
    }
  }
}

function sendData(data) {
  try {
    if (sendChannel) {
      sendChannel.send(data);
    } else if (receiveChannel) {
      receiveChannel.send(data);
    } else {
      console.log("no send or receive channel");
    }
  } catch (e) {
    console.error("Failure to send, hangup restart:", e);
    hangup();
    startConnection();
  }
}
