import { UA, WebSocketInterface } from "jssip/lib/JsSIP";
import { RTCSessionEvent } from "jssip/lib/UA";
import { EndEvent, PeerConnectionEvent, IncomingEvent, OutgoingEvent, IceCandidateEvent, RTCSession } from "jssip/lib/RTCSession";

import {
  LitElement,
  html,
  css,
  unsafeCSS
} from "lit";
import { customElement } from "lit/decorators.js";

@customElement('sipjs-card')
class SipJsCard extends LitElement {
    sipPhone: UA | undefined;
    sipPhoneSession: RTCSession | null;
    sipCallOptions: any;
    config: any;
    hass: any;
    renderRoot: any;
    error: any = null;
    callStatus: string = "Idle";
    connected: boolean = false;
    socket?: WebSocketInterface;

    constructor() {
        super();
        this.sipPhoneSession = null;
    }

    static get properties() {
        return {
            hass: {},
            config: {},
            popup: {
                type: Boolean
            },
            timerElement: {},
            currentCamera: {}
        };
    }

    static get styles() {
        return css `
            .wrapper {
                padding: 8px;
                padding-top: 0px;
                padding-bottom: 2px;
            }
            .flex {
                flex: 1;
                margin-top: 6px;
                margin-bottom: 6px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-width: 0;
            }
            .info, .info > * {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .info {
                flex: 1 1 30%;
                cursor: pointer;
                margin-left: 16px;
                margin-right: 8px;
            }
            ha-card {
                cursor: pointer;
            }
            .good {
                color: var(--label-badge-green);
            }
            .warning {
                color: var(--label-badge-yellow);
            }
            .critical {
                color: var(--label-badge-red);
            }
            .icon {
                padding: 0px 18px 0px 8px;
              }
            #phone .content {
                color: white;
            }
            video {
                display: block;
                min-height: 20em;
                height: 100%;
                width: 100%;
            }
            .visualizer-container {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                top: 0;
                display: flex;
                align-items: center;
            }
            .visualizer-bar {
                display: inline-block;
                background: white;
                margin: 0 2px;
                width: 25px;
                min-height: 5px;
            }
            .box {
                /* start paper-font-common-nowrap style */
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                /* end paper-font-common-nowrap style */
                left: 0;
                right: 0;
                bottom: 0;
                background-color: var(
                  --ha-picture-card-background-color,
                  rgba(0, 0, 0, 0.3)
                );
                padding: 4px 8px;
                font-size: 16px;
                line-height: 40px;
                color: var(--ha-picture-card-text-color, white);
                display: flex;
                justify-content: space-between;
                flex-direction: row;
                margin-top: -70px;
                min-height: 62px;
            }
            .box .title {
                font-weight: 500;
                margin-left: 8px;
            }
            .row {
                display: flex;
                flex-direction: row;
            }
            .container {
                transition: filter 0.2s linear 0s;
                width: 80vw;
            }
            .box, ha-icon {
                display: flex;
                align-items: center;
            }
            .accept-btn {
                color: var(--label-badge-green);
            }
            .hangup-btn {
                color: var(--label-badge-red);
            }
            #time, .title {
                margin-right: 8px;
                display: flex;
                align-items: center;
            }
            ha-camera-stream {
                height: auto;
                width: 100%;
                display: block;
            }

            .card-header {
                display: flex;
                justify-content: space-between;
            }

            .mdc-dialog__surface {
                position: relative;
                display: flex;
                flex-direction: column;
                flex-grow: 0;
                flex-shrink: 0;
                box-sizing: border-box;
                max-width: 100%;
                max-height: 100%;
                pointer-events: auto;
                overflow-y: auto;
            }

            .mdc-dialog__container {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-around;
                box-sizing: border-box;
                height: 100%;
                transform: scale(0.8);
                opacity: 0;
                pointer-events: none;
            }

            ha-dialog[data-domain="camera"] {
                --dialog-content-padding: 0;
            }

            ha-dialog[data-domain="camera"] .content, ha-dialog[data-domain="camera"] ha-header-bar {
                width: auto;
            }

            ha-dialog {
                --dialog-surface-position: static;
                --mdc-dialog-max-width: 90vw !important;
                --mdc-dialog-min-width: 400px;
                --mdc-dialog-heading-ink-color: var(--primary-text-color);
                --mdc-dialog-content-ink-color: var(--primary-text-color);
                --justify-action-buttons: space-between;
            }

            #audioVisualizer {
                min-height: 20em;
                height: 100%;
                white-space: nowrap;
                align-items: center;
                display: flex;
                justify-content: center;
            }

            #audioVisualizer div {
                display: inline-block;
                width: 3px;
                height: 100px;
                margin: 0 7px;
                background: currentColor;
                transform: scaleY( .5 );
                opacity: .25;
            }
            ha-header-bar {
                --mdc-theme-on-primary: var(--primary-text-color);
                --mdc-theme-primary: var(--mdc-theme-surface);
                flex-shrink: 0;
                display: block;
            }
            .content {
                outline: none;
                align-self: stretch;
                flex-grow: 1;
                display: flex;
                flex-flow: column;
                background-color: var(--secondary-background-color);
            }
            @media all and (max-width: 450px), all and (max-height: 500px) {
                ha-header-bar {
                    --mdc-theme-primary: var(--app-header-background-color);
                    --mdc-theme-on-primary: var(--app-header-text-color, white);
                    border-bottom: none;
                }
            }

            @media all and (max-width: 600px) {
                .heading {
                    border-bottom: 1px solid var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12))
                }
            }

            .heading {
                border-bottom: 1px solid
                    var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
            }
            :host([large]) ha-dialog[data-domain="camera"] .content,
            :host([large]) ha-header-bar {
                width: 90vw;
            }
            @media (max-width: 450px), (max-height: 500px) {
                ha-dialog {
                    --mdc-dialog-min-width: calc( 100vw - env(safe-area-inset-right) - env(safe-area-inset-left) );
                    --mdc-dialog-max-width: calc( 100vw - env(safe-area-inset-right) - env(safe-area-inset-left) );
                    --mdc-dialog-min-height: 94%;
                    --mdc-dialog-max-height: 94%;
                    --vertial-align-dialog: flex-end;
                    --ha-dialog-border-radius: 0px;
                }
            }

            .header-text {
                -webkit-font-smoothing: antialiased;
                font-family: var(--mdc-typography-headline6-font-family, var(--mdc-typography-font-family, Roboto, sans-serif));
                font-size: var(--mdc-typography-headline6-font-size, 1.25rem);
                line-height: var(--mdc-typography-headline6-line-height, 2rem);
                font-weight: var(--mdc-typography-headline6-font-weight, 500);
                letter-spacing: var(--mdc-typography-headline6-letter-spacing, 0.0125em);
                text-decoration: var(--mdc-typography-headline6-text-decoration, inherit);
                text-transform: var(--mdc-typography-headline6-text-transform, inherit);
                padding-left: 20px;
                padding-right: 0px;
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                z-index: 1;
            }
            
            .popup {
                display: flex;
                flex-wrap: wrap;
                flex-direction: column;
                height: 100%;
            }

            .editField {
                width: 100%;
                margin-left: 16px;
                margin-right: 8px;
            }
        `;
    }

    // allow-exoplayer

    render() {
        return html`
            <audio id="remoteAudio" style="display:none"></audio>
            <ha-card>
                deneme
            </ha-card>
            `
    }

    firstUpdated() {
        this.connect();
    }

    setConfig(config: { server: any; port: any; extensions: any; }): void {
        if (!config.server) {
            throw new Error("You need to define a server!");
        }
        if (!config.port) {
            throw new Error("You need to define a port!");
        }
        this.config = config;
    }

    static getStubConfig() {
        return {
            server: "sirca.me",
            port: "8089",
            extension: "100",
            secret: "XXXXX",
            iceTimeout: 5
        };
    }

    getCardSize() {
        return 1;
    }

    async _answer() {
        this.sipPhoneSession?.answer();
    }

    async _hangup() {
        this.sipPhoneSession?.terminate();
    }


    endCall() {
        this.sipPhoneSession = null;
        this.sipPhone?.stop();
        this.socket?.disconnect()
    }

    navigateToHome() {
        history.replaceState(null, "", "/ui-lovelace-minimalist/0");
        const event = new Event("location-changed", {
          bubbles: true,
          composed: true,
        });
        (<any>event).detail = { replace: true };
        dispatchEvent(event);
    }

    async connect() {
        this.requestUpdate();

        console.log("Connecting to wss://" + this.config.server + ":" + this.config.port + this.config.prefix + "/ws");
        this.socket = new WebSocketInterface("wss://" + this.config.server + ":" + this.config.port + this.config.prefix + "/ws");
        var configuration = {
            sockets : [ this.socket ],
            uri     : "sip:" + this.config.extension + "@" + this.config.server,
            authorization_user: this.config.extension,
            password: this.config.secret,
            register: true
        };

        this.sipPhone = new UA(configuration);

        this.sipCallOptions = {
            mediaConstraints: { audio: true, video: false },
            rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
            pcConfig: this.config.iceConfig 
        };

        console.log('ICE config: ' + JSON.stringify(this.sipCallOptions.pcConfig, null, 2));

        this.sipPhone?.start();

        this.sipPhone?.on("registered", () => {
            console.log('SIP-Card Registered with SIP Server');
            this.connected = true;
            super.requestUpdate();
            // this.renderRoot.querySelector('.extension').style.color = 'gray';
        });
        this.sipPhone?.on("unregistered", () => {
            console.log('SIP-Card Unregistered with SIP Server');
            this.connected = false;
            super.requestUpdate();
            // this.renderRoot.querySelector('.extension').style.color = 'var(--mdc-theme-primary, #03a9f4)';
        });
        this.sipPhone?.on("registrationFailed", () => {
            console.log('SIP-Card Failed Registeration with SIP Server');
            this.connected = false;
            super.requestUpdate();
            // this.renderRoot.querySelector('.extension').style.color = 'var(--mdc-theme-error, #db4437)';
        });
        this.sipPhone?.on("newRTCSession", (event: RTCSessionEvent) => {
            if (this.sipPhoneSession !== null ) {
                event.session.terminate();
                return;
            }

            console.log('Call: newRTCSession: Originator: ' + event.originator);

            this.sipPhoneSession = event.session;

            this.sipPhoneSession.on('getusermediafailed', function(DOMError) {
                console.log('getUserMedia() failed: ' + DOMError);
            });

            this.sipPhoneSession.on('peerconnection:createofferfailed', function(DOMError) {
                console.log('createOffer() failed: ' + DOMError);
            });

            this.sipPhoneSession.on('peerconnection:createanswerfailed', function (DOMError) {
                console.log('createAnswer() failed: ' + DOMError);
            });

            this.sipPhoneSession.on('peerconnection:setlocaldescriptionfailed', function (DOMError) {
                console.log('setLocalDescription() failed: ' + DOMError);
            });

            this.sipPhoneSession.on('peerconnection:setremotedescriptionfailed', function (DOMError) {
                console.log('setRemoteDescription() failed: ' + DOMError);
            });

            this.sipPhoneSession.on("confirmed", (event: IncomingEvent | OutgoingEvent) => {
                console.log('Call confirmed. Originator: ' + event.originator);
            });

            this.sipPhoneSession.on("failed", (event: EndEvent) =>{
                console.log('Call failed. Originator: ' + event.originator);
                this.endCall();
            });

            this.sipPhoneSession.on("ended", (event: EndEvent) => {
                console.log('Call ended. Originator: ' + event.originator);
                this.endCall();
            });

            this.sipPhoneSession.on("accepted", (event: IncomingEvent | OutgoingEvent) => {
                console.log('Call accepted. Originator: ' + event.originator);
            });

            var iceCandidateTimeout: NodeJS.Timeout | null = null;
            var iceTimeout = 5;
            if (this.config.iceTimeout !== null && this.config.iceTimeout !== undefined)
            {
                iceTimeout = this.config.iceTimeout;
            }

            console.log('ICE gathering timeout: ' + iceTimeout + " seconds");

            this.sipPhoneSession.on("icecandidate", (event: IceCandidateEvent) => {
                console.log('ICE: candidate: ' + event.candidate.candidate);

                if (iceCandidateTimeout != null) {
                    clearTimeout(iceCandidateTimeout);
                }

                iceCandidateTimeout = setTimeout(() => {
                    console.log('ICE: stop candidate gathering due to application timeout.');
                    event.ready();
                }, iceTimeout * 1000);
            });

            let handleIceGatheringStateChangeEvent = (event: any): void => {
                let connection = event.target;

                console.log('ICE: gathering state changed: ' + connection.iceGatheringState);

                if (connection.iceGatheringState === 'complete') {
                    console.log('ICE: candidate gathering complete. Cancelling ICE application timeout timer...');
                    if (iceCandidateTimeout != null) {
                        clearTimeout(iceCandidateTimeout);
                    }
                }
            };

            let handleRemoteTrackEvent = async (event: RTCTrackEvent): Promise<void> => {
                console.log('Call: peerconnection: mediatrack event: kind: ' + event.track.kind);

                let stream: MediaStream | null = null;
                if (event.streams) {
                    console.log('Call: peerconnection: mediatrack event: number of associated streams: ' + event.streams.length + ' - using first stream');
                    stream = event.streams[0];
                }
                else {
                    console.log('Call: peerconnection: mediatrack event: no associated stream. Creating stream...');
                    if (!stream) {
                        stream = new MediaStream();
                    }
                    stream.addTrack(event.track);
                }

                let remoteAudio = this.renderRoot.querySelector("#remoteAudio");
                if (event.track.kind === 'audio' && remoteAudio.srcObject != stream) {
                    remoteAudio.srcObject = stream;
                    try {
                        await remoteAudio.play();
                    }
                    catch (err) {
                        console.log('Error starting audio playback: ' + err);
                    }
                }

            }

            if (this.sipPhoneSession.direction === 'incoming') {

                this.sipPhoneSession.on("peerconnection", (event: PeerConnectionEvent) => {
                    console.log('Call: peerconnection(incoming)');

                    event.peerconnection.addEventListener("track", handleRemoteTrackEvent);
                    event.peerconnection.addEventListener("icegatheringstatechange", handleIceGatheringStateChangeEvent);
                });

                this.sipPhoneSession.answer(this.sipCallOptions);
            }
            else if (this.sipPhoneSession.direction === 'outgoing') {
                this.sipPhoneSession.on("peerconnection", (event: PeerConnectionEvent) => {
                    console.log('Call: peerconnection(outgoing)');
                });

                this.sipPhoneSession.connection.addEventListener("track", handleRemoteTrackEvent);
                this.sipPhoneSession.connection.addEventListener("icegatheringstatechange", handleIceGatheringStateChangeEvent);
            }
            else {
                console.log('Call: direction was neither incoming or outgoing!');
            }
        });

    }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: "sipjs-card",
    name: "SIP Card",
    preview: false,
    description: "A SIP card, made by Jordy Kuhne."
});
