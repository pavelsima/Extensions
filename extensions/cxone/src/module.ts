import { createExtension } from "@cognigy/extension-tools";
import { handoverToCXone } from './nodes/handover';
import { sendSignalToCXone } from './nodes/send-signal';
import { cxoneAuthenticatedCall } from './nodes/authenticated-call';
import { cxOneApiKeyData } from './connections/cxoneConnection';

export default createExtension({
	nodes: [
		handoverToCXone,
		sendSignalToCXone,
		cxoneAuthenticatedCall
	],
	connections: [
		cxOneApiKeyData
	],
	options: {
		label: "CXone"
	}
});