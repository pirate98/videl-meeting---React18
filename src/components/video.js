import React,{ useEffect } from "react";

export default function video(props) {
    let video = {};
    useEffect(() => {
        if (props.videoStream) {
            video.srcObject = props.videoStream;
        }
    }, []);

    useEffect(() => {
        console.log("props.videoStream", props.videoStream);
        video.srcObject = props.videoStream;
    }, [props.videoStream]);

    return (
        <div style={{ ...props.frameStyle }}>
            <video
                id={props.id}
                muted={props.muted}
                autoPlay
                style={{ ...props.videoStyles }}
                // ref={ props.videoRef }
                ref={(ref) => {
                    video = ref;
                }}
            ></video>
        </div>
    );
}
