import { UA, WebSocketInterface } from "jssip/lib/JsSIP";
import { RTCSessionEvent } from "jssip/lib/UA";
import { EndEvent, PeerConnectionEvent, IncomingEvent, OutgoingEvent, IceCandidateEvent, RTCSession } from "jssip/lib/RTCSession";

import {
  LitElement,
  html,
  css
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
    callStatus: string = "Bağlanıyor";
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
        .container {
            padding: 0 12px 12px 12px;
            width: auto;
          }
          .button {
            display: block;
            width: 100%;
            height: 40px;
            border-radius: 6px;
            border: none;
            background-color: #eeeeee;
            cursor: pointer;
            transition: background-color 180ms ease-in-out;
          }
          .button:hover {
            background-color: #dddddd;
          }
          .button:focus {
            background-color: #cdcdcd;
          }
          .status{
            text-align:center;
            padding: 10px
          }
        `;
    }

    // allow-exoplayer

    render() {
        return html`
            <audio id="remoteAudio" style="display:none"></audio>
            <ha-card>
            <div class="container">
                <div class="status">${this.callStatus}</div>
                <button class="button" @click=${this.endCall}>
                    Aramayı Sonlandır
                </button>
            </div>
            </ha-card>
            `
    }

    disconnectedCallback(){
        super.disconnectedCallback();
        this.endCall()
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
        this.callStatus = "Görüşme Sonlandı"
        try{
            this.sipPhoneSession?.terminate();
        }
        catch(e){

        }
        
        this.sipPhone?.unregister();
        this.sipPhone?.stop()
        this.socket?.disconnect()
        this.navigateToHome()
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
            this.callStatus = "Beklemede"
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
                this.callStatus = "Arama Aktif"
            });

            var iceCandidateTimeout: NodeJS.Timeout | null = null;
            var iceTimeout = 1;
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
                this.callStatus = "Arama Aktif"
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
