import admin from "firebase-admin";

function formatPrivateKey(key: string) {
	// only needed if key contains literal \n in env
	return key.replace(/\\n/g, "\n");
}

function initFirebaseAdmin() {
	if (admin.apps.length > 0) return; // already initialized

	const projectId = process.env.FIREBASE_PROJECT_ID!;
	const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
	const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY!);

	admin.initializeApp({
		credential: admin.credential.cert({
			projectId,
			clientEmail,
			privateKey,
		}),
		projectId,
	});
}

initFirebaseAdmin();

export const adminAuth = admin.auth();
export const adminDB = admin.firestore();
export const adminMessaging = admin.messaging();
