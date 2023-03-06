import React, { useEffect,useState } from "react";

import io from "socket.io-client";
import Video from "./components/video";
import Videos from "./components/videos";

export default function App() {
    const [localStream, setLocalStream] = useState(null);
    const [, setRemoteStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState([]);
    const [peerConnections, setPeerConnections] = useState({});
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [status, setStatus] = useState("Please wait...");
    const [pcConfig, ] = useState({
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302",
            },
        ],
    });
    const [sdpConstraints, ] = useState({
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true,
        },
    });

    const serviceIP = "localhost:8080/webrtcPeer";
    let socket = null;

    const getLocalStream = () => {
        // called when getUserMedia() successfully returns - see below
        // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
        const success = (stream) => {
            window.localStream = stream;
            // this.localVideoref.current.srcObject = stream
            // this.pc.addStream(stream);

            setLocalStream(stream);

            whoisOnline();
        };

        // called when getUserMedia() fails - see below
        const failure = (e) => {
            console.log("getUserMedia Error: ", e);
        };

        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        // see the above link for more constraint options
        const constraints = {
            // audio: true,
            video: true,
            // video: {
            //   width: 1280,
            //   height: 720
            // },
            // video: {
            //   width: { min: 1280 },
            // }
            options: {
                mirror: true,
            },
        };

        // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(success)
            .catch(failure);
    };

    const whoisOnline = () => {
        // let all peers know I am joining
        sendToPeer("onlinePeers", null, { local: socket.id });
    };

    const sendToPeer = (messageType, payload, socketID) => {
        socket.emit(messageType, {
            socketID,
            payload,
        });
    };

    const createPeerConnection = (socketID, callback) => {
        try {
            let pc = new RTCPeerConnection(pcConfig);

            // add pc to peerConnections object
            // const peerConnections = {
            //     ...peerConnections,
            //     [socketID]: pc,
            // };
            // this.setState({
            //     peerConnections,
            // });

            setPeerConnections(...peerConnections, { [socketID]: pc });

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    sendToPeer("candidate", e.candidate, {
                        local: socket.id,
                        remote: socketID,
                    });
                }
            };

            pc.oniceconnectionstatechange = (e) => {
                // if (pc.iceConnectionState === 'disconnected') {
                //   const remoteStreams = this.state.remoteStreams.filter(stream => stream.id !== socketID)
                //   this.setState({
                //     remoteStream: remoteStreams.length > 0 && remoteStreams[0].stream || null,
                //   })
                // }
            };

            pc.ontrack = (e) => {
                const remoteVideo = {
                    id: socketID,
                    name: socketID,
                    stream: e.streams[0],
                };

                const _remoteStream =
                    remoteStreams.length > 0
                        ? {}
                        : { remoteStream: e.streams[0] };

                let _selectedVideo = remoteStreams.filter(
                    (stream) => stream.id === selectedVideo.id
                );

                _selectedVideo = selectedVideo.length
                    ? {}
                    : { selectedVideo: remoteVideo };

                setSelectedVideo(_selectedVideo);
                setRemoteStream(_remoteStream);
                setRemoteStreams([...remoteStreams, remoteVideo]);
            };

            pc.close = () => {
                // alert('GONE')
            };

            if (localStream) pc.addStream(localStream);

            // return pc
            callback(pc);
        } catch (e) {
            console.log("Something went wrong! pc not created!!", e);
            // return;
            callback(null);
        }
    };

    useEffect(() => {
        socket = io.connect(serviceIP, {
            path: "/io/webrtc",
            query: {},
        });

        socket.on("connection-success", (data) => {
            getLocalStream();

            console.log(data.success);
            const _status =
                data.peerCount > 1
                    ? `Total Connected Peers: ${data.peerCount}`
                    : "Waiting for other peers to connect";

            setStatus(_status);
        });

        socket.on("peer-disconnected", (data) => {
            console.log("peer-disconnected", data);

            const _remoteStreams = remoteStreams.filter(
                (stream) => stream.id !== data.socketID
            );

            const _selectedVideo =
                selectedVideo.id === data.socketID && remoteStreams.length
                    ? { selectedVideo: remoteStreams[0] }
                    : null;

            setRemoteStreams(_remoteStreams);
            setSelectedVideo(_selectedVideo);
        });

        socket.on("online-peer", (socketID) => {
            console.log("connected peers ...", socketID);

            // create and send offer to the peer (data.socketID)
            // 1. Create new pc
            createPeerConnection(socketID, (pc) => {
                // 2. Create Offer
                if (pc)
                    pc.createOffer(sdpConstraints).then((sdp) => {
                        pc.setLocalDescription(sdp);

                        sendToPeer("offer", sdp, {
                            local: socket.id,
                            remote: socketID,
                        });
                    });
            });
        });

        socket.on("offer", (data) => {
            createPeerConnection(data.socketID, (pc) => {
                pc.addStream(localStream);

                pc.setRemoteDescription(
                    new RTCSessionDescription(data.sdp)
                ).then(() => {
                    // 2. Create Answer
                    pc.createAnswer(sdpConstraints).then((sdp) => {
                        pc.setLocalDescription(sdp);

                        sendToPeer("answer", sdp, {
                            local: socket.id,
                            remote: data.socketID,
                        });
                    });
                });
            });
        });

        socket.on("answer", (data) => {
            // get remote's peerConnection
            const pc = peerConnections[data.socketID];
            console.log(data.sdp);
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(
                () => {}
            );
        });

        socket.on("candidate", (data) => {
            // get remote's peerConnection
            const pc = peerConnections[data.socketID];

            if (pc) pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        });
    }, []);

    const switchVideo = (_video) => {
        console.log(_video);
        setSelectedVideo(_video);
    };

    return (
        <div>
            <Video
                videoStyles={{
                    zIndex: 2,
                    position: "absolute",
                    right: 0,
                    width: 200,
                    height: 200,
                    margin: 5,
                    backgroundColor: "black",
                }}
                // ref={localVideoref}
                videoStream={localStream}
                autoPlay
                muted
            ></Video>
            <Video
                videoStyles={{
                    zIndex: 1,
                    position: "fixed",
                    bottom: 0,
                    minWidth: "100%",
                    minHeight: "100%",
                    backgroundColor: "black",
                }}
                // ref={ this.remoteVideoref }
                videoStream={selectedVideo && selectedVideo.stream}
                autoPlay
            ></Video>
            <br />
            <div
                style={{
                    zIndex: 3,
                    position: "absolute",
                    margin: 10,
                    backgroundColor: "#cdc4ff4f",
                    padding: 10,
                    borderRadius: 5,
                }}
            >
                <div style={{ color: "yellow", padding: 5 }}>{status}</div>
            </div>
            <div>
                <Videos
                    switchVideo={switchVideo}
                    remoteStreams={remoteStreams}
                ></Videos>
            </div>
            <br />
        </div>
    );
}
